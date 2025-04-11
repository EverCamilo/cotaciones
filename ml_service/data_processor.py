"""
Módulo para processamento de dados para o sistema de ML.
Fornece funções para preparação e transformação dos dados para predição.
"""

import pandas as pd
import numpy as np
from geopy.distance import geodesic

def find_similar_routes(lat_origem, lng_origem, lat_destino, lng_destino, historical_data, radius_km=50):
    """
    Encontra rotas similares considerando um raio de 50km ao redor das coordenadas de origem e destino.
    
    Args:
        lat_origem (float): Latitude da origem
        lng_origem (float): Longitude da origem
        lat_destino (float): Latitude do destino
        lng_destino (float): Longitude do destino
        historical_data (DataFrame): DataFrame com os dados históricos
        radius_km (int): Raio em km para busca (default: 50)
        
    Returns:
        DataFrame: DataFrame com rotas similares encontradas e pontuação de similaridade
    """
    if historical_data.empty:
        return pd.DataFrame()
    
    # Converte para coordenadas
    origem_coord = (lat_origem, lng_origem)
    destino_coord = (lat_destino, lng_destino)
    
    # Cria cópia dos dados para manipulação
    df = historical_data.copy()
    
    # Coordenadas na base de dados
    df['origem_coord'] = list(zip(df['Lat_Origem'], df['Lng_Origem']))
    df['destino_coord'] = list(zip(df['Lat_Destino'], df['Lng_Destino']))
    
    # Calcula distâncias para origem e destino
    df['distancia_origem'] = df['origem_coord'].apply(lambda x: geodesic(origem_coord, x).kilometers)
    df['distancia_destino'] = df['destino_coord'].apply(lambda x: geodesic(destino_coord, x).kilometers)
    
    # Filtra por raio (50km)
    df_filtrado = df[(df['distancia_origem'] <= radius_km) & (df['distancia_destino'] <= radius_km)].copy()
    
    if df_filtrado.empty:
        return pd.DataFrame()
    
    # Calcula pontuação de similaridade (maior para rotas mais próximas)
    # Pontuação máxima: 100 (exatamente a mesma rota)
    
    # Fator de decaimento para distância - dá maior peso para rotas mais próximas
    # Usando .loc para evitar SettingWithCopyWarning
    df_filtrado.loc[:, 'score_origem'] = (1 - df_filtrado['distancia_origem'] / radius_km) * 50  # Máximo 50 pontos
    df_filtrado.loc[:, 'score_destino'] = (1 - df_filtrado['distancia_destino'] / radius_km) * 50  # Máximo 50 pontos
    df_filtrado.loc[:, 'similarity_score'] = df_filtrado['score_origem'] + df_filtrado['score_destino']
    
    # Ordena por maior similaridade
    resultado = df_filtrado.sort_values('similarity_score', ascending=False)
    
    # Retorna apenas as colunas relevantes
    return resultado[['Frete Carreteiro', 'KM', 'Mês', 'distancia_origem', 'distancia_destino', 'similarity_score']]

def get_most_similar_price(lat_origem, lng_origem, lat_destino, lng_destino, historical_data, radius_km=50):
    """
    Obtém o preço mais similar com base nas coordenadas.
    
    Args:
        lat_origem (float): Latitude da origem
        lng_origem (float): Longitude da origem
        lat_destino (float): Latitude do destino
        lng_destino (float): Longitude do destino
        historical_data (DataFrame): DataFrame com os dados históricos
        radius_km (int): Raio em km para busca (default: 50)
        
    Returns:
        float: Preço recomendado (ou None se não encontrar)
        dict: Detalhes da recomendação
    """
    rotas_similares = find_similar_routes(
        lat_origem, lng_origem, lat_destino, lng_destino, 
        historical_data, radius_km
    )
    
    if rotas_similares.empty:
        return None, {
            "confidence": 0,
            "num_routes": 0,
            "message": "Nenhuma rota similar encontrada"
        }
    
    # Pesos ponderados pela similaridade
    pesos = rotas_similares['similarity_score'] / rotas_similares['similarity_score'].sum()
    preco_recomendado = (rotas_similares['Frete Carreteiro'] * pesos).sum()
    
    # Calcula confiança baseada no número de rotas e scores
    num_rotas = len(rotas_similares)
    score_medio = rotas_similares['similarity_score'].mean()
    
    # Fatores de confiança:
    # 1. Número de rotas (mais é melhor)
    # 2. Score médio (mais alto é melhor)
    confianca_n_rotas = min(num_rotas / 10, 1.0)  # Saturando em 10+ rotas
    confianca_score = score_medio / 100  # Score máximo é 100
    
    # Confiança geral (média ponderada)
    confianca = (confianca_n_rotas * 0.4) + (confianca_score * 0.6)
    confianca = min(confianca, 1.0)  # Limita a 100%
    
    # Arredonda para o múltiplo de 5 mais próximo
    preco_recomendado = round(preco_recomendado / 5) * 5
    
    return preco_recomendado, {
        "confidence": confianca,
        "confidence_pct": round(confianca * 100, 1),
        "num_routes": num_rotas,
        "avg_similarity": round(score_medio, 1),
        "price_basis": "similar_routes",
        "message": f"Preço baseado em {num_rotas} rota(s) similar(es) num raio de {radius_km}km",
        "similar_routes": rotas_similares.head(5).to_dict('records')
    }

def prepare_data_for_model(df, features_list):
    """
    Prepara os dados para serem usados no modelo de ML.
    
    Args:
        df (DataFrame): DataFrame com os dados
        features_list (list): Lista de features a serem utilizadas
        
    Returns:
        DataFrame: DataFrame com os dados preparados
    """
    X = df[features_list]
    return X

def explain_prediction(prediction, details, df_input):
    """
    Gera uma explicação da predição em linguagem natural.
    
    Args:
        prediction (float): Valor predito pelo modelo
        details (dict): Detalhes da predição
        df_input (DataFrame): Dados de entrada
        
    Returns:
        str: Explicação da predição
    """
    if details["confidence"] < 0.5:
        confianca_texto = "baixa"
    elif details["confidence"] < 0.8:
        confianca_texto = "moderada"
    else:
        confianca_texto = "alta"
    
    msg = (
        f"Preço recomendado: R$ {prediction:.2f}\n"
        f"Confiança: {details['confidence_pct']}% ({confianca_texto})\n"
        f"Baseado em {details['num_routes']} rota(s) similar(es) dentro de um raio de 50km\n"
    )
    
    if details["num_routes"] > 0:
        rota_mais_similar = details["similar_routes"][0]
        msg += (
            f"Rota mais similar:\n"
            f"- Distância origem: {rota_mais_similar['distancia_origem']:.1f}km\n"
            f"- Distância destino: {rota_mais_similar['distancia_destino']:.1f}km\n"
            f"- Valor frete: R$ {rota_mais_similar['Frete Carreteiro']:.2f}\n"
            f"- Similaridade: {rota_mais_similar['similarity_score']:.1f}/100\n"
        )
    
    return msg