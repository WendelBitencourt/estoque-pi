import {
  collection,
  addDoc,
  getDocs,
  query,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { PRODUTOS } from '../data/produtos';
import { LOTES } from '../data/lotes';
import { MOVIMENTACOES } from '../data/movimentacoes';

/**
 * Popula o Firestore com os dados de exemplo da Parte 1.
 * Só executa se a coleção `produtos` estiver vazia.
 */
export async function seedDadosIniciais(): Promise<void> {
  const snap = await getDocs(query(collection(db, 'produtos'), limit(1)));
  if (!snap.empty) return;

  const mockIdToFirestoreId: Record<string, string> = {};
  const loteIdMap: Record<string, string> = {};

  for (const p of PRODUTOS) {
    const ref = await addDoc(collection(db, 'produtos'), {
      nome: p.nome,
      categoria: p.categoria,
      emoji: p.emoji,
      ean: null,
      fotoUrl: null,
      mediaConsumoDias: 7,
      criadoEm: Timestamp.now(),
    });
    mockIdToFirestoreId[p.id] = ref.id;
  }

  for (const l of LOTES) {
    const prodId = mockIdToFirestoreId[l.produtoId];
    if (!prodId) continue;
    const ref = await addDoc(collection(db, 'lotes'), {
      produtoId: prodId,
      codigo: l.codigo,
      quantidade: l.quantidade,
      validade: Timestamp.fromDate(new Date(l.validade + 'T12:00:00')),
      risco: l.risco,
      dataEntrada: Timestamp.fromDate(new Date(l.dataCadastro + 'T12:00:00')),
    });
    loteIdMap[l.id] = ref.id;
  }

  for (const m of MOVIMENTACOES) {
    const prodId = mockIdToFirestoreId[m.produtoId];
    const loteId = loteIdMap[m.loteId];
    if (!prodId || !loteId) continue;
    await addDoc(collection(db, 'movimentacoes'), {
      tipo: m.tipo,
      produtoId: prodId,
      loteId,
      quantidade: m.quantidade,
      observacao: m.observacao ?? null,
      data: Timestamp.fromDate(new Date(m.data + 'T12:00:00')),
    });
  }
}
