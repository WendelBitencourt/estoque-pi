import { NivelRisco } from './tipos';

const RISCO_ALTO_DIAS = 7;
const ATENCAO_DIAS = 30;

export function calcularRisco(validadeISO: string): NivelRisco {
  const dias = diasParaVencer(validadeISO);
  if (dias <= RISCO_ALTO_DIAS) return 'risco_alto';
  if (dias <= ATENCAO_DIAS) return 'atencao';
  return 'seguro';
}

export function diasParaVencer(validadeISO: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(validadeISO + 'T00:00:00');
  return Math.ceil((validade.getTime() - hoje.getTime()) / 86_400_000);
}

export function gerarCodigoLote(nomeProduto: string): string {
  const iniciais = nomeProduto
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 3)
    .padEnd(2, 'X');
  const ano = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 99 + 1)
    .toString()
    .padStart(2, '0');
  return `${iniciais}${ano}${rand}`;
}

export function getRiscoProduto(lotes: Array<{ risco: NivelRisco | null }>): NivelRisco {
  if (lotes.some((l) => l.risco === 'risco_alto')) return 'risco_alto';
  if (lotes.some((l) => l.risco === 'atencao')) return 'atencao';
  return 'seguro';
}
