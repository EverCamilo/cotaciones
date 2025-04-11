#!/bin/bash
# Script para executar o enriquecimento de dados de ML
# IMPORTANTE: Este script deve ser executado APENAS no ambiente Replit

echo "Enriquecimento de dados para o modelo ML"
echo "IMPORTANTE: Este script gera dados sintéticos APENAS para treinamento local"
echo "Os dados gerados NÃO devem ser usados em produção"
echo "====================================================="

# Verifica se estamos no ambiente Replit
if [ -z "$REPL_ID" ]; then
  echo "ERRO: Este script deve ser executado apenas no ambiente Replit"
  exit 1
fi

# Cria diretório para modelo se não existir
mkdir -p ml_service/models

# Executa o script de enriquecimento
echo "Iniciando enriquecimento de dados..."
python3 ml_service/enrich_training_data.py

# Verifica se o modelo foi gerado com sucesso
if [ -f "ml_service/models/enhanced_gb_model.pkl" ]; then
  echo "✅ Modelo enriquecido gerado com sucesso!"
  echo "  - Modelo: ml_service/models/enhanced_gb_model.pkl"
  echo "  - Scaler: ml_service/models/enhanced_gb_scaler.pkl"
  echo "  - Metadados: ml_service/models/enhanced_gb_model_metadata.json"
  echo "  - Dados enriquecidos: ml_service/enriched_data.csv"
  echo ""
  echo "Para usar o modelo enriquecido, altere a referência no ml_service/predict.py"
  echo "para usar 'enhanced_gb_model.pkl' em vez de 'gb_model.pkl'"
else
  echo "❌ Falha ao gerar o modelo enriquecido"
  exit 1
fi