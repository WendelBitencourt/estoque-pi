export type Categoria = 'alimentos' | 'higiene' | 'limpeza';
export type NivelRisco = 'seguro' | 'atencao' | 'risco_alto';
export type TipoMovimentacao = 'entrada' | 'saida' | 'descarte';

export interface Produto {
  id: string;
  nome: string;
  categoria: Categoria;
  emoji: string;
  ean?: string;
  fotoUrl?: string;
  conteudo?: string;
  mediaConsumoDias: number;

}

// Compatível com o tipo usado nas telas da Parte 1
export interface Lote {
  id: string;
  produtoId: string;
  codigo: string;
  quantidade: number;
  validade: string;    // ISO date "YYYY-MM-DD"
  risco: NivelRisco;
  dataCadastro: string; // ISO date "YYYY-MM-DD"
}

export interface Movimentacao {
  id: string;
  tipo: TipoMovimentacao;
  produtoId: string;
  loteId: string;
  quantidade: number;
  data: string;        // ISO date "YYYY-MM-DD"
  observacao?: string;
}
