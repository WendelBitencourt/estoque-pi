import { NivelRisco } from './tipos';
import { MAPA, MLClasse } from './mlService';
import arvore from './arvore_decisao.json';

const RISCO_ALTO_DIAS = 7;
const ATENCAO_DIAS = 30;

// ── Classificação de risco via Árvore de Decisão (avaliada localmente) ───────
//
// Percorre a árvore exportada por ml/treinar_modelo.py (services/arvore_decisao.json)
// sem chamar o Hugging Face Space: mesmos limiares aprendidos, só que on-demand e
// offline. Substitui classificarRiscoML para o risco refletir SEMPRE os valores
// vivos (dias caem a cada dia, média/quantidade mudam com as saídas).
//
// Regra de cada nó (igual ao scikit-learn): X[feature] <= limite → "esq", senão "dir".

type NoInterno = { feature: number; limite: number; esq: number; dir: number };
type NoFolha = { classe: MLClasse };

const NOS = arvore.nos as Array<NoInterno | NoFolha>;

export function classificarRiscoLocal(
  diasAteVencer: number,
  mediaConsumoDias: number,
  quantidade: number
): NivelRisco {
  // Mesmos clamps que classificarRiscoML usava ao montar o payload do Space,
  // para o modelo receber as features no domínio em que foi treinado.
  const features = [
    Math.max(0, diasAteVencer),
    Math.max(1, mediaConsumoDias),
    Math.max(1, quantidade),
  ];

  let i = 0;
  let no = NOS[i];
  while (!('classe' in no)) {
    i = features[no.feature] <= no.limite ? no.esq : no.dir;
    no = NOS[i];
  }
  return MAPA[no.classe] ?? 'seguro';
}

/**
 * Devolve os lotes com o campo `risco` recalculado AO VIVO a partir das features
 * atuais (dias até vencer, média de consumo do produto, quantidade do lote).
 *
 * Use dentro de um useMemo keyed em [lotes, mediaConsumoDias] no ponto de exibição,
 * substituindo o `lote.risco` congelado que vem do Firestore. Por ser local, nunca
 * retorna null (o estado "Calculando…" deixa de existir).
 */
export function aplicarRisco<T extends { validade: string; quantidade: number }>(
  lotes: T[],
  mediaConsumoDias: number
): Array<T & { risco: NivelRisco }> {
  return lotes.map((lote) => ({
    ...lote,
    risco: classificarRiscoLocal(diasParaVencer(lote.validade), mediaConsumoDias, lote.quantidade),
  }));
}

/**
 * Variante para telas com uma lista GLOBAL de lotes de vários produtos (home,
 * estoque, necessidades): resolve a média de consumo de cada lote pelo seu
 * produto antes de classificar. Produto sem média conhecida cai no clamp mínimo
 * (consumo lento), levando ao lado mais cauteloso da classificação.
 */
export function aplicarRiscoMulti<L extends { produtoId: string; validade: string; quantidade: number }>(
  lotes: L[],
  produtos: Array<{ id: string; mediaConsumoDias: number }>
): Array<L & { risco: NivelRisco }> {
  const mediaPorProduto = new Map(produtos.map((p) => [p.id, p.mediaConsumoDias]));
  return lotes.map((lote) => ({
    ...lote,
    risco: classificarRiscoLocal(
      diasParaVencer(lote.validade),
      mediaPorProduto.get(lote.produtoId) ?? 0,
      lote.quantidade
    ),
  }));
}

export function calcularRisco(validadeISO: string): NivelRisco {
  const dias = diasParaVencer(validadeISO);
  if (dias <= RISCO_ALTO_DIAS) return 'risco_alto';
  if (dias <= ATENCAO_DIAS) return 'atencao';
  return 'seguro';
}

export function diasParaVencer(validadeISO: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(validadeISO + 'T00:00:00');
  return Math.ceil((validade.getTime() - hoje.getTime()) / 86_400_000);
}

export function gerarCodigoLote(nomeProduto: string): string {
  const iniciais = nomeProduto
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 3)
    .padEnd(2, 'X');
  const ano = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 99 + 1)
    .toString()
    .padStart(2, '0');
  return `${iniciais}${ano}${rand}`;
}

export function getRiscoProduto(lotes: Array<{ risco: NivelRisco | null }>): NivelRisco {
  if (lotes.some((l) => l.risco === 'risco_alto')) return 'risco_alto';
  if (lotes.some((l) => l.risco === 'atencao')) return 'atencao';
  return 'seguro';
}
