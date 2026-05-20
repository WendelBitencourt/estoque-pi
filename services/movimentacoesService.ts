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
    where('tipo', 'in', ['saida', 'descarte']),
    orderBy('data', 'asc')
  );
  const snapSaidas = await getDocs(qSaidas);
  if (snapSaidas.size < 2) return null;

  const saidas = snapSaidas.docs.map((d) => ({
    data: (d.data().data as Timestamp).toDate(),
    quantidade: d.data().quantidade as number,
  }));

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
