import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Insere 8 meses de histórico fictício de entradas no Firestore para
 * permitir o teste do algoritmo K-Means na tela de Lista de Necessidades.
 *
 * Os dados são criados com três padrões distintos de doação (alto / baixo / médio)
 * para que o K-Means consiga formar clusters significativos.
 */
export async function seedDadosHistoricos(): Promise<{ mesesInseridos: number; entradas: number }> {
  // Busca todos os produtos e agrupa por categoria (usa o primeiro por categoria)
  const produtosSnap = await getDocs(collection(db, 'produtos'));
  if (produtosSnap.empty) throw new Error('Nenhum produto cadastrado. Cadastre produtos antes de gerar dados de teste.');

  const produtoPorCategoria: Record<string, string> = {};
  produtosSnap.docs.forEach((d) => {
    const cat = d.data().categoria as string;
    if (!produtoPorCategoria[cat]) produtoPorCategoria[cat] = d.id;
  });

  const categorias = Object.keys(produtoPorCategoria);
  if (categorias.length === 0) throw new Error('Nenhuma categoria encontrada nos produtos.');

  // 18 padrões mensais com 3 clusters distintos (17 meses atrás + mês atual):
  // A = doação alta · B = doação baixa · C = doação média
  // Sequência variada para que o K-Means forme clusters claros ao longo de 1 ano e meio
  const FATORES_MENSAIS = [
    3.2, 0.8, 3.5, 0.7, 1.8, 3.1, // meses 17–12 atrás
    0.9, 1.7, 3.3, 0.6, 2.0, 3.4, // meses 11–6 atrás
    0.8, 1.9, 3.0, 1.5, 0.7, 1.8, // meses 5–0 (último = mês atual)
  ];

  // Quantidade base por posição da categoria (simula que algumas recebem mais)
  const BASE_POR_CAT_IDX = [60, 25, 12, 10, 8];

  const agora = new Date();
  let totalEntradas = 0;

  for (let i = 0; i < FATORES_MENSAIS.length; i++) {
    // mesAtras: 8, 7, 6, 5, 4, 3, 2, 1, 0 (último = mês atual)
    const mesAtras = FATORES_MENSAIS.length - 1 - i;
    const data = new Date(agora.getFullYear(), agora.getMonth() - mesAtras, 15);
    const fator = FATORES_MENSAIS[i];

    for (let ci = 0; ci < categorias.length; ci++) {
      const categoria = categorias[ci];
      const produtoId = produtoPorCategoria[categoria];
      const base = BASE_POR_CAT_IDX[ci] ?? 10;
      const quantidade = Math.max(3, Math.round(base * fator));

      await addDoc(collection(db, 'movimentacoes'), {
        tipo: 'entrada',
        produtoId,
        loteId: 'seed_historico',
        quantidade,
        data: Timestamp.fromDate(data),
        criadoEm: Timestamp.fromDate(data),
      });

      totalEntradas++;
    }
  }

  return { mesesInseridos: FATORES_MENSAIS.length, entradas: totalEntradas };
}
