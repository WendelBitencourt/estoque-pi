import {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { Movimentacao, TipoMovimentacao } from './tipos';

const COL = 'movimentacoes';

function docToMovimentacao(d: DocumentSnapshot): Movimentacao {
  const data = d.data()!;
  return {
    id: d.id,
    tipo: data.tipo,
    produtoId: data.produtoId,
    loteId: data.loteId,
    quantidade: data.quantidade,
    data: (data.data as Timestamp).toDate().toISOString().split('T')[0],
    observacao: data.observacao ?? undefined,
  };
}

/** Histórico completo, do mais recente ao mais antigo. */
export function subscribeToMovimentacoes(
  callback: (movs: Movimentacao[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, COL), orderBy('data', 'desc'));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(docToMovimentacao)),
    onError
  );
}

/**
 * Calcula quantos dias o estoque desse produto costuma durar,
 * com base no histórico real de saídas e descartes.
 * Retorna null se não houver dados suficientes (< 2 saídas).
 */
export async function recalcularMediaConsumo(produtoId: string): Promise<number | null> {
  const qSaidas = query(
    collection(db, COL),
    where('produtoId', '==', produtoId),
    where('tipo', 'in', ['saida', 'descarte'])
  );
  const snapSaidas = await getDocs(qSaidas);
  if (snapSaidas.size < 2) return null;

  const saidas = snapSaidas.docs
    .map((d) => ({
      data: (d.data().data as Timestamp).toDate(),
      quantidade: d.data().quantidade as number,
    }))
    .sort((a, b) => a.data.getTime() - b.data.getTime());

  const primeira = saidas[0].data;
  const ultima = saidas[saidas.length - 1].data;
  const diasSpan = Math.max(1, (ultima.getTime() - primeira.getTime()) / 86_400_000);
  const totalConsumido = saidas.reduce((acc, m) => acc + m.quantidade, 0);
  const taxaDiaria = totalConsumido / diasSpan;

  // Usa média das entradas como referência de tamanho de lote
  const qEntradas = query(
    collection(db, COL),
    where('produtoId', '==', produtoId),
    where('tipo', '==', 'entrada')
  );
  const snapEntradas = await getDocs(qEntradas);
  let mediaEntrada = 20;
  if (!snapEntradas.empty) {
    const total = snapEntradas.docs.reduce((acc, d) => acc + (d.data().quantidade as number), 0);
    mediaEntrada = total / snapEntradas.size;
  }

  const media = Math.round(mediaEntrada / taxaDiaria);
  return Math.max(1, Math.min(365, media));
}

/**
 * Agrega todas as entradas do Firestore por (ano, mês, categoria).
 * Faz join com a coleção produtos para obter a categoria de cada produtoId.
 * Retorna o formato esperado pelo endpoint /agrupar-doacoes da API de ML.
 */
export async function getEntradasMensais(): Promise<
  { ano: number; mes: number; categoria: string; totalUnid: number }[]
> {
  // Busca todos os produtos para montar o mapa produtoId → categoria
  const produtosSnap = await getDocs(collection(db, 'produtos'));
  const categoriaPorId: Record<string, string> = {};
  produtosSnap.docs.forEach((d) => {
    categoriaPorId[d.id] = d.data().categoria as string;
  });

  const q = query(collection(db, COL), where('tipo', '==', 'entrada'));
  const snap = await getDocs(q);

  // Agrega por "ano-mes-categoria"
  const mapa: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    const categoria = categoriaPorId[data.produtoId as string];
    if (!categoria) return;
    const dt = (data.data as Timestamp).toDate();
    const key = `${dt.getFullYear()}|${dt.getMonth() + 1}|${categoria}`;
    mapa[key] = (mapa[key] ?? 0) + (data.quantidade as number);
  });

  return Object.entries(mapa).map(([key, totalUnid]) => {
    const [anoStr, mesStr, categoria] = key.split('|');
    return { ano: Number(anoStr), mes: Number(mesStr), categoria, totalUnid };
  });
}

export async function getSaidasProduto(
  produtoId: string
): Promise<{ data: string; quantidade: number }[]> {
  const q = query(
    collection(db, COL),
    where('produtoId', '==', produtoId),
    where('tipo', 'in', ['saida', 'descarte'])
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({
      data: (d.data().data as Timestamp).toDate().toISOString().split('T')[0],
      quantidade: d.data().quantidade as number,
    }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

export async function criarMovimentacao(dados: {
  tipo: TipoMovimentacao;
  produtoId: string;
  loteId: string;
  quantidade: number;
  observacao?: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    tipo: dados.tipo,
    produtoId: dados.produtoId,
    loteId: dados.loteId,
    quantidade: dados.quantidade,
    observacao: dados.observacao ?? null,
    data: Timestamp.now(),
  });
  return ref.id;
}
