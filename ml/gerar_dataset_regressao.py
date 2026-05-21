"""
gerar_dataset_regressao.py
==========================
Gera o dataset sintético para testar a Regressão Linear de predição de demanda.

O QUE A REGRESSÃO LINEAR VAI PREVER?
  Para cada produto, analisamos o histórico de saídas e ajustamos uma reta
  que representa o ritmo de consumo (unidades por dia). Com esse ritmo e o
  estoque atual, calculamos:

    dias_ate_zerar = estoque_atual / taxa_consumo_diaria

  Exemplo real:
    → Leite em Pó: 3 saídas em 15 dias totalizando 30 unidades
       taxa = 30 / 15 = 2 un/dia
    → Estoque atual: 18 unidades
       previsão: 18 / 2 = ~9 dias

POR QUE REGRESSÃO LINEAR?
  - Simples, rápida de treinar e fácil de explicar na apresentação
  - Funciona bem com 5+ pontos de saída
  - A reta é visualmente intuitiva: inclinação = velocidade de consumo
  - Não precisa de dados históricos de anos — semanas já são suficientes

FORMATO DO DATASET:
  Uma linha por evento de saída (registro de baixa no estoque).
  produto_id    — identificador único do produto
  produto_nome  — nome do produto
  categoria     — alimentos, higiene ou limpeza
  data          — data da saída (YYYY-MM-DD)
  quantidade    — unidades removidas nessa saída
  estoque_apos  — saldo imediatamente após a saída (para validação)

PRODUTOS SIMULADOS (com ritmos diferentes):
  Leite em Pó      → saída a cada ~5 dias  (consumo rápido)
  Arroz            → saída a cada ~12 dias (consumo médio)
  Feijão           → saída a cada ~15 dias (consumo médio-lento)
  Sabão em Pó      → saída a cada ~30 dias (consumo lento)
  Shampoo          → saída a cada ~45 dias (consumo muito lento)
  Açúcar           → saída a cada ~8 dias  (consumo rápido-médio)
  Detergente       → saída a cada ~20 dias (consumo médio)
  Macarrão         → saída a cada ~10 dias (consumo médio)

COMO USAR:
  python gerar_dataset_regressao.py
  → gera data/dataset_regressao.csv
"""

import pandas as pd
import numpy as np
import os
from datetime import date, timedelta

np.random.seed(13)  # reprodutibilidade

# Data inicial do histórico simulado (6 meses atrás)
DATA_INICIO = date(2024, 11, 20)

# ── Definição dos produtos ────────────────────────────────────────────────────
# Cada produto tem:
#   intervalo_dias  — a cada quantos dias ocorre uma saída (em média)
#   qtd_por_saida   — quantas unidades por saída (em média)
#   estoque_inicial — quanto tinha no início do período

PRODUTOS = [
    {
        'produto_id':    'P001',
        'produto_nome':  'Leite em Pó Integral',
        'categoria':     'alimentos',
        'intervalo_dias': 5,   # saída frequente
        'qtd_por_saida':  4,
        'estoque_inicial': 60,
    },
    {
        'produto_id':    'P002',
        'produto_nome':  'Arroz Branco',
        'categoria':     'alimentos',
        'intervalo_dias': 12,
        'qtd_por_saida':  8,
        'estoque_inicial': 100,
    },
    {
        'produto_id':    'P003',
        'produto_nome':  'Feijão Carioca',
        'categoria':     'alimentos',
        'intervalo_dias': 15,
        'qtd_por_saida':  6,
        'estoque_inicial': 80,
    },
    {
        'produto_id':    'P004',
        'produto_nome':  'Açúcar Cristal',
        'categoria':     'alimentos',
        'intervalo_dias': 8,
        'qtd_por_saida':  5,
        'estoque_inicial': 70,
    },
    {
        'produto_id':    'P005',
        'produto_nome':  'Macarrão Espaguete',
        'categoria':     'alimentos',
        'intervalo_dias': 10,
        'qtd_por_saida':  7,
        'estoque_inicial': 90,
    },
    {
        'produto_id':    'P006',
        'produto_nome':  'Shampoo',
        'categoria':     'higiene',
        'intervalo_dias': 45,  # saída rara
        'qtd_por_saida':  3,
        'estoque_inicial': 30,
    },
    {
        'produto_id':    'P007',
        'produto_nome':  'Sabão em Pó',
        'categoria':     'limpeza',
        'intervalo_dias': 30,
        'qtd_por_saida':  4,
        'estoque_inicial': 40,
    },
    {
        'produto_id':    'P008',
        'produto_nome':  'Detergente',
        'categoria':     'limpeza',
        'intervalo_dias': 20,
        'qtd_por_saida':  5,
        'estoque_inicial': 50,
    },
]

DIAS_DE_HISTORICO = 180  # 6 meses de histórico


# ── Geração ───────────────────────────────────────────────────────────────────

def gerar_saidas_produto(produto: dict) -> list[dict]:
    """
    Gera o histórico de saídas de um produto ao longo de DIAS_DE_HISTORICO dias.
    O intervalo entre saídas e a quantidade variam com ruído gaussiano (±25%)
    para simular a irregularidade real de uma ONG.
    """
    saidas = []
    estoque = produto['estoque_inicial']
    data_atual = DATA_INICIO
    data_fim = DATA_INICIO + timedelta(days=DIAS_DE_HISTORICO)

    while data_atual < data_fim and estoque > 0:
        # Próxima saída ocorre após um intervalo com variação de ±25%
        intervalo = max(1, int(np.random.normal(
            produto['intervalo_dias'],
            produto['intervalo_dias'] * 0.25
        )))
        data_atual += timedelta(days=intervalo)

        if data_atual >= data_fim:
            break

        # Quantidade da saída varia ±30%
        qtd = max(1, int(np.random.normal(
            produto['qtd_por_saida'],
            produto['qtd_por_saida'] * 0.30
        )))
        qtd = min(qtd, estoque)  # não sai mais do que existe em estoque
        estoque -= qtd

        saidas.append({
            'produto_id':   produto['produto_id'],
            'produto_nome': produto['produto_nome'],
            'categoria':    produto['categoria'],
            'data':         data_atual.isoformat(),
            'quantidade':   qtd,
            'estoque_apos': estoque,
        })

    return saidas


def gerar_dataset_regressao() -> pd.DataFrame:
    todas_saidas = []
    for produto in PRODUTOS:
        saidas = gerar_saidas_produto(produto)
        todas_saidas.extend(saidas)

    df = pd.DataFrame(todas_saidas)
    df['data'] = pd.to_datetime(df['data'])
    df = df.sort_values(['produto_id', 'data']).reset_index(drop=True)
    return df


# ── Execução principal ────────────────────────────────────────────────────────

if __name__ == '__main__':
    df = gerar_dataset_regressao()

    print("=" * 60)
    print("  DATASET REGRESSÃO — Predição de Fim de Estoque")
    print("=" * 60)
    print(f"\nTotal de eventos de saída: {len(df)}")
    print(f"Produtos distintos: {df['produto_id'].nunique()}")
    print(f"Período: {df['data'].min().date()} a {df['data'].max().date()}\n")

    print("Resumo por produto:")
    resumo = (
        df.groupby(['produto_id', 'produto_nome'])
        .agg(
            saidas=('quantidade', 'count'),
            total_consumido=('quantidade', 'sum'),
            estoque_final=('estoque_apos', 'last'),
        )
        .reset_index()
    )

    for _, r in resumo.iterrows():
        # Calcula taxa de consumo diária simples para validação visual
        n_dias = DIAS_DE_HISTORICO
        taxa_dia = round(r['total_consumido'] / n_dias, 2)
        dias_restantes = round(r['estoque_final'] / taxa_dia) if taxa_dia > 0 else '∞'
        print(f"  {r['produto_nome']:<25} | {r['saidas']:>2} saídas | "
              f"{r['total_consumido']:>3} un. consumidas | "
              f"estoque final: {r['estoque_final']:>3} | "
              f"~{dias_restantes}d restantes")

    print("\nPrimeiras 12 linhas do dataset:")
    print(df.head(12).to_string(index=False))

    os.makedirs('data', exist_ok=True)
    caminho = os.path.join('data', 'dataset_regressao.csv')
    df.to_csv(caminho, index=False)
    print(f"\n✓ Dataset salvo em: ml/{caminho}")
    print(f"  ({len(df)} linhas × {len(df.columns)} colunas)")
