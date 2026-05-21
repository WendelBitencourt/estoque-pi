"""
treinar_regressao.py
====================
Treina e avalia a Regressão Linear para predição de fim de estoque.

O QUE ESTE SCRIPT FAZ:
  1. Carrega o dataset de saídas históricas (gerar_dataset_regressao.py)
  2. Para cada produto, converte datas em índices de dia (X)
     e calcula o consumo acumulado (y)
  3. Ajusta uma LinearRegression(X, y)
  4. O coeficiente angular da reta = taxa de consumo (unidades/dia)
  5. Predição: dias_restantes = estoque_atual / taxa

POR QUE CONSUMO ACUMULADO?
  Ajustar a regressão sobre o CONSUMO ACUMULADO em vez de eventos individuais
  é mais robusto: a reta vai de (0, 0) até (último_dia, total_consumido).
  Eventos irregulares (compra de 10 unidades num dia) são suavizados.

  Antes de ajustar:
    X = [5, 12, 17, 25, ...]   → dias desde o início
    y = [4,  9, 14, 21, ...]   → unidades acumuladas até cada saída

  A inclinação da reta (coef_) = taxa de consumo em un./dia.

DECISÃO DE ARQUITETURA — TREINO SOB DEMANDA:
  Igual ao K-Means: a Regressão Linear é treinada a cada chamada HTTP.
  O app passa o histórico de saídas do produto e o estoque atual;
  a API treina em <10ms e devolve a predição. Isso garante que o modelo
  usa sempre os dados mais recentes sem necessidade de retreinar.

COMO USAR:
  python treinar_regressao.py
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

MIN_SAIDAS = 3   # mínimo de eventos para fazer uma previsão confiável

NOME_PRODUTO_CURTO = {
    'Leite em Pó Integral': 'Leite em Pó',
    'Arroz Branco':         'Arroz',
    'Feijão Carioca':       'Feijão',
    'Açúcar Cristal':       'Açúcar',
    'Macarrão Espaguete':   'Macarrão',
    'Shampoo':              'Shampoo',
    'Sabão em Pó':          'Sabão em Pó',
    'Detergente':           'Detergente',
}


# ── Carregar dataset ──────────────────────────────────────────────────────────

print("=" * 62)
print("  REGRESSÃO LINEAR — Predição de Fim de Estoque")
print("=" * 62)

df = pd.read_csv('data/dataset_regressao.csv', parse_dates=['data'])
produtos = df['produto_id'].unique()
print(f"\n[1/3] Dataset carregado: {len(df)} eventos | {len(produtos)} produtos\n")


# ── Função de predição ────────────────────────────────────────────────────────

def prever_fim_estoque(historico: pd.DataFrame, estoque_atual: int) -> dict:
    """
    Recebe o histórico de saídas de UM produto e o estoque atual.
    Retorna a previsão de dias até zerar.

    Parâmetros:
      historico     — DataFrame com colunas ['data', 'quantidade', 'estoque_apos']
      estoque_atual — saldo atual do produto

    Retorna dicionário com:
      taxa_dia      — consumo médio em unidades/dia (coef. angular da reta)
      r2            — qualidade do ajuste (1.0 = reta perfeita)
      dias_restantes — previsão de dias até zerar (None se dados insuficientes)
      suficiente    — True se havia dados suficientes para prever
    """
    if len(historico) < MIN_SAIDAS:
        return {
            'taxa_dia': None,
            'r2': None,
            'dias_restantes': None,
            'suficiente': False,
        }

    # Ordena por data e calcula dias desde o primeiro evento
    hist = historico.sort_values('data').copy()
    data_inicio = hist['data'].iloc[0]
    hist['dia'] = (hist['data'] - data_inicio).dt.days.astype(float)

    # Consumo acumulado até cada evento (y)
    hist['consumo_acum'] = hist['quantidade'].cumsum().astype(float)

    X = hist['dia'].values.reshape(-1, 1)
    y = hist['consumo_acum'].values

    # Treina a regressão linear: y ≈ taxa * dia + intercepto
    modelo = LinearRegression()
    modelo.fit(X, y)

    taxa = modelo.coef_[0]      # unidades consumidas por dia
    r2 = r2_score(y, modelo.predict(X))

    if taxa <= 0 or estoque_atual <= 0:
        return {
            'taxa_dia': round(taxa, 3),
            'r2': round(r2, 3),
            'dias_restantes': None,
            'suficiente': True,
        }

    dias = round(estoque_atual / taxa)

    return {
        'taxa_dia': round(taxa, 3),
        'r2': round(r2, 3),
        'dias_restantes': dias,
        'suficiente': True,
    }


# ── Aplicar para cada produto ─────────────────────────────────────────────────

print("[2/3] Treinando Regressão Linear por produto:\n")

resultados = []

for pid in produtos:
    hist = df[df['produto_id'] == pid].copy()
    nome = hist['produto_nome'].iloc[0]
    cat  = hist['categoria'].iloc[0]

    # Estoque atual = último valor de estoque_apos
    estoque_atual = int(hist.sort_values('data')['estoque_apos'].iloc[-1])

    res = prever_fim_estoque(hist, estoque_atual)
    res.update({
        'produto_id':   pid,
        'nome':         NOME_PRODUTO_CURTO.get(nome, nome),
        'categoria':    cat,
        'n_saidas':     len(hist),
        'estoque_atual': estoque_atual,
    })
    resultados.append(res)

# Imprime tabela de resultados
print(f"  {'Produto':<22} {'Cat.':<10} {'Saídas':>7} {'Estoque':>8} "
      f"{'Un./dia':>8} {'R²':>6} {'Previsão'}")
print("  " + "-" * 80)

for r in sorted(resultados, key=lambda x: (x['dias_restantes'] or 9999)):
    if not r['suficiente']:
        prev = "⚠ Dados insuficientes"
        taxa_s = "—"
        r2_s = "—"
    elif r['dias_restantes'] is None:
        prev = "Estoque zerado"
        taxa_s = f"{r['taxa_dia']:.3f}"
        r2_s = f"{r['r2']:.2f}"
    elif r['dias_restantes'] <= 7:
        prev = f"🔴 ~{r['dias_restantes']} dias (URGENTE)"
        taxa_s = f"{r['taxa_dia']:.3f}"
        r2_s = f"{r['r2']:.2f}"
    elif r['dias_restantes'] <= 30:
        prev = f"🟡 ~{r['dias_restantes']} dias"
        taxa_s = f"{r['taxa_dia']:.3f}"
        r2_s = f"{r['r2']:.2f}"
    else:
        prev = f"🟢 ~{r['dias_restantes']} dias"
        taxa_s = f"{r['taxa_dia']:.3f}"
        r2_s = f"{r['r2']:.2f}"

    print(f"  {r['nome']:<22} {r['categoria']:<10} {r['n_saidas']:>7} "
          f"{r['estoque_atual']:>8} {taxa_s:>8} {r2_s:>6}  {prev}")


# ── Exemplo detalhado ─────────────────────────────────────────────────────────

print("\n[3/3] Exemplo detalhado — Feijão Carioca:\n")

hist_feijao = df[df['produto_id'] == 'P003'].sort_values('data').copy()
hist_feijao['dia'] = (hist_feijao['data'] - hist_feijao['data'].iloc[0]).dt.days
hist_feijao['consumo_acum'] = hist_feijao['quantidade'].cumsum()
estoque_feijao = int(hist_feijao['estoque_apos'].iloc[-1])

print("  Histórico de saídas:")
print(f"  {'Data':<14} {'Qtd':>5} {'Acumulado':>11} {'Estoque':>9}")
print("  " + "-" * 42)
for _, row in hist_feijao.iterrows():
    print(f"  {str(row['data'].date()):<14} {int(row['quantidade']):>5} "
          f"{int(row['consumo_acum']):>11} {int(row['estoque_apos']):>9}")

res_feijao = prever_fim_estoque(hist_feijao, estoque_feijao)
print(f"\n  Regressão Linear ajustada:")
print(f"    Taxa de consumo: {res_feijao['taxa_dia']} un./dia")
print(f"    R² (qualidade): {res_feijao['r2']} (1.0 = ajuste perfeito)")
print(f"    Estoque atual:  {estoque_feijao} unidades")
print(f"    Previsão:       {estoque_feijao} ÷ {res_feijao['taxa_dia']} ≈ "
      f"{res_feijao['dias_restantes']} dias")
print(f"\n  → O app exibirá: \"Previsão: deve acabar em ~{res_feijao['dias_restantes']} dias\"")

print("\n" + "─" * 62)
print("  RESUMO PARA A APRESENTAÇÃO:")
print("  A Regressão Linear ajusta uma reta sobre o consumo acumulado.")
print("  O coeficiente angular (inclinação) = ritmo diário de consumo.")
print("  Com o estoque atual e esse ritmo, calculamos a data prevista")
print("  de esgotamento — sem precisar de regras fixas programadas.")
print("─" * 62)
