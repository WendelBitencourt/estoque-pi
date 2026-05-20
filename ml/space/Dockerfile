FROM python:3.10-slim

WORKDIR /app

# Instala dependências primeiro (camada cacheada pelo Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante dos arquivos
COPY . .

# Porta padrão do Hugging Face Spaces
EXPOSE 7860

# Inicia o servidor FastAPI
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
