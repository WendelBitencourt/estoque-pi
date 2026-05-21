import { NivelRisco } from './tipos';
import { ML_API_URL } from './config';

type MLClasse = 'consumo_imediato' | 'risco_vencimento' | 'seguro';

const MAPA: Record<MLClasse, NivelRisco> = {
  consumo_imediato: 'risco_alto',
  risco_vencimento: 'atencao',
  seguro: 'seguro',
};

export interface PrevisaoEstoque {
  taxaUnidDia: number | null;
  diasRestantes: number | null;
  r2: number | null;
  suficiente: boolean;
  mensagem: string;
}

export async function preverFimEstoque(
  saidas: { data: string; quantidade: number }[],
  estoqueAtual: number
): Promise<PrevisaoEstoque> {
  const resp = await fetch(`${ML_API_URL}/prever-fim-estoque`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      saidas: saidas.map((s) => ({ data: s.data, quantidade: s.quantidade })),
      estoque_atual: estoqueAtual,
    }),
  });
  if (!resp.ok) throw new Error(`ML API ${resp.status}`);
  const json = await resp.json();
  return {
    taxaUnidDia: json.taxa_unid_dia ?? null,
    diasRestantes: json.dias_restantes ?? null,
    r2: json.r2 ?? null,
    suficiente: json.suficiente,
    mensagem: json.mensagem,
  };
}

// ── K-Means — Agrupamento de Doações ─────────────────────────────────────────

export interface RegistroMensalKMeans {
  ano: number;
  mes: number;
  categoria: string;
  totalUnid: number;
}

export interface ClusterDoacoes {
  id: number;
  nMeses: number;
  meses: string[];
  perfil: Record<string, number>; // { alimentos: 90.0, higiene: 53.0, limpeza: 30.0 }
  descricao: string;
}

export interface ResultadoAgrupamento {
  clusters: ClusterDoacoes[];
  clusterMesAtual: number | null;
  descricaoMesAtual: string | null;
  suficiente: boolean;
  motivo: string | null;
}

/**
 * Envia o histórico mensal de doações para o endpoint /agrupar-doacoes
 * e retorna os clusters descobertos pelo K-Means.
 *
 * Uso típico (Parte 5 — Lista de Necessidades):
 *   const historico = await getEntradasMensais();
 *   const agora = new Date();
 *   const resultado = await agruparDoacoes(historico, agora.getMonth() + 1, agora.getFullYear());
 *   // resultado.descricaoMesAtual → frase para exibir ao usuário
 */
export async function agruparDoacoes(
  historico: RegistroMensalKMeans[],
  mesAtual?: number,
  anoAtual?: number
): Promise<ResultadoAgrupamento> {
  const resp = await fetch(`${ML_API_URL}/agrupar-doacoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      historico: historico.map((r) => ({
        ano: r.ano,
        mes: r.mes,
        categoria: r.categoria,
        total_unid: r.totalUnid,
      })),
      mes_atual: mesAtual ?? null,
      ano_atual: anoAtual ?? null,
    }),
  });
  if (!resp.ok) throw new Error(`ML API ${resp.status}`);
  const json = await resp.json();
  return {
    clusters: (json.clusters as any[]).map((c) => ({
      id: c.id,
      nMeses: c.n_meses,
      meses: c.meses,
      perfil: c.perfil,
      descricao: c.descricao,
    })),
    clusterMesAtual: json.cluster_mes_atual ?? null,
    descricaoMesAtual: json.descricao_mes_atual ?? null,
    suficiente: json.suficiente,
    motivo: json.motivo ?? null,
  };
}

export async function classificarRiscoML(
  diasAteVencer: number,
  mediaConsumoDias: number,
  quantidade: number
): Promise<NivelRisco> {
  const resp = await fetch(`${ML_API_URL}/classificar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dias_ate_vencer: Math.max(0, diasAteVencer),
      media_consumo_dias: Math.max(1, mediaConsumoDias),
      quantidade: Math.max(1, quantidade),
    }),
  });
  if (!resp.ok) throw new Error(`ML API ${resp.status}`);
  const json = await resp.json();
  return MAPA[json.risco as MLClasse] ?? 'seguro';
}
