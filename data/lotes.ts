export type NivelRisco = 'seguro' | 'atencao' | 'risco_alto';

export interface Lote {
  id: string;
  produtoId: string;
  codigo: string;
  quantidade: number;
  validade: string; // ISO date string
  risco: NivelRisco;
  dataCadastro: string; // ISO date string
}

// Today = 2026-05-16
export const LOTES: Lote[] = [
  // Leite Integral — risco alto (vence em 3 dias)
  { id: 'l1', produtoId: 'p1', codigo: 'LT2026A', quantidade: 12, validade: '2026-05-19', risco: 'risco_alto', dataCadastro: '2026-04-10' },
  // Leite — seguro (vence em 45 dias)
  { id: 'l2', produtoId: 'p1', codigo: 'LT2026B', quantidade: 24, validade: '2026-07-01', risco: 'seguro', dataCadastro: '2026-05-01' },

  // Arroz — seguro
  { id: 'l3', produtoId: 'p2', codigo: 'AR2025A', quantidade: 30, validade: '2027-03-15', risco: 'seguro', dataCadastro: '2025-12-20' },

  // Macarrão — atenção (vence em 18 dias)
  { id: 'l4', produtoId: 'p3', codigo: 'MC2026A', quantidade: 8, validade: '2026-06-03', risco: 'atencao', dataCadastro: '2026-02-14' },
  // Macarrão — seguro
  { id: 'l5', produtoId: 'p3', codigo: 'MC2026B', quantidade: 15, validade: '2027-01-20', risco: 'seguro', dataCadastro: '2026-05-10' },

  // Feijão — seguro
  { id: 'l6', produtoId: 'p4', codigo: 'FJ2025A', quantidade: 20, validade: '2026-10-10', risco: 'seguro', dataCadastro: '2025-11-05' },

  // Fralda — atenção (vence em 22 dias)
  { id: 'l7', produtoId: 'p5', codigo: 'FR2026A', quantidade: 5, validade: '2026-06-07', risco: 'atencao', dataCadastro: '2026-01-18' },
  // Fralda — seguro
  { id: 'l8', produtoId: 'p5', codigo: 'FR2026B', quantidade: 10, validade: '2027-02-28', risco: 'seguro', dataCadastro: '2026-04-22' },

  // Sabonete — risco alto (vence em 5 dias)
  { id: 'l9', produtoId: 'p6', codigo: 'SB2026A', quantidade: 6, validade: '2026-05-21', risco: 'risco_alto', dataCadastro: '2025-09-10' },

  // Papel Higiênico — seguro
  { id: 'l10', produtoId: 'p7', codigo: 'PH2026A', quantidade: 18, validade: '2028-01-01', risco: 'seguro', dataCadastro: '2026-03-08' },

  // Detergente — seguro
  { id: 'l11', produtoId: 'p8', codigo: 'DT2026A', quantidade: 9, validade: '2027-06-30', risco: 'seguro', dataCadastro: '2026-04-01' },

  // Azeite — risco alto (vence em 2 dias)
  { id: 'l12', produtoId: 'p9', codigo: 'AZ2024A', quantidade: 3, validade: '2026-05-18', risco: 'risco_alto', dataCadastro: '2024-11-20' },

  // Shampoo Infantil — seguro
  { id: 'l13', produtoId: 'p10', codigo: 'SH2026A', quantidade: 7, validade: '2027-09-15', risco: 'seguro', dataCadastro: '2026-02-28' },
];

export function getLotesByProduto(produtoId: string): Lote[] {
  return LOTES.filter((l) => l.produtoId === produtoId).sort(
    (a, b) => new Date(a.validade).getTime() - new Date(b.validade).getTime()
  );
}

export function getEstoqueTotal(produtoId: string): number {
  return getLotesByProduto(produtoId).reduce((sum, l) => sum + l.quantidade, 0);
}

export function getRiscoProduto(produtoId: string): NivelRisco {
  const lotes = getLotesByProduto(produtoId);
  if (lotes.some((l) => l.risco === 'risco_alto')) return 'risco_alto';
  if (lotes.some((l) => l.risco === 'atencao')) return 'atencao';
  return 'seguro';
}

export function diasParaVencer(validade: string): number {
  const hoje = new Date('2026-05-16');
  const val = new Date(validade);
  return Math.ceil((val.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}
