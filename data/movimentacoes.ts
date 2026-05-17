export type TipoMovimentacao = 'entrada' | 'saida' | 'descarte';

export interface Movimentacao {
  id: string;
  tipo: TipoMovimentacao;
  produtoId: string;
  loteId: string;
  quantidade: number;
  data: string; // ISO date string
  observacao?: string;
}

export const MOVIMENTACOES: Movimentacao[] = [
  // Maio 2026
  { id: 'm1', tipo: 'entrada', produtoId: 'p5', loteId: 'l8', quantidade: 10, data: '2026-05-10', observacao: 'Doação família Silva' },
  { id: 'm2', tipo: 'saida', produtoId: 'p2', loteId: 'l3', quantidade: 5, data: '2026-05-12' },
  { id: 'm3', tipo: 'entrada', produtoId: 'p3', loteId: 'l5', quantidade: 15, data: '2026-05-10', observacao: 'Campanha do agasalho' },
  { id: 'm4', tipo: 'saida', produtoId: 'p1', loteId: 'l1', quantidade: 6, data: '2026-05-15' },
  { id: 'm5', tipo: 'descarte', produtoId: 'p9', loteId: 'l12', quantidade: 1, data: '2026-05-14', observacao: 'Embalagem amassada' },

  // Abril 2026
  { id: 'm6', tipo: 'entrada', produtoId: 'p1', loteId: 'l2', quantidade: 24, data: '2026-04-30', observacao: 'Doação supermercado BH' },
  { id: 'm7', tipo: 'entrada', produtoId: 'p6', loteId: 'l9', quantidade: 6, data: '2026-04-20' },
  { id: 'm8', tipo: 'saida', produtoId: 'p7', loteId: 'l10', quantidade: 3, data: '2026-04-18' },
  { id: 'm9', tipo: 'saida', produtoId: 'p4', loteId: 'l6', quantidade: 4, data: '2026-04-10' },
  { id: 'm10', tipo: 'descarte', produtoId: 'p3', loteId: 'l4', quantidade: 2, data: '2026-04-05', observacao: 'Prazo vencendo, descartado' },
  { id: 'm11', tipo: 'entrada', produtoId: 'p10', loteId: 'l13', quantidade: 7, data: '2026-04-22', observacao: 'Doação farmácia central' },

  // Março 2026
  { id: 'm12', tipo: 'entrada', produtoId: 'p7', loteId: 'l10', quantidade: 18, data: '2026-03-08', observacao: 'Campanha solidária' },
  { id: 'm13', tipo: 'saida', produtoId: 'p1', loteId: 'l1', quantidade: 12, data: '2026-03-20' },
  { id: 'm14', tipo: 'entrada', produtoId: 'p8', loteId: 'l11', quantidade: 9, data: '2026-03-15' },
  { id: 'm15', tipo: 'saida', produtoId: 'p6', loteId: 'l9', quantidade: 3, data: '2026-03-25' },
  { id: 'm16', tipo: 'descarte', produtoId: 'p9', loteId: 'l12', quantidade: 2, data: '2026-03-30', observacao: 'Produto vencido' },

  // Fevereiro 2026
  { id: 'm17', tipo: 'entrada', produtoId: 'p5', loteId: 'l7', quantidade: 5, data: '2026-02-18', observacao: 'Doação anônima' },
  { id: 'm18', tipo: 'entrada', produtoId: 'p10', loteId: 'l13', quantidade: 3, data: '2026-02-28' },
  { id: 'm19', tipo: 'saida', produtoId: 'p2', loteId: 'l3', quantidade: 8, data: '2026-02-10' },
  { id: 'm20', tipo: 'saida', produtoId: 'p4', loteId: 'l6', quantidade: 5, data: '2026-02-22' },
];

export function getMovimentacoesPorMes(): Record<string, Movimentacao[]> {
  const grouped: Record<string, Movimentacao[]> = {};
  for (const mov of MOVIMENTACOES) {
    const [year, month] = mov.data.split('-');
    const key = `${year}-${month}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(mov);
  }
  return grouped;
}

export function getTotaisMes(mes: string) {
  const all = MOVIMENTACOES.filter((m) => m.data.startsWith(mes));
  return {
    entradas: all.filter((m) => m.tipo === 'entrada').reduce((s, m) => s + m.quantidade, 0),
    saidas: all.filter((m) => m.tipo === 'saida').reduce((s, m) => s + m.quantidade, 0),
    descartes: all.filter((m) => m.tipo === 'descarte').reduce((s, m) => s + m.quantidade, 0),
  };
}
