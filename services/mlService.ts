import { NivelRisco } from './tipos';
import { ML_API_URL } from './config';

type MLClasse = 'consumo_imediato' | 'risco_vencimento' | 'seguro';

const MAPA: Record<MLClasse, NivelRisco> = {
  consumo_imediato: 'risco_alto',
  risco_vencimento: 'atencao',
  seguro: 'seguro',
};

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
