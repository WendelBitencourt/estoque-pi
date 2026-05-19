"""
gerar_dataset.py
================
Gera o dataset sintético para treinar o modelo de classificação de risco de validade.

Por que dataset sintético?
  Ainda não há dados históricos reais suficientes. Criamos exemplos artificiais
  usando regras lógicas — depois o modelo aprende os padrões dessas regras.
  Isso é prática comum em projetos de ML com poucos dados reais.

Variáveis de entrada (features):
  - dias_ate_vencer    : dias restantes até a data de validade do lote
  - media_consumo_dias : quantos dias em média o estoque desse produto dura
                         (ex: 7 = o estoque some em ~1 semana; 60 = dura ~2 meses)
  - quantidade         : quantas unidades há no lote

Rótulo de saída (label):
  - risco: uma das três classes abaixo

Classes de risco (alinhadas ao documento do professor):
  - consumo_imediato  : alto risco — o lote vai vencer antes de ser consumido
  - risco_vencimento  : atenção — monitorar de perto
  - seguro            : validade confortável em relação ao ritmo de consumo

Como usar:
  python gerar_dataset.py
  → gera o arquivo data/dataset.csv
"""

import pandas as pd
import numpy as np
import os

# Semente fixa para reprodutibilidade — rodar duas vezes gera o mesmo dataset
np.random.seed(42)

N_EXEMPLOS = 800  # número de linhas no dataset


# ── Função de rotulagem ──────────────────────────────────────────────────────

def classificar_risco(dias: int, consumo: int, quantidade: int) -> str:
    """
    Decide o risco correto de um lote.

    Conceito central — razão tempo/consumo:
      razao = dias_ate_vencer / media_consumo_dias
      Responde: "quantos ciclos de consumo ainda cabem antes de vencer?"
        razao = 0.3 → só 30% do ciclo restante → muito arriscado
        razao = 1.0 → exatamente 1 ciclo → atenção
        razao = 2.5 → 2,5 ciclos antes de vencer → seguro

    Fator quantidade:
      Lotes grandes com poucos dias são mais urgentes.
      unidades_por_dia = quantidade / dias_ate_vencer
      Se estiver acima de um limiar, agrava o risco.
    """
    # Razão principal: tempo restante vs. ritmo de consumo
    razao = dias / consumo

    # Intensidade do estoque: unidades que precisam ser consumidas por dia
    unidades_por_dia = quantidade / max(dias, 1)
    estoque_pesado = unidades_por_dia > (consumo * 0.12)

    # Regra 1: produto vencendo em até 3 dias → sempre crítico
    if dias <= 3:
        return 'consumo_imediato'

    # Regra 2: razão muito baixa, ou razão baixa com estoque pesado
    if razao < 0.4 or (razao < 0.7 and estoque_pesado):
        return 'consumo_imediato'

    # Regra 3: zona de atenção
    if razao < 1.3:
        return 'risco_vencimento'

    # Regra 4: confortável
    return 'seguro'


# ── Geração dos exemplos ─────────────────────────────────────────────────────

def gerar_dataset() -> pd.DataFrame:
    """
    Gera N_EXEMPLOS linhas com distribuição variada e realista.
    Concentra mais exemplos nos extremos para o modelo aprender bem os casos
    críticos (produto quase vencendo) e os casos seguros.
    """
    exemplos = []

    for _ in range(N_EXEMPLOS):

        # dias_ate_vencer — distribuição em 4 faixas com pesos diferentes
        # Mais exemplos próximos a 0 para o modelo aprender os casos críticos
        faixa_dias = np.random.choice(4, p=[0.20, 0.25, 0.30, 0.25])
        if faixa_dias == 0:
            dias = int(np.random.randint(0, 8))       # 0–7 dias: muito crítico
        elif faixa_dias == 1:
            dias = int(np.random.randint(8, 31))      # 8–30 dias: crítico a moderado
        elif faixa_dias == 2:
            dias = int(np.random.randint(31, 91))     # 31–90 dias: moderado a bom
        else:
            dias = int(np.random.randint(91, 366))    # 91–365 dias: longo prazo

        # media_consumo_dias — ritmo de uso do produto
        # Higiene/limpeza duram mais; alimentos perecíveis somem rápido
        faixa_consumo = np.random.choice(4, p=[0.25, 0.35, 0.25, 0.15])
        if faixa_consumo == 0:
            consumo = int(np.random.randint(3, 8))    # 3–7 dias: consumo rápido
        elif faixa_consumo == 1:
            consumo = int(np.random.randint(7, 21))   # 7–20 dias: consumo médio
        elif faixa_consumo == 2:
            consumo = int(np.random.randint(21, 61))  # 21–60 dias: consumo lento
        else:
            consumo = int(np.random.randint(61, 121)) # 61–120 dias: muito lento

        # quantidade — tamanho do lote recebido
        faixa_qtd = np.random.choice(3, p=[0.30, 0.45, 0.25])
        if faixa_qtd == 0:
            quantidade = int(np.random.randint(1, 6))   # 1–5: lote pequeno
        elif faixa_qtd == 1:
            quantidade = int(np.random.randint(5, 21))  # 5–20: lote médio
        else:
            quantidade = int(np.random.randint(20, 101))# 20–100: lote grande

        risco = classificar_risco(dias, consumo, quantidade)

        exemplos.append({
            'dias_ate_vencer':    dias,
            'media_consumo_dias': consumo,
            'quantidade':         quantidade,
            'risco':              risco,
        })

    return pd.DataFrame(exemplos)


# ── Execução principal ───────────────────────────────────────────────────────

if __name__ == '__main__':
    df = gerar_dataset()

    # Estatísticas para validação visual
    print("=" * 45)
    print("  DATASET GERADO — Classificação de Validade")
    print("=" * 45)
    print(f"\nTotal de exemplos: {len(df)}\n")

    print("Distribuição das classes de risco:")
    contagem = df['risco'].value_counts()
    for classe, n in contagem.items():
        barra = '█' * (n // 10)
        print(f"  {classe:20s}: {n:4d} ({n / len(df) * 100:4.1f}%)  {barra}")

    print("\nEstatísticas das variáveis de entrada:")
    print(df[['dias_ate_vencer', 'media_consumo_dias', 'quantidade']].describe().round(1).to_string())

    print("\nPrimeiras 5 linhas do dataset:")
    print(df.head().to_string(index=False))

    # Salva o CSV
    os.makedirs('data', exist_ok=True)
    caminho = os.path.join('data', 'dataset.csv')
    df.to_csv(caminho, index=False)
    print(f"\n✓ Dataset salvo em: ml/{caminho}")
