"""
treinar_modelo.py
=================
Treina a Árvore de Decisão para classificar o risco de validade de lotes.

O que este script faz:
  1. Carrega o dataset gerado por gerar_dataset.py
  2. Divide em treino (80%) e teste (20%)
  3. Treina um DecisionTreeClassifier do scikit-learn
  4. Avalia com acurácia e matriz de confusão
  5. Salva o modelo treinado em modelo/classificador.joblib

Por que Árvore de Decisão?
  - Exigida pelo professor ("algoritmos de aprendizagem — Árvores de Decisão")
  - Interpretável: é possível visualizar e explicar cada decisão
  - Funciona bem com poucos dados e variáveis numéricas simples
  - Não precisa de normalização das features

Como usar:
  python treinar_modelo.py
  → imprime métricas de avaliação
  → salva o modelo em modelo/classificador.joblib
"""

import os
import joblib
import pandas as pd
from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)


# ── Configurações ────────────────────────────────────────────────────────────

DATASET_PATH = os.path.join('data', 'dataset.csv')
MODELO_PATH  = os.path.join('modelo', 'classificador.joblib')

# Features usadas pelo modelo (devem ser as mesmas na API)
FEATURES = ['dias_ate_vencer', 'media_consumo_dias', 'quantidade']
LABEL    = 'risco'

# Ordem das classes (para a matriz de confusão ficar legível)
CLASSES = ['consumo_imediato', 'risco_vencimento', 'seguro']

# Profundidade máxima da árvore
# Valor baixo (5) evita overfitting e mantém a árvore explicável na apresentação
MAX_DEPTH = 5


# ── 1. Carregar dataset ──────────────────────────────────────────────────────

print("=" * 50)
print("  TREINO DO MODELO — Classificação de Validade")
print("=" * 50)

df = pd.read_csv(DATASET_PATH)
print(f"\n[1/4] Dataset carregado: {len(df)} exemplos\n")


# ── 2. Dividir em treino e teste ─────────────────────────────────────────────

# 80% treino, 20% teste — proporção padrão em ML
# stratify=y garante que a distribuição de classes seja igual nos dois conjuntos
X = df[FEATURES]
y = df[LABEL]

X_treino, X_teste, y_treino, y_teste = train_test_split(
    X, y,
    test_size=0.20,
    random_state=42,
    stratify=y,        # mantém a proporção de classes no treino e no teste
)

print(f"[2/4] Divisão treino/teste:")
print(f"       Treino : {len(X_treino)} exemplos (80%)")
print(f"       Teste  : {len(X_teste)} exemplos (20%)\n")


# ── 3. Treinar o modelo ──────────────────────────────────────────────────────

# DecisionTreeClassifier — Árvore de Decisão do scikit-learn
# criterion='gini': usa o índice Gini para escolher os melhores splits
# max_depth=5: limita a profundidade para evitar overfitting
modelo = DecisionTreeClassifier(
    criterion='gini',
    max_depth=MAX_DEPTH,
    random_state=42,
)

modelo.fit(X_treino, y_treino)
print(f"[3/4] Modelo treinado (profundidade máxima: {MAX_DEPTH})\n")


# ── 4. Avaliar o modelo ──────────────────────────────────────────────────────

y_pred = modelo.predict(X_teste)
acuracia = accuracy_score(y_teste, y_pred)

print("[4/4] Resultados da avaliação:")
print(f"\n  Acurácia: {acuracia * 100:.1f}%\n")

# Relatório completo: precisão, recall e F1 por classe
print("  Relatório por classe:")
print(classification_report(y_teste, y_pred, target_names=CLASSES, zero_division=0))

# Matriz de confusão — linhas = real, colunas = previsto
print("  Matriz de confusão:")
print("  (linhas = risco real, colunas = risco previsto)\n")
mc = confusion_matrix(y_teste, y_pred, labels=CLASSES)
col_w = 18
print(" " * 22 + "".join(f"{c:>{col_w}}" for c in CLASSES))
for i, classe in enumerate(CLASSES):
    linha = f"  {classe:<20}" + "".join(f"{mc[i][j]:>{col_w}}" for j in range(len(CLASSES)))
    print(linha)

# Resumo da estrutura da árvore (útil para a apresentação)
print("\n  Estrutura simplificada da árvore (primeiros nós):")
regras = export_text(modelo, feature_names=FEATURES, max_depth=3)
for linha in regras.split('\n')[:20]:
    print("  " + linha)
print("  ...")


# ── 5. Salvar o modelo ───────────────────────────────────────────────────────

os.makedirs('modelo', exist_ok=True)
joblib.dump(modelo, MODELO_PATH)
print(f"\n✓ Modelo salvo em: ml/{MODELO_PATH}")
print("  (este arquivo será enviado para o Hugging Face Space na próxima etapa)")
