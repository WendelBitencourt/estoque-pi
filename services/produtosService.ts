import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { Produto } from './tipos';

const COL = 'produtos';

function docToProduto(d: DocumentSnapshot): Produto {
  const data = d.data()!;
  return {
    id: d.id,
    nome: data.nome,
    categoria: data.categoria,
    emoji: data.emoji ?? '📦',
    ean: data.ean ?? undefined,
    fotoUrl: data.fotoUrl ?? undefined,
    conteudo: data.conteudo ?? undefined,
    mediaConsumoDias: data.mediaConsumoDias ?? 7,
  };
}

/** Assinatura em tempo real de todos os produtos, ordenados por nome. */
export function subscribeToProdutos(
  callback: (produtos: Produto[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, COL), orderBy('nome'));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(docToProduto)),
    onError
  );
}

export async function getProdutoById(id: string): Promise<Produto | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return docToProduto(snap);
}

/** Busca por prefixo do nome (case-sensitive). */
export async function buscarProdutosPorNome(prefixo: string): Promise<Produto[]> {
  if (!prefixo.trim()) return [];
  const fim = prefixo + '';
  const q = query(
    collection(db, COL),
    where('nome', '>=', prefixo),
    where('nome', '<=', fim),
    limit(8)
  );
  const snap = await getDocs(q);
  return snap.docs.map(docToProduto);
}

export async function criarProduto(
  dados: Omit<Produto, 'id' | 'mediaConsumoDias'> & { mediaConsumoDias?: number }
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    nome: dados.nome,
    categoria: dados.categoria,
    emoji: dados.emoji,
    ean: dados.ean ?? null,
    fotoUrl: dados.fotoUrl ?? null,
    conteudo: dados.conteudo ?? null,
    mediaConsumoDias: dados.mediaConsumoDias ?? 7,
    criadoEm: Timestamp.now(),
  });
  return ref.id;
}

/** Retorna o produto cujo campo ean bate exatamente — null se não existir. */
export async function getProdutoPorEan(ean: string): Promise<Produto | null> {
  const q = query(collection(db, COL), where('ean', '==', ean), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return docToProduto(snap.docs[0]);
}
