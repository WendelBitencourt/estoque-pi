"""
app.py — API de Machine Learning — Casa da Criança
====================================================
Três endpoints de ML rodando no mesmo Hugging Face Space:

  GET  /                    → health check
  POST /classificar         → Árvore de Decisão (Parte 4): risco de validade
  POST /agrupar-doacoes     → K-Means (Parte 4B): padrões sazonais de doação
  POST /prever-fim-estoque  → Regressão Linear (Parte 4B): dias até zerar estoque

Decisão de arquitetura — treino sob demanda (Parte 4B):
  Os modelos de K-Means e Regressão Linear são treinados a cada chamada HTTP
  com os dados enviados pelo app. Isso garante que os resultados refletem
  sempre o histórico mais recente — sem necessidade de retreinar e fazer
  redeploy quando novos dados chegam. Ambos os modelos são leves (< 100ms).
"""

import os
import joblib
import numpy as np
from datetime import datetime, date

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.metrics import silhouette_score, r2_score

# ── Constantes ────────────────────────────────────────────────────────────────

MIN_SAIDAS_REGRESSAO = 3   # mínimo de eventos para prever fim de estoque
MIN_MESES_KMEANS = 6       # mínimo de meses-calendário para agrupar
CATEGORIAS = ['alimentos', 'higiene', 'limpeza']
NOMES_MESES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
               'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']


# ── Inicialização ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="ML — Casa da Criança",
    description="Classificação de validade, agrupamento de doações e predição de demanda.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Carrega o modelo da Árvore de Decisão (Parte 4) uma única vez ao iniciar
MODELO_PATH = os.path.join(os.path.dirname(__file__), "modelo", "classificador.joblib")
modelo_arvore = joblib.load(MODELO_PATH)

DESCRICOES_RISCO = {
    "consumo_imediato": "Alto risco — o lote pode vencer antes de ser consumido.",
    "risco_vencimento": "Atenção — monitorar este lote de perto.",
    "seguro":           "Validade confortável em relação ao ritmo de consumo.",
}


# ═════════════════════════════════════════════════════════════════════════════
# SCHEMAS — Parte 4 (Classificação de Validade)
# ═════════════════════════════════════════════════════════════════════════════

class EntradaLote(BaseModel):
    dias_ate_vencer:    int = Field(..., ge=0,  description="Dias restantes até a validade")
    media_consumo_dias: int = Field(..., ge=1,  description="Ritmo médio de consumo em dias")
    quantidade:         int = Field(..., ge=1,  description="Unidades no lote")

class SaidaClassificacao(BaseModel):
    risco:    str = Field(..., description="consumo_imediato | risco_vencimento | seguro")
    descricao: str


# ═════════════════════════════════════════════════════════════════════════════
# SCHEMAS — Parte 4B / K-Means (Agrupamento de Doações)
# ═════════════════════════════════════════════════════════════════════════════

class RegistroMensal(BaseModel):
    """Um registro de doação mensal agregado por categoria."""
    ano:        int = Field(..., ge=2020, le=2100)
    mes:        int = Field(..., ge=1, le=12)
    categoria:  str = Field(..., description="alimentos | higiene | limpeza")
    total_unid: int = Field(..., ge=0)

class EntradaAgrupamento(BaseModel):
    historico:   list[RegistroMensal] = Field(..., min_length=1)
    mes_atual:   Optional[int]        = Field(default=None, ge=1, le=12)
    ano_atual:   Optional[int]        = Field(default=None, ge=2020, le=2100)
    n_clusters:  int                  = Field(default=4, ge=2, le=6)

class ClusterInfo(BaseModel):
    id:        int
    n_meses:   int
    meses:     list[str]
    perfil:    dict                   # {"alimentos": 90.0, "higiene": 53.0, "limpeza": 30.0}
    descricao: str

class SaidaAgrupamento(BaseModel):
    clusters:             list[ClusterInfo]
    cluster_mes_atual:    Optional[int]
    descricao_mes_atual:  Optional[str]
    suficiente:           bool
    motivo:               Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
# SCHEMAS — Parte 4B / Regressão Linear (Predição de Demanda)
# ═════════════════════════════════════════════════════════════════════════════

class EventoSaida(BaseModel):
    """Uma saída ou descarte de estoque."""
    data:       str = Field(..., description="Data no formato YYYY-MM-DD")
    quantidade: int = Field(..., ge=1)

class EntradaPrevisao(BaseModel):
    saidas:         list[EventoSaida] = Field(..., min_length=1)
    estoque_atual:  int               = Field(..., ge=0)

class SaidaPrevisao(BaseModel):
    taxa_unid_dia:  Optional[float]   # unidades consumidas por dia
    dias_restantes: Optional[int]     # None = dados insuficientes ou estoque zerado
    r2:             Optional[float]   # qualidade do ajuste (0–1)
    suficiente:     bool
    mensagem:       str               # frase amigável para exibir no app


# ═════════════════════════════════════════════════════════════════════════════
# AUXILIARES
# ═════════════════════════════════════════════════════════════════════════════

def _interpretar_cluster(perfil: dict) -> str:
    """Gera descrição legível de um cluster a partir dos valores médios do centroide."""
    al = perfil.get('alimentos', 0)
    hi = perfil.get('higiene', 0)
    li = perfil.get('limpeza', 0)
    total = al + hi + li

    # Dominância relativa de cada categoria
    dom_al = al / total if total > 0 else 0
    dom_hi = hi / total if total > 0 else 0
    dom_li = li / total if total > 0 else 0

    # Volume médio (todas as categorias): abaixo de 100 = baixa doação
    if total < 100:
        return "Meses de baixa doação — boa oportunidade para reforçar pedidos"

    if dom_hi + dom_li > 0.55:
        return "Meses com foco em higiene e limpeza — ideal para pedir mais alimentos"

    if dom_al > 0.55 and total > 130:
        return "Meses de campanhas de alimentos — estoques de higiene podem precisar de reforço"

    return "Meses de doação equilibrada entre categorias"


def _label_mes(ano: int, mes: int) -> str:
    return f"{NOMES_MESES[mes]}/{str(ano)[-2:]}"


# ═════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/", summary="Health check")
def raiz():
    """Verifica se a API está no ar. Útil para acordar o Space após hibernação."""
    return {"status": "ok", "versao": "2.0.0", "modelos": ["classificador-validade", "kmeans-doacoes", "regressao-demanda"]}


# ── Parte 4: Classificação de Validade ───────────────────────────────────────

@app.post("/classificar", response_model=SaidaClassificacao,
          summary="Classificar risco de validade de um lote")
def classificar(entrada: EntradaLote):
    """
    Usa a Árvore de Decisão treinada (Parte 4) para classificar o risco de
    um lote de doação vencer antes de ser consumido.
    """
    try:
        X = np.array([[
            entrada.dias_ate_vencer,
            entrada.media_consumo_dias,
            entrada.quantidade,
        ]])
        risco = modelo_arvore.predict(X)[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao classificar: {str(e)}")

    return SaidaClassificacao(
        risco=risco,
        descricao=DESCRICOES_RISCO.get(risco, ""),
    )


# ── Parte 4B: K-Means — Agrupamento de Doações ───────────────────────────────

@app.post("/agrupar-doacoes", response_model=SaidaAgrupamento,
          summary="Agrupar padrões sazonais de doação via K-Means")
def agrupar_doacoes(entrada: EntradaAgrupamento):
    """
    Recebe o histórico mensal de doações (por categoria) e aplica K-Means
    para descobrir grupos de meses com comportamentos similares.

    - **historico**: lista de {ano, mes, categoria, total_unid}
    - **mes_atual** / **ano_atual**: se fornecidos, retorna a qual cluster pertence
    - **n_clusters**: número de grupos (padrão 4; use 2–6)
    """
    # 1. Agrega por (ano, mes) — uma linha por mês-calendário
    meses: dict[tuple, dict] = {}
    for r in entrada.historico:
        key = (r.ano, r.mes)
        if key not in meses:
            meses[key] = {c: 0 for c in CATEGORIAS}
        if r.categoria in CATEGORIAS:
            meses[key][r.categoria] += r.total_unid

    if len(meses) < MIN_MESES_KMEANS:
        return SaidaAgrupamento(
            clusters=[],
            cluster_mes_atual=None,
            descricao_mes_atual=None,
            suficiente=False,
            motivo=f"Histórico insuficiente ({len(meses)} meses). Mínimo: {MIN_MESES_KMEANS}.",
        )

    # Garante que n_clusters não supere o número de meses disponíveis
    k = min(entrada.n_clusters, len(meses))

    # 2. Monta array numpy na ordem dos meses
    chaves = sorted(meses.keys())
    X_raw = np.array(
        [[meses[c]['alimentos'], meses[c]['higiene'], meses[c]['limpeza']] for c in chaves],
        dtype=float,
    )

    # 3. Normaliza (obrigatório para K-Means — escalas diferentes por categoria)
    scaler = StandardScaler()
    X = scaler.fit_transform(X_raw)

    # 4. Treina K-Means
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = km.fit_predict(X)

    # 5. Constrói resposta por cluster
    centroides_orig = scaler.inverse_transform(km.cluster_centers_)
    clusters_out: list[ClusterInfo] = []

    for c in range(k):
        idx_cluster = [i for i, lb in enumerate(labels) if lb == c]
        meses_cluster = [_label_mes(chaves[i][0], chaves[i][1]) for i in idx_cluster]
        perfil = {
            cat: round(float(centroides_orig[c][j]), 1)
            for j, cat in enumerate(CATEGORIAS)
        }
        clusters_out.append(ClusterInfo(
            id=c,
            n_meses=len(idx_cluster),
            meses=meses_cluster,
            perfil=perfil,
            descricao=_interpretar_cluster(perfil),
        ))

    # 6. Identifica cluster do mês atual (se informado)
    cluster_atual = None
    descricao_atual = None

    if entrada.mes_atual is not None and entrada.ano_atual is not None:
        key_atual = (entrada.ano_atual, entrada.mes_atual)
        if key_atual in chaves:
            idx_atual = chaves.index(key_atual)
            cluster_atual = int(labels[idx_atual])
            descricao_atual = clusters_out[cluster_atual].descricao
        else:
            # Mês atual sem dados — tenta mesmo mês em anos anteriores, senão usa média global
            meses_mesmo_mes = [
                i for i, (a, m) in enumerate(chaves) if m == entrada.mes_atual
            ]
            if meses_mesmo_mes:
                X_proxy = X[meses_mesmo_mes].mean(axis=0).reshape(1, -1)
            else:
                # Nenhum histórico do mesmo mês — usa média de todos os meses como proxy
                X_proxy = X.mean(axis=0).reshape(1, -1)
            cluster_atual = int(km.predict(X_proxy)[0])
            descricao_atual = clusters_out[cluster_atual].descricao

    return SaidaAgrupamento(
        clusters=clusters_out,
        cluster_mes_atual=cluster_atual,
        descricao_mes_atual=descricao_atual,
        suficiente=True,
    )


# ── Parte 4B: Regressão Linear — Predição de Demanda ────────────────────────

@app.post("/prever-fim-estoque", response_model=SaidaPrevisao,
          summary="Prever em quantos dias o estoque de um produto vai acabar")
def prever_fim_estoque(entrada: EntradaPrevisao):
    """
    Recebe o histórico de saídas de um produto e o estoque atual.
    Aplica Regressão Linear sobre o consumo acumulado para estimar
    em quantos dias o estoque vai zerar.

    - **saidas**: lista de {data (YYYY-MM-DD), quantidade}
    - **estoque_atual**: saldo atual do produto

    Requer mínimo de 3 eventos de saída para uma estimativa confiável.
    """
    if entrada.estoque_atual == 0:
        return SaidaPrevisao(
            taxa_unid_dia=None,
            dias_restantes=0,
            r2=None,
            suficiente=True,
            mensagem="Estoque zerado.",
        )

    if len(entrada.saidas) < MIN_SAIDAS_REGRESSAO:
        return SaidaPrevisao(
            taxa_unid_dia=None,
            dias_restantes=None,
            r2=None,
            suficiente=False,
            mensagem="Dados insuficientes para previsão.",
        )

    # 1. Ordena saídas por data e converte para (dia_índice, consumo_acumulado)
    try:
        saidas_sorted = sorted(entrada.saidas, key=lambda s: s.data)
        data_inicio = datetime.fromisoformat(saidas_sorted[0].data)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Data inválida: {e}")

    dias_idx: list[float] = []
    consumo_acum: list[float] = []
    total = 0

    for s in saidas_sorted:
        dia = float((datetime.fromisoformat(s.data) - data_inicio).days)
        total += s.quantidade
        dias_idx.append(dia)
        consumo_acum.append(float(total))

    X = np.array(dias_idx).reshape(-1, 1)
    y = np.array(consumo_acum)

    # 2. Ajusta a regressão linear: consumo_acumulado ≈ taxa * dia + intercepto
    modelo_reg = LinearRegression()
    modelo_reg.fit(X, y)

    taxa = float(modelo_reg.coef_[0])   # unidades consumidas por dia
    r2 = float(r2_score(y, modelo_reg.predict(X)))

    if taxa <= 0:
        return SaidaPrevisao(
            taxa_unid_dia=round(taxa, 3),
            dias_restantes=None,
            r2=round(r2, 3),
            suficiente=True,
            mensagem="Consumo não detectado no histórico.",
        )

    # 3. Previsão: dias até zerar = estoque_atual / taxa_diária
    dias_restantes = max(0, round(entrada.estoque_atual / taxa))

    # 4. Gera mensagem amigável (sem jargão técnico)
    if dias_restantes == 0:
        mensagem = "Estoque deve acabar hoje."
    elif dias_restantes <= 3:
        mensagem = f"Deve acabar em ~{dias_restantes} dias — reposição urgente."
    elif dias_restantes <= 30:
        mensagem = f"Deve acabar em ~{dias_restantes} dias."
    else:
        mensagem = f"Deve acabar em ~{dias_restantes} dias — estoque confortável."

    return SaidaPrevisao(
        taxa_unid_dia=round(taxa, 3),
        dias_restantes=dias_restantes,
        r2=round(r2, 3),
        suficiente=True,
        mensagem=mensagem,
    )
