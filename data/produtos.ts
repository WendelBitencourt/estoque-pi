export type Categoria = 'alimentos' | 'higiene' | 'bebe' | 'limpeza' | 'vestuario';

export interface Produto {
  id: string;
  nome: string;
  categoria: Categoria;
  unidade: string;
  emoji: string;
}

export const PRODUTOS: Produto[] = [
  { id: 'p1', nome: 'Leite Integral', categoria: 'alimentos', unidade: 'L', emoji: '🥛' },
  { id: 'p2', nome: 'Arroz', categoria: 'alimentos', unidade: 'kg', emoji: '🍚' },
  { id: 'p3', nome: 'Macarrão', categoria: 'alimentos', unidade: 'kg', emoji: '🍝' },
  { id: 'p4', nome: 'Feijão', categoria: 'alimentos', unidade: 'kg', emoji: '🫘' },
  { id: 'p5', nome: 'Fralda Descartável', categoria: 'bebe', unidade: 'pct', emoji: '👶' },
  { id: 'p6', nome: 'Sabonete', categoria: 'higiene', unidade: 'un', emoji: '🧴' },
  { id: 'p7', nome: 'Papel Higiênico', categoria: 'higiene', unidade: 'pct', emoji: '🧻' },
  { id: 'p8', nome: 'Detergente', categoria: 'limpeza', unidade: 'un', emoji: '🫧' },
  { id: 'p9', nome: 'Azeite', categoria: 'alimentos', unidade: 'L', emoji: '🫙' },
  { id: 'p10', nome: 'Shampoo Infantil', categoria: 'bebe', unidade: 'un', emoji: '🧒' },
];

export function getProdutoById(id: string): Produto | undefined {
  return PRODUTOS.find((p) => p.id === id);
}
