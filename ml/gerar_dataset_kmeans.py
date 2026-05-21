"""
gerar_dataset_kmeans.py
=======================
Gera o dataset sintético para testar o agrupamento K-Means de doações.

O QUE O K-MEANS VAI DESCOBRIR?
  Ao aplicar K-Means sobre o histórico mensal de doações por categoria,
  o modelo agrupa meses com perfis de doação parecidos. Exemplos esperados:

    Cluster A — "meses de inverno com foco em alimentos"
      julho/agosto: campanhas de arrecadação de alimentos (inverno no Brasil)

    Cluster B — "meses de pico total (datas comemorativas)"
      outubro/novembro: Dia das Crianças + campanha de fim de ano

    Cluster C — "meses de entressafra (baixa doação)"
      março/abril: pós-Carnaval, queda nas doações

    Cluster D — "meses de higiene (início do ano/verão)"
      janeiro/fevereiro: faxina de virada do ano, doações de limpeza e higiene

POR QUE DATASET SINTÉTICO?
  O app ainda está em fase inicial — não há 2 anos de histórico real.
  Criamos um histórico plausível de 24 meses (2023–2024) com os padrões
  sazonais típicos de ONGs brasileiras. O K-Means então aprende esses padrões.

FORMATO DO DATASET:
  Uma linha por (ano, mês, categoria).
  ano         — ano da movimentação
  mes         — mês (1–12)
  categoria   — 'alimentos', 'higiene' ou 'limpeza'
  total_unid  — soma de unidades recebidas naquele mês/categoria
  num_doacoes — número de registros de entrada no período

COMO USAR:
  python gerar_dataset_kmeans.py
  → gera data/dataset_kmeans.csv
"""

import pandas as pd
import numpy as np
import os

np.random.seed(7)  # reprodutibilidade

# ── Parâmetros sazonais ───────────────────────────────────────────────────────
# Para cada mês, definimos multiplicadores que representam a intensidade
# de doação de cada categoria. Valores > 1 = acima da média; < 1 = abaixo.

# Padrões sazonais baseados em comportamento típico de ONGs brasileiras:
#   Jan–Fev: pós-festas, faxina de ano novo → higiene e limpeza sobem
#   Mar–Abr: pós-carnaval, queda geral
#   Mai–Jun: Dia das Mães (maio), Dia dos Namorados (jun) → doações moderadas
#   Jul–Ago: Inverno + campanhas de alimentos → alimentos disparam
#   Set–Out: Dia das Crianças (out) → pico geral, especialmente alimentos
#   Nov–Dez: Natal/fim de ano → pico máximo, todas as categorias sobem

SAZONALIDADE = {
    #  mês: { alimentos, higiene, limpeza }  (multiplicadores sobre base)
    1:  {'alimentos': 0.9, 'higiene': 1.4, 'limpeza': 1.5},
    2:  {'alimentos': 0.8, 'higiene': 1.2, 'limpeza': 1.3},
    3:  {'alimentos': 0.7, 'higiene': 0.8, 'limpeza': 0.7},
    4:  {'alimentos': 0.8, 'higiene': 0.7, 'limpeza': 0.6},
    5:  {'alimentos': 1.0, 'higiene': 1.0, 'limpeza': 0.9},
    6:  {'alimentos': 1.1, 'higiene': 1.0, 'limpeza': 0.9},
    7:  {'alimentos': 1.6, 'higiene': 0.8, 'limpeza': 0.7},
    8:  {'alimentos': 1.5, 'higiene': 0.9, 'limpeza': 0.8},
    9:  {'alimentos': 1.1, 'higiene': 1.0, 'limpeza': 0.9},
    10: {'alimentos': 1.3, 'higiene': 1.2, 'limpeza': 1.1},
    11: {'alimentos': 1.4, 'higiene': 1.3, 'limpeza': 1.3},
    12: {'alimentos': 1.6, 'higiene': 1.5, 'limpeza': 1.5},
}

# Quantidades base (unidades/mês) por categoria, sem sazonalidade
BASE = {'alimentos': 80, 'higiene': 50, 'limpeza': 30}
# Número base de registros de doação por mês/categoria
BASE_NUM_DOACOES = {'alimentos': 8, 'higiene': 5, 'limpeza': 3}

ANOS = [2023, 2024]
CATEGORIAS = ['alimentos', 'higiene', 'limpeza']


# ── Geração ───────────────────────────────────────────────────────────────────

def gerar_dataset_kmeans() -> pd.DataFrame:
    linhas = []

    for ano in ANOS:
        for mes in range(1, 13):
            for cat in CATEGORIAS:
                mult = SAZONALIDADE[mes][cat]

                # Adiciona ruído gaussiano (±15%) para simular variação real
                ruido = np.random.normal(1.0, 0.15)
                total = max(1, int(BASE[cat] * mult * ruido))

                ruido_n = np.random.normal(1.0, 0.10)
                num = max(1, int(BASE_NUM_DOACOES[cat] * mult * ruido_n))

                linhas.append({
                    'ano':        ano,
                    'mes':        mes,
                    'categoria':  cat,
                    'total_unid': total,
                    'num_doacoes': num,
                })

    return pd.DataFrame(linhas)


# ── Execução principal ────────────────────────────────────────────────────────

if __name__ == '__main__':
    df = gerar_dataset_kmeans()

    print("=" * 55)
    print("  DATASET K-MEANS — Agrupamento de Doações")
    print("=" * 55)
    print(f"\nTotal de linhas: {len(df)}")
    print(f"Período: {df['ano'].min()} a {df['ano'].max()}")
    print(f"Categorias: {', '.join(df['categoria'].unique())}\n")

    print("Média mensal de unidades por categoria:")
    pivot = df.groupby('categoria')['total_unid'].mean().round(1)
    for cat, media in pivot.items():
        print(f"  {cat:<12}: {media:>6.1f} un./mês")

    print("\nMeses com MAIOR doação de alimentos (top 5):")
    top = (df[df['categoria'] == 'alimentos']
           .groupby('mes')['total_unid'].mean()
           .sort_values(ascending=False)
           .head(5))
    for mes, val in top.items():
        print(f"  Mês {mes:02d}: {val:.0f} un.")

    print("\nPrimeiras 10 linhas do dataset:")
    print(df.head(10).to_string(index=False))

    os.makedirs('data', exist_ok=True)
    caminho = os.path.join('data', 'dataset_kmeans.csv')
    df.to_csv(caminho, index=False)
    print(f"\n✓ Dataset salvo em: ml/{caminho}")
    print(f"  ({len(df)} linhas × {len(df.columns)} colunas)")
