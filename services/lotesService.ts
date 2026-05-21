import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  updateDoc,
  increment,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import { db } from './firebase';
import { Lote, NivelRisco } from './tipos';
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
    risco: (data.risco as NivelRisco) ?? null, // null = classificação offline pendente
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
  const validadeDate = new Date(`${validadeISO}T12:00:00`);

  // Verifica conectividade antes de chamar o ML
  const netState = await NetInfo.fetch();
  const temInternet = !!(netState.isConnected && netState.isInternetReachable);

  let risco: NivelRisco | null = null;

  if (temInternet) {
    try {
      risco = await classificarRiscoML(dias, dados.mediaConsumoDias, dados.quantidade);
    } catch {
      // Internet disponível mas ML falhou (ex: Space hibernando) — usa regra como fallback
      risco = calcularRisco(validadeISO);
    }
  }
  // Sem internet: risco fica null — será preenchido pelo ReclassificadorOffline
  // quando a conexão for restaurada

  const ref = await addDoc(collection(db, COL), {
    produtoId: dados.produtoId,
    codigo: gerarCodigoLote(dados.nomeProduto),
    quantidade: dados.quantidade,
    validade: Timestamp.fromDate(validadeDate),
    risco,          // null se offline
    dataEntrada: Timestamp.now(),
  });

  return ref.id;
}

/** Retorna todos os lotes que ainda não têm classificação de risco (criados offline). */
export async function getLotesSemRisco(): Promise<Lote[]> {
  const q = query(collection(db, COL), where('risco', '==', null));
  const snap = await getDocs(q);
  return snap.docs.map(docToLote);
}

/** Atualiza o campo risco de um lote já salvo no Firestore. */
export async function atualizarRiscoLote(loteId: string, risco: NivelRisco): Promise<void> {
  await updateDoc(doc(db, COL, loteId), { risco });
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
