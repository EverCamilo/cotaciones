"""
Módulo de previsão para o sistema de fretes.
Utiliza modelo de ML natural para prever valores de frete com base em rotas históricas.
Implementação artesanal focada em precisão e confiabilidade.
"""

import os
import sys
import pandas as pd
import numpy as np
import json
from datetime import datetime
from joblib import load
from sklearn.ensemble import RandomForestRegressor
from data_processor import find_similar_routes, prepare_data_for_model, explain_prediction

# Configuração de caminhos
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'gb_model.pkl')
SCALER_PATH = os.path.join(MODEL_DIR, 'gb_scaler.pkl')
METADATA_PATH = os.path.join(MODEL_DIR, 'gb_model_metadata.json')
HISTORICAL_DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'attached_assets', 'Libro3_utf8.csv')

# Cache para dados históricos (carregado sob demanda)
_historical_data = None

def load_historical_data():
    """
    Carrega os dados históricos de frete diretamente do arquivo sem cache.
    Esta função sempre garante dados frescos sem dependência de cache.
    
    Returns:
        DataFrame: DataFrame com os dados históricos
    """
    print("Carregando dados históricos para predição...")
    try:
        df = pd.read_csv(HISTORICAL_DATA_PATH, sep=';')
        
        # Processa os dados
        df['Frete Carreteiro'] = pd.to_numeric(df['Frete Carreteiro'], errors='coerce')
        df = df.dropna(subset=['Frete Carreteiro'])
        
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
        
        print(f"Dados históricos carregados: {len(df)} registros")
        return df
    except Exception as e:
        print(f"Erro ao carregar dados históricos: {e}")
        raise ValueError("Impossível continuar sem dados históricos")

def load_model_and_scaler():
    """
    Carrega o modelo ML e o scaler para uso nas predições.
    
    Returns:
        tuple: (modelo, scaler, features, metadata)
    
    Raises:
        ValueError: Se o modelo não puder ser carregado
    """
    try:
        model = load(MODEL_PATH)
        scaler = load(SCALER_PATH)
        
        with open(METADATA_PATH, 'r') as file:
            metadata = json.load(file)
        
        features = metadata.get('features', [])
        
        print(f"Modelo '{metadata.get('model_type')}' carregado com sucesso")
        return model, scaler, features, metadata
    except Exception as e:
        print(f"Erro ao carregar modelo: {e}")
        raise ValueError(f"Impossível continuar sem o modelo ML: {str(e)}")

def get_most_similar_price(lat_origem, lng_origem, lat_destino, lng_destino, historical_data, radius_km=50):
    """
    Obtém o preço mais similar com base nas coordenadas, usando ponderação avançada
    que prioriza a localização geográfica sobre a distância.
    
    Args:
        lat_origem (float): Latitude da origem
        lng_origem (float): Longitude da origem
        lat_destino (float): Latitude do destino
        lng_destino (float): Longitude do destino
        historical_data (DataFrame): DataFrame com os dados históricos
        radius_km (int): Raio em km para busca (default: 50)
        
    Returns:
        float: Preço recomendado
        dict: Detalhes da recomendação
    """
    # Encontra rotas em um raio de 50km (valor fixo conforme solicitado)
    rotas_similares = find_similar_routes(
        lat_origem, lng_origem, lat_destino, lng_destino, 
        historical_data, radius_km=radius_km
    )
    
    if rotas_similares.empty:
        return None, {"confidence": 0, "num_routes": 0}
    
    # Pesos ponderados pela similaridade - quanto mais similar, mais peso
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

def predict_freight_price(origem_lat, origem_lng, destino_lat, destino_lng, km, mes=None, **kwargs):
    """
    Prediz o preço de frete para uma determinada rota usando um sistema de ML natural.
    Prioriza coordenadas geográficas e considera um raio de 50km ao redor dos pontos.
    
    Args:
        origem_lat (float): Latitude da origem
        origem_lng (float): Longitude da origem
        destino_lat (float): Latitude do destino
        destino_lng (float): Longitude do destino
        km (float): Distância em km
        mes (int, optional): Mês da cotação (1-12). Se None, usa o mês atual.
        **kwargs: Argumentos adicionais
        
    Returns:
        dict: Dicionário com a predição e detalhes
    """
    # Garante valores numéricos
    try:
        origem_lat = float(origem_lat)
        origem_lng = float(origem_lng)
        destino_lat = float(destino_lat)
        destino_lng = float(destino_lng)
        km = float(km)
    except (ValueError, TypeError) as e:
        return {
            "error": True,
            "message": f"Erro de conversão de dados: {str(e)}",
            "prediction": None,
            "confidence": 0
        }
    
    # Usa o mês atual se não for especificado
    if mes is None:
        mes = datetime.now().month
    
    try:
        # Carrega os componentes necessários para predição
        historical_data = load_historical_data()
        model, scaler, features, metadata = load_model_and_scaler()
        
        # Busca por rotas similares - ABORDAGEM PRINCIPAL
        rotas_similares = find_similar_routes(
            origem_lat, origem_lng, destino_lat, destino_lng, 
            historical_data, radius_km=50
        )
        
        # Prepara dados para o modelo ML
        input_data = {
            'KM': km,
            'Mês': mes,
            'Trimestre': ((mes - 1) // 3) + 1,
            'Ano': datetime.now().year,
            'Lat_Origem': origem_lat,
            'Lng_Origem': origem_lng,
            'Lat_Destino': destino_lat,
            'Lng_Destino': destino_lng,
            'Valor_por_km': 0  # Será calculado após a predição
        }
        
        # Cria DataFrame com dados de entrada
        df_input = pd.DataFrame([input_data])
        
        # Garante que todas as features necessárias estão presentes
        for feature in features:
            if feature not in df_input.columns:
                df_input[feature] = 0
        
        # Prepara dados para o modelo
        X = prepare_data_for_model(df_input, features)
        
        # Escala os dados
        X_scaled = scaler.transform(X)
        
        # Faz a predição
        prediction = model.predict(X_scaled)[0]
        
        # Arredonda para múltiplo de 5 mais próximo
        prediction_rounded = round(prediction / 5) * 5
        
        # Calcula Valor_por_km
        df_input['Valor_por_km'] = prediction_rounded / km
        
        # Se encontrou rotas similares, combina os resultados para maior precisão
        if not rotas_similares.empty:
            # Calcula recomendação baseada em rotas similares
            recommended_price, route_details = get_most_similar_price(
                origem_lat, origem_lng, destino_lat, destino_lng, 
                historical_data, radius_km=50
            )
            
            # Avalia a diferença entre as duas previsões
            diff_pct = abs(prediction_rounded - recommended_price) / max(prediction_rounded, recommended_price)
            
            # Determina a confiança do modelo
            model_confidence = 0.95  # Confiança padrão do modelo treinado
            
            # Média ponderada das confianças - prioriza coordenadas geográficas
            confidence_geo = route_details["confidence"]
            
            # Determina o preço final com base na confiança das coordenadas
            if confidence_geo >= 0.9:  # Prioridade máxima para coordenadas quando confiança é alta
                final_prediction = recommended_price
                final_confidence = confidence_geo
                method = "geographic_coordinates"
                source = "similar_routes"
            elif confidence_geo >= 0.7:  # Alta prioridade para coordenadas
                # Média ponderada com mais peso para coordenadas
                peso_geo = 0.8
                peso_model = 0.2
                final_prediction = round((recommended_price * peso_geo + prediction_rounded * peso_model) / 5) * 5
                final_confidence = (confidence_geo * peso_geo) + (model_confidence * peso_model)
                method = "combined_geo_priority"
                source = "combined"
            else:  # Prioridade equilibrada
                # Média ponderada com pesos iguais
                peso_geo = 0.5
                peso_model = 0.5
                final_prediction = round((recommended_price * peso_geo + prediction_rounded * peso_model) / 5) * 5
                final_confidence = (confidence_geo * peso_geo) + (model_confidence * peso_model)
                method = "combined_balanced"
                source = "combined"
            
            # Prepara detalhes completos
            combined_details = {
                "confidence": final_confidence,
                "confidence_pct": round(final_confidence * 100, 1),
                "model_confidence": model_confidence,
                "similarity_confidence": confidence_geo,
                "model_prediction": float(prediction_rounded),
                "similarity_prediction": float(recommended_price),
                "difference_pct": round(diff_pct * 100, 1),
                "similar_routes": route_details.get("similar_routes", []),
                "num_routes": route_details.get("num_routes", 0),
                "price_source": source,
                "message": f"Predição baseada em {route_details.get('num_routes', 0)} rota(s) similar(es) e modelo ML"
            }
        else:
            # Usando apenas o modelo ML quando não há rotas similares
            final_prediction = prediction_rounded
            final_confidence = 0.95  # Confiança padrão do modelo treinado
            method = "ml_model"
            source = "ml_model"
            
            combined_details = {
                "confidence": final_confidence,
                "confidence_pct": round(final_confidence * 100, 1),
                "model_prediction": float(prediction_rounded),
                "num_routes": 0,
                "price_source": source,
                "message": "Predição baseada no modelo ML"
            }
        
        # Gera explicação natural para a predição
        explain_text = explain_prediction(final_prediction, combined_details, df_input)
        
        return {
            "error": False,
            "prediction": float(final_prediction),
            "confidence": float(final_confidence),
            "confidence_pct": round(final_confidence * 100, 1),
            "message": explain_text,
            "details": combined_details,
            "method": method
        }
        
    except Exception as e:
        # Captura qualquer erro para fornecer feedback adequado
        return {
            "error": True,
            "message": f"Erro durante a predição: {str(e)}",
            "prediction": None,
            "confidence": 0
        }

def main():
    """
    Função principal para execução do script.
    Suporta dois modos de execução:
    1. Modo arquivo JSON: recebe um arquivo JSON como primeiro argumento
    2. Modo linha de comando: recebe parâmetros individuais
    """
    # Verifica se estamos no modo arquivo JSON (chamada do servidor)
    if len(sys.argv) >= 2 and os.path.exists(sys.argv[1]) and sys.argv[1].endswith('.json'):
        # Modo arquivo JSON - usado pelo servidor Node.js
        try:
            json_file_path = sys.argv[1]
            print(f"Processando arquivo de entrada: {json_file_path}")
            
            with open(json_file_path, 'r') as f:
                input_data = json.load(f)
            
            # Extrai as coordenadas e parâmetros essenciais
            origem_lat = float(input_data.get('originLat', 0))
            origem_lng = float(input_data.get('originLng', 0))
            destino_lat = float(input_data.get('destLat', 0))
            destino_lng = float(input_data.get('destLng', 0))
            km = float(input_data.get('totalDistance', 0))
            mes = int(input_data.get('month', datetime.now().month))
            
            # Realiza a predição
            resultado = predict_freight_price(origem_lat, origem_lng, destino_lat, destino_lng, km, mes)
            
            # Formata o resultado para o servidor
            server_result = {
                "success": not resultado.get("error", False),
                "recommendedPrice": resultado.get("prediction"),
                "confidence": resultado.get("confidence_pct", 0),
                "explanation": resultado.get("message", ""),
                "method": resultado.get("method", ""),
                "details": resultado.get("details", {})
            }
            
            if resultado.get("error", False):
                server_result["error"] = resultado.get("message", "Erro desconhecido")
            
            # Retorna o resultado como JSON
            print(json.dumps(server_result))
            return
            
        except Exception as e:
            error_result = {
                "success": False,
                "error": f"Erro ao processar arquivo JSON: {str(e)}"
            }
            print(json.dumps(error_result))
            return
    
    # Modo linha de comando para testes manuais
    if len(sys.argv) < 6:
        print("Uso: python predict.py origem_lat origem_lng destino_lat destino_lng distancia_km [mes]")
        print("     OU")
        print("     python predict.py arquivo_input.json [modelo]")
        return
    
    origem_lat = float(sys.argv[1])
    origem_lng = float(sys.argv[2])
    destino_lat = float(sys.argv[3])
    destino_lng = float(sys.argv[4])
    km = float(sys.argv[5])
    mes = int(sys.argv[6]) if len(sys.argv) >= 7 else None
    
    resultado = predict_freight_price(origem_lat, origem_lng, destino_lat, destino_lng, km, mes)
    
    print("\n=== Resultado da Predição ===")
    
    if resultado.get("error", False):
        print(f"ERRO: {resultado.get('message', 'Erro desconhecido')}")
    else:
        print(f"Predição: R$ {resultado['prediction']:.2f}")
        print(f"Confiança: {resultado['confidence_pct']}%")
        print(f"Método: {resultado['method']}")
        print(f"Mensagem: {resultado['message']}")
        
        if "details" in resultado:
            details = resultado["details"]
            print("\nDetalhes:")
            
            if "model_prediction" in details:
                print(f"- Predição do modelo ML: R$ {details['model_prediction']:.2f}")
            
            if "similarity_prediction" in details:
                print(f"- Predição por similaridade: R$ {details['similarity_prediction']:.2f}")
            
            if "difference_pct" in details:
                print(f"- Diferença percentual: {details['difference_pct']}%")
            
            if "num_routes" in details and details["num_routes"] > 0:
                print(f"\nRotas similares encontradas: {details['num_routes']}")
                
                for i, rota in enumerate(details.get("similar_routes", [])[:3]):
                    print(f"\nRota similar #{i+1}:")
                    print(f"- Valor do frete: R$ {rota['Frete Carreteiro']:.2f}")
                    print(f"- Distância (km): {rota['KM']}")
                    print(f"- Distância da origem: {rota['distancia_origem']:.1f} km")
                    print(f"- Distância do destino: {rota['distancia_destino']:.1f} km")
                    print(f"- Similaridade: {rota['similarity_score']:.1f}/100")

if __name__ == "__main__":
    main()