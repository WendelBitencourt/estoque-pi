import {
  collection,
  addDoc,
  onSnapshot,
  query,
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
