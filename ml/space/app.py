"""
app.py — API de Classificação de Validade
==========================================
Roda dentro do Hugging Face Space e expõe um endpoint HTTP.
O app React Native chama este endpoint para classificar cada lote.

Endpoint principal:
  POST /classificar
  Body: { "dias_ate_vencer": int, "media_consumo_dias": int, "quantidade": int }
  Retorno: { "risco": str, "descricao": str }
"""

import os
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Inicialização ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="Classificador de Validade — Casa da Criança",
    description="Classifica o risco de vencimento de lotes de doação.",
    version="1.0.0",
)

# CORS: permite que o app React Native (qualquer origem) chame esta API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Carrega o modelo uma única vez ao iniciar o servidor (não a cada requisição)
MODELO_PATH = os.path.join(os.path.dirname(__file__), "modelo", "classificador.joblib")
modelo = joblib.load(MODELO_PATH)

# Descrições amigáveis de cada classe (para exibir no app se necessário)
DESCRICOES = {
    "consumo_imediato": "Alto risco — o lote pode vencer antes de ser consumido.",
    "risco_vencimento": "Atenção — monitorar este lote de perto.",
    "seguro":           "Validade confortável em relação ao ritmo de consumo.",
}


# ── Schemas de entrada e saída ────────────────────────────────────────────────

class EntradaLote(BaseModel):
    dias_ate_vencer:    int = Field(..., ge=0,  description="Dias restantes até a data de validade")
    media_consumo_dias: int = Field(..., ge=1,  description="Dias médios que o estoque do produto dura")
    quantidade:         int = Field(..., ge=1,  description="Número de unidades no lote")

class SaidaClassificacao(BaseModel):
    risco:    str = Field(..., description="consumo_imediato | risco_vencimento | seguro")
    descricao: str = Field(..., description="Explicação legível do risco")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/", summary="Health check")
def raiz():
    """Verifica se a API está no ar. Útil para acordar o Space após hibernação."""
    return {"status": "ok", "modelo": "classificador-validade-v1"}


@app.post("/classificar", response_model=SaidaClassificacao, summary="Classificar risco de um lote")
def classificar(entrada: EntradaLote):
    """
    Recebe os dados de um lote e retorna a classificação de risco de validade.

    - **dias_ate_vencer**: quantos dias faltam para a validade
    - **media_consumo_dias**: em quantos dias o estoque desse produto costuma acabar
    - **quantidade**: número de unidades no lote
    """
    try:
        X = np.array([[
            entrada.dias_ate_vencer,
            entrada.media_consumo_dias,
            entrada.quantidade,
        ]])
        risco = modelo.predict(X)[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao classificar: {str(e)}")

    return SaidaClassificacao(
        risco=risco,
        descricao=DESCRICOES.get(risco, ""),
    )
