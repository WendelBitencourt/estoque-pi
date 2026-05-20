import {
  collection,
  doc,
  addDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  updateDoc,
  increment,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { Lote } from './tipos';
import { calcularRisco, diasParaVencer, gerarCodigoLote } from './risco';
import { classificarRiscoML } from './mlService';

const COL = 'lotes';

function tsToISO(ts: Timestamp): string {
  return ts.toDate().toISOString().split('T')[0];
}

function docToLote(d: DocumentSnapshot): Lote {
  const data = d.data()!;
  return {
    id: d.id,
    produtoId: data.produtoId,
    codigo: data.codigo,
    quantidade: data.quantidade,
    validade: tsToISO(data.validade),
    risco: data.risco,
    dataCadastro: tsToISO(data.dataEntrada),
  };
}

/** Lotes de um produto específico com quantidade > 0, do mais antigo ao mais novo. */
export function subscribeLotesByProduto(
  produtoId: string,
  callback: (lotes: Lote[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, COL),
    where('produtoId', '==', produtoId),
    orderBy('validade')
  );
  return onSnapshot(
    q,
    (snap) => {
      const lotes = snap.docs.map(docToLote).filter((l) => l.quantidade > 0);
      callback(lotes);
    },
    onError
  );
}

/** Todos os lotes sem filtro de quantidade — usado no histórico. */
export function subscribeAllLotesRaw(
  callback: (lotes: Lote[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, COL), orderBy('validade'));
  return onSnapshot(q, (snap) => callback(snap.docs.map(docToLote)), onError);
}

/** Todos os lotes com quantidade > 0 — usado nas telas de estoque e início. */
export function subscribeAllLotes(
  callback: (lotes: Lote[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, COL), orderBy('validade'));
  return onSnapshot(
    q,
    (snap) => {
      const lotes = snap.docs.map(docToLote).filter((l) => l.quantidade > 0);
      callback(lotes);
    },
    onError
  );
}

export async function getLoteById(loteId: string): Promise<Lote | null> {
  const snap = await getDoc(doc(db, COL, loteId));
  if (!snap.exists()) return null;
  return docToLote(snap);
}

export async function criarLote(dados: {
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  validade: string; // "DD/MM/YYYY" vindo do formulário
  mediaConsumoDias: number;
}): Promise<string> {
  const [d, m, y] = dados.validade.split('/');
  const validadeISO = `${y}-${m}-${d}`;
  const dias = diasParaVencer(validadeISO);
  let risco = calcularRisco(validadeISO);
  try {
    risco = await classificarRiscoML(dias, dados.mediaConsumoDias, dados.quantidade);
  } catch {
    // ML offline — mantém classificação por regra
  }
  const validadeDate = new Date(`${validadeISO}T12:00:00`);

  const ref = await addDoc(collection(db, COL), {
    produtoId: dados.produtoId,
    codigo: gerarCodigoLote(dados.nomeProduto),
    quantidade: dados.quantidade,
    validade: Timestamp.fromDate(validadeDate),
    risco,
    dataEntrada: Timestamp.now(),
  });

  return ref.id;
}

/** Usa increment() atômico do Firestore — seguro em operações concorrentes. */
export async function ajustarQuantidadeLote(
  loteId: string,
  delta: number // negativo para saída/descarte
): Promise<void> {
  await updateDoc(doc(db, COL, loteId), {
    quantidade: increment(delta),
  });
}
