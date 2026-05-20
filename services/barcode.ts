import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from './firebase';
import { Categoria } from './tipos';
import { COSMOS_TOKEN } from './config';

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface ResultadoBarcode {
  nome: string;
  fotoUrl: string | null;
  categoria: Categoria;
  ean: string;
  conteudo: string | null;
  /** De onde veio o resultado */
  fonte: 'cosmos' | 'openfoodfacts' | 'cache';
}

export type StatusBusca =
  | { status: 'encontrado'; dados: ResultadoBarcode }
  | { status: 'nao_encontrado' }
  | { status: 'limite_excedido' }   // Cosmos: plano gratuito esgotado no dia
  | { status: 'sem_internet' };

/** Emoji de fallback por categoria — usado quando a imagem não carrega. */
export const EMOJI_POR_CATEGORIA: Record<Categoria, string> = {
  alimentos: '🍎',
  higiene:   '🧴',
  limpeza:   '🧹',
};

// ── Mapeamento de categorias das APIs → Categoria do app ──────────────────────

const MAPA_CATEGORIAS: { regex: RegExp; categoria: Categoria }[] = [
  { regex: /higiene|sabonete|shampoo|condicion|dental|desodoran|absorv|fralda|beb[eê]|infantil/i, categoria: 'higiene' },
  { regex: /limpeza|deterg|desinfet|alvejante|multiuso|amaciante|sabão|sabao/i, categoria: 'limpeza' },
];

function mapearCategoria(tags: string[]): Categoria {
  const texto = tags.join(' ').toLowerCase();
  for (const { regex, categoria } of MAPA_CATEGORIAS) {
    if (regex.test(texto)) return categoria;
  }
  return 'alimentos';
}

// ── Extração de conteúdo por embalagem ───────────────────────────────────────

function extrairConteudo(quantity: unknown, nome: string): string | null {
  // Prioridade 1: campo quantity da API
  if (quantity) {
    const q = String(quantity).trim();
    if (q) return q;
  }
  // Prioridade 2: extrair do nome (ex: "MIOJO FRANGO 85G" → "85g")
  const match = nome.match(/(\d+(?:[.,]\d+)?)\s*(ml|l\b|kg|g\b)/i);
  if (match) {
    const num = match[1];
    const un  = match[2].toLowerCase()
      .replace(/^l$/,  'L')
      .replace(/^ml$/, 'mL');
    return `${num}${un}`;
  }
  return null;
}

// ── Detecção de erro de rede ──────────────────────────────────────────────────

function eSemInternet(err: unknown): boolean {
  if (!(err instanceof TypeError)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('network error')
  );
}

// ── 1. Cache Firestore ────────────────────────────────────────────────────────

async function buscarNoCacheFirestore(ean: string): Promise<ResultadoBarcode | null> {
  const q = query(collection(db, 'produtos'), where('ean', '==', ean), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();
  return {
    nome:      data.nome,
    fotoUrl:   data.fotoUrl ?? null,
    categoria: data.categoria,
    ean,
    conteudo:  data.conteudo ?? null,
    fonte:     'cache',
  };
}

// ── 2. Cosmos API (produtos brasileiros) ─────────────────────────────────────

async function consultarCosmos(ean: string): Promise<StatusBusca> {
  if (!COSMOS_TOKEN) return { status: 'nao_encontrado' };

  let resp: Response;
  try {
    resp = await fetch(`https://api.cosmos.bluesoft.com.br/gtins/${ean}`, {
      headers: {
        'X-Cosmos-Token': COSMOS_TOKEN,
        'User-Agent': 'Cosmos-API-Request',
      },
    });
  } catch (err) {
    return eSemInternet(err) ? { status: 'sem_internet' } : { status: 'nao_encontrado' };
  }

  if (resp.status === 429) return { status: 'limite_excedido' };
  if (!resp.ok)            return { status: 'nao_encontrado' };

  const data = await resp.json();
  const nome = (data.description || data.comercial_description || '').trim();
  if (!nome) return { status: 'nao_encontrado' };

  return {
    status: 'encontrado',
    dados: {
      nome,
      fotoUrl:   data.thumbnail || data.avatar || null,
      categoria: mapearCategoria(data.category_tags ?? []),
      ean,
      conteudo:  extrairConteudo(data.quantity, nome),
      fonte:     'cosmos',
    },
  };
}

// ── 3. Open Food Facts (fallback global, gratuito) ───────────────────────────

async function consultarOpenFoodFacts(ean: string): Promise<StatusBusca> {
  let resp: Response;
  try {
    resp = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${ean}.json`
    );
  } catch (err) {
    return eSemInternet(err) ? { status: 'sem_internet' } : { status: 'nao_encontrado' };
  }

  if (!resp.ok) return { status: 'nao_encontrado' };

  const data = await resp.json();
  if (data.status !== 1 || !data.product) return { status: 'nao_encontrado' };

  const p    = data.product;
  const nome = (p.product_name_pt || p.product_name || '').trim();
  if (!nome) return { status: 'nao_encontrado' };

  const categoriaTags: string[] = [
    ...(Array.isArray(p.categories_tags) ? p.categories_tags : []),
    p.categories ?? '',
  ];

  return {
    status: 'encontrado',
    dados: {
      nome,
      fotoUrl:   p.image_url || null,
      categoria: mapearCategoria(categoriaTags),
      ean,
      conteudo:  extrairConteudo(p.quantity, nome),
      fonte:     'openfoodfacts',
    },
  };
}

// ── Função principal ──────────────────────────────────────────────────────────

/**
 * Busca um produto pelo código EAN/GTIN.
 *
 * Ordem de consulta:
 *   1. Cache Firestore  — gratuito, funciona offline
 *   2. Cosmos API       — produtos brasileiros (requer token em .env.local)
 *   3. Open Food Facts  — fallback global gratuito
 *
 * Nunca lança exceção. Sempre retorna um StatusBusca.
 */
export async function buscarPorEan(ean: string): Promise<StatusBusca> {
  // 1. Cache do Firestore
  try {
    const cached = await buscarNoCacheFirestore(ean);
    if (cached) return { status: 'encontrado', dados: cached };
  } catch {
    // Offline ou sem permissão — continua para APIs externas
  }

  // 2. Cosmos
  const cosmos = await consultarCosmos(ean);
  if (cosmos.status === 'encontrado')   return cosmos;
  if (cosmos.status === 'sem_internet') return cosmos;
  // nao_encontrado ou limite_excedido → tenta o fallback
  const cosmosStatus = cosmos.status;

  // 3. Open Food Facts
  const off = await consultarOpenFoodFacts(ean);

  // Se OFF também não achou E Cosmos estava com limite excedido → informa o limite
  // (mais útil para a usuária do que "produto não encontrado")
  if (off.status === 'nao_encontrado' && cosmosStatus === 'limite_excedido') {
    return { status: 'limite_excedido' };
  }

  return off;
}
