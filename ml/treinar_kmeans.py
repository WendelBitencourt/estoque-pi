"""
treinar_kmeans.py
=================
Treina e avalia o K-Means para agrupamento de padrões de doação.

O QUE ESTE SCRIPT FAZ:
  1. Carrega o dataset de doações mensais (gerado por gerar_dataset_kmeans.py)
  2. Pivota para formato wide: uma linha por mês, colunas = categorias
  3. Normaliza as features (obrigatório para K-Means)
  4. Determina o melhor número de clusters via método do cotovelo + silhouette
  5. Treina o K-Means com o k escolhido
  6. Interpreta cada cluster com linguagem simples

POR QUE NORMALIZAR?
  Alimentos (~90 un/mês) > Higiene (~53) > Limpeza (~30).
  Sem normalização, o K-Means daria peso desproporcional aos alimentos.
  O StandardScaler transforma cada feature para média=0, desvio=1.

DECISÃO DE ARQUITETURA — TREINO SOB DEMANDA:
  Este script demonstra o fluxo que a API vai replicar.
  Na prática, o K-Means é treinado a cada chamada HTTP, com os dados
  atuais do Firestore passados como entrada. Isso garante que os clusters
  sempre refletem o histórico mais recente — sem necessidade de retreinar
  e fazer redeploy do modelo quando novos dados chegam.
  Os modelos K-Means do scikit-learn são leves (~KB) e treinam em <100ms
  mesmo no Hugging Face gratuito, tornando essa abordagem viável.

COMO USAR:
  python treinar_kmeans.py
"""

import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

import warnings
warnings.filterwarnings('ignore')  # silencia avisos de convergência para output limpo

NOME_MES = {
    1: 'Jan', 2: 'Fev', 3: 'Mar', 4: 'Abr',
    5: 'Mai', 6: 'Jun', 7: 'Jul', 8: 'Ago',
    9: 'Set', 10: 'Out', 11: 'Nov', 12: 'Dez',
}


# ── 1. Carregar e pivotar ─────────────────────────────────────────────────────

print("=" * 58)
print("  K-MEANS — Agrupamento de Padrões de Doação")
print("=" * 58)

df = pd.read_csv('data/dataset_kmeans.csv')
print(f"\n[1/5] Dataset carregado: {len(df)} linhas, {df['ano'].nunique()} anos\n")

# Pivota: uma linha por (ano, mês) com colunas por categoria
wide = df.pivot_table(
    index=['ano', 'mes'],
    columns='categoria',
    values='total_unid',
    aggfunc='sum',
).reset_index()
wide.columns.name = None  # remove nome do índice de colunas

features_cols = ['alimentos', 'higiene', 'limpeza']
X_raw = wide[features_cols].values

print(f"[2/5] Formato após pivotar: {wide.shape[0]} meses × {len(features_cols)} features")
print("      (uma linha por mês; colunas = total de unidades por categoria)\n")


# ── 2. Normalizar ─────────────────────────────────────────────────────────────

scaler = StandardScaler()
X = scaler.fit_transform(X_raw)

print("[3/5] Features normalizadas (StandardScaler: média=0, desvio=1)")
print("      Médias originais:", {c: round(v, 1) for c, v in zip(features_cols, X_raw.mean(axis=0))})
print("      Após scaling:    ", {c: round(v, 2) for c, v in zip(features_cols, X.mean(axis=0))})


# ── 3. Escolher k — cotovelo + silhouette ─────────────────────────────────────

print("\n[4/5] Determinando o melhor número de clusters (k):")
print()

inertias = {}
silhouettes = {}

for k in range(2, 7):
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = km.fit_predict(X)
    inertias[k] = km.inertia_
    silhouettes[k] = silhouette_score(X, labels)

# Imprime tabela de métricas
print(f"  {'k':>3}  {'Inércia':>12}  {'Silhouette':>12}  {'Interpretação'}")
print(f"  {'-'*3}  {'-'*12}  {'-'*12}  {'-'*30}")
for k in range(2, 7):
    melhor = " ← escolhido" if silhouettes[k] == max(silhouettes.values()) else ""
    print(f"  {k:>3}  {inertias[k]:>12.1f}  {silhouettes[k]:>12.3f}{melhor}")

# Seleciona k com maior silhouette (clusters mais bem separados)
k_otimo = max(silhouettes, key=silhouettes.get)
print(f"\n  Silhouette mais alto → k = {k_otimo} clusters")
print(f"  (silhouette próximo de 1.0 = clusters bem definidos e separados)\n")


# ── 4. Treinar com k ótimo ────────────────────────────────────────────────────

km_final = KMeans(n_clusters=k_otimo, random_state=42, n_init=10)
wide['cluster'] = km_final.fit_predict(X)

print(f"[5/5] Modelo treinado com k = {k_otimo}. Resultados:\n")


# ── 5. Interpretar clusters ───────────────────────────────────────────────────

# Reconstrói os centroides na escala original para facilitar leitura
centroides_orig = scaler.inverse_transform(km_final.cluster_centers_)

for c in range(k_otimo):
    meses_cluster = wide[wide['cluster'] == c][['ano', 'mes']].values
    labels_meses = [f"{NOME_MES[m]}/{str(a)[-2:]}" for a, m in meses_cluster]
    centro = dict(zip(features_cols, centroides_orig[c].round(1)))

    # Identifica a categoria dominante neste cluster
    dominante = max(centro, key=lambda x: centroides_orig[c][features_cols.index(x)])
    dominante_val = centro[dominante]

    print(f"  ── Cluster {c} ({len(meses_cluster)} meses) ──")
    print(f"     Meses: {', '.join(labels_meses)}")
    print(f"     Centroide médio: {centro}")
    print(f"     Categoria dominante: {dominante.upper()} ({dominante_val:.0f} un./mês)")

    # Interpretação automática baseada nos centroides
    al = centro['alimentos']
    hi = centro['higiene']
    li = centro['limpeza']
    total = al + hi + li

    if al > 100 and al == max(centro.values()):
        interp = "Meses de CAMPANHAS DE ALIMENTOS (inverno/festas)"
    elif hi > 60 or li > 35:
        interp = "Meses com FOCO EM HIGIENE/LIMPEZA (virada do ano)"
    elif total < 120:
        interp = "Meses de BAIXA DOAÇÃO (entressafra)"
    else:
        interp = "Meses de DOAÇÃO EQUILIBRADA (período comum)"

    print(f"     → {interp}\n")

# Resumo para a apresentação
print("─" * 58)
print("  RESUMO PARA A APRESENTAÇÃO:")
print("  O K-Means descobriu automaticamente os padrões sazonais")
print("  de doação sem que nenhuma regra fosse programada.")
print("  Esses grupos alimentam a Lista de Necessidades (Parte 5),")
print("  que usará o cluster do mês atual para sugerir quais")
print("  categorias precisam de mais doações.")
print("─" * 58)
