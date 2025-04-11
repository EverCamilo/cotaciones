"""
Script para treinar o modelo de ML com dados reais de frete entre Brasil e Paraguai.
Este script utiliza apenas os dados históricos reais sem adaptações ou enriquecimentos artificiais.
"""

import os
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
import joblib
import json

# Configurações
CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'attached_assets', 'Libro3_utf8.csv')
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models', 'gb_model.pkl')
SCALER_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models', 'gb_scaler.pkl') 
METADATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models', 'gb_model_metadata.json')

def load_data():
    """Carrega e processa os dados do CSV original."""
    print(f"Carregando dados de: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH, sep=';')
    df['Frete Carreteiro'] = pd.to_numeric(df['Frete Carreteiro'], errors='coerce')
    df = df.dropna()
    
    # Extrai mês da data
    df['Mês'] = pd.to_datetime(df['Data Saída'], dayfirst=True).dt.month
    
    # Extrai coordenadas
    df['Lat_Origem'] = df['ORIGEN'].str.split(',').str[0].str.strip().astype(float)
    df['Lng_Origem'] = df['ORIGEN'].str.split(',').str[1].str.strip().astype(float)
    df['Lat_Destino'] = df['DESTINO'].str.split(',').str[0].str.strip().astype(float)
    df['Lng_Destino'] = df['DESTINO'].str.split(',').str[1].str.strip().astype(float)
    
    # Adiciona trimestre e ano
    df['Trimestre'] = ((df['Mês'] - 1) // 3) + 1
    df['Ano'] = pd.to_datetime(df['Data Saída'], dayfirst=True).dt.year
    
    # Adiciona R$ por km
    df['Valor_por_km'] = df['Frete Carreteiro'] / df['KM']
    
    print(f"Dados carregados: {len(df)} registros")
    return df

def train_model(df):
    """Treina o modelo com dados reais."""
    print("Treinando modelo com dados reais...")
    
    # Preparação de dados - foco em coordenadas geográficas conforme solicitado
    # Define características para o modelo
    features = ['KM', 'Mês', 'Trimestre', 'Ano', 'Lat_Origem', 'Lng_Origem', 'Lat_Destino', 'Lng_Destino', 'Valor_por_km']
    
    # Prepara dados para treinamento
    X = df[features]
    y = df['Frete Carreteiro']
    
    # Divisão treino/teste
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Normaliza os dados
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Treina RandomForest e GradientBoosting para comparar
    models = {
        'RandomForest': RandomForestRegressor(n_estimators=100, random_state=42),
        'GradientBoosting': GradientBoostingRegressor(n_estimators=100, random_state=42)
    }
    
    best_model = None
    best_r2 = -float('inf')
    best_model_name = None
    best_model_metrics = {}
    
    for name, model in models.items():
        # Treina o modelo
        model.fit(X_train_scaled, y_train)
        
        # Avalia no conjunto de teste
        y_pred = model.predict(X_test_scaled)
        r2 = r2_score(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        mae = mean_absolute_error(y_test, y_pred)
        cv_rmse = np.sqrt(-np.mean(cross_val_score(model, X_train_scaled, y_train, cv=5, 
                                                 scoring='neg_mean_squared_error')))
        
        # Calcula diferenças percentuais
        pct_diff = np.mean(np.abs((y_test - y_pred) / y_test)) * 100
        
        print(f"Modelo {name} - R²: {r2:.4f}, RMSE: {rmse:.2f}, MAE: {mae:.2f}, Diff%: {pct_diff:.2f}%")
        
        if r2 > best_r2:
            best_r2 = r2
            best_model = model
            best_model_name = name
            
            # Importância das features para o modelo
            # Converte valores numpy para Python nativo
            feature_names = [str(f) for f in features]
            feature_importances = [float(imp) for imp in model.feature_importances_]
            feature_importance = dict(zip(feature_names, feature_importances))
            
            print("Importância das features:")
            for feat, imp in sorted(feature_importance.items(), key=lambda x: x[1], reverse=True):
                print(f"  {feat}: {imp:.4f}")
            
            best_model_metrics = {
                'r2': float(r2),
                'rmse': float(rmse),
                'mae': float(mae),
                'cv_rmse': float(cv_rmse),
                'pct_diff': float(pct_diff / 100),  # Converte para decimal
                'feature_importance': feature_importance
            }
    
    print(f"Melhor modelo: {best_model_name} (R²: {best_r2:.4f})")
    
    # Salva o modelo e os metadados
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(best_model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    
    # Salva metadados
    metadata = {
        'model_type': best_model_name,
        'training_date': datetime.now().isoformat(),
        'metrics': best_model_metrics,
        'n_samples': int(len(df)),
        'features': list(features),  # Converte para lista Python padrão
        'coordinate_radius': 50,  # Raio para busca de cotações similares (em km)
        'model_description': 'Modelo natural com dados reais de frete'
    }
    
    # Função para converter qualquer valor numpy para tipo Python nativo
    def convert_numpy_types(obj):
        if isinstance(obj, dict):
            return {k: convert_numpy_types(v) for k, v in obj.items()}
        elif isinstance(obj, (list, tuple)):
            return [convert_numpy_types(item) for item in obj]
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        else:
            return obj
    
    # Converte todos os valores numpy para tipos Python nativos
    metadata = convert_numpy_types(metadata)
    
    with open(METADATA_PATH, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"Modelo salvo em: {MODEL_PATH}")
    print(f"Scaler salvo em: {SCALER_PATH}")
    print(f"Metadados salvos em: {METADATA_PATH}")
    
    return best_model, scaler, best_model_metrics

def main():
    """Função principal do script."""
    print("=== Treinamento de Modelo para Previsão de Fretes ===")
    
    # Carrega e processa dados reais
    df = load_data()
    
    # Treina modelo com dados reais
    best_model, scaler, metrics = train_model(df)
    
    print("\n=== Processamento concluído ===")
    print(f"Modelo salvo em: {MODEL_PATH}")

if __name__ == "__main__":
    main()