# Use uma imagem base oficial do Python (>= 3.11)
FROM python:3.11-slim

# Defina o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copie os arquivos de definição de dependência PRIMEIRO para aproveitar o cache do Docker
COPY pyproject.toml uv.lock* ./

# Instale as dependências usando uv e o lockfile
# Instale uv primeiro usando pip
RUN pip install uv
# Agora use uv para instalar as dependências do projeto
RUN uv pip install --system --locked

# Copie o restante do código do serviço de ML
# Ajuste o caminho se o Dockerfile não estiver na raiz
COPY ml_service/ ./ml_service/

# Copie os modelos (Alternativa: buscar do GCS no código Python)
COPY ml_service/models/ ./ml_service/models/

# Informe ao Docker qual porta seu serviço Python ouvirá (ex: 8080 para Cloud Run)
EXPOSE 8080

# Comando para iniciar seu serviço Python (Adapte com seu entrypoint e framework)
# Exemplo para FastAPI com Uvicorn (substitua ml_service.main:app)
CMD ["uvicorn", "ml_service.main:app", "--host", "0.0.0.0", "--port", "8080"]
# Exemplo para Flask com Gunicorn (substitua ml_service.predict:app)
# CMD ["gunicorn", "-b", "0.0.0.0:8080", "ml_service.predict:app"]
