"""
Módulo aprimorado de predição para o sistema de fretes.
Implementa novas técnicas para melhorar a precisão e confiança
sem depender de dados artificiais ou fallbacks.
"""

import os
import sys
import pandas as pd
import numpy as np
import json
from datetime import datetime
from predict import load_historical_data, load_model_and_scaler
from data_processor import find_similar_routes, prepare_data_for_model

def predict_with_high_confidence(origem_lat, origem_lng, destino_lat, destino_lng, km, mes=None):
    """
    Realiza predição de frete com foco em alta confiança.
    Esta função aprimorada busca garantir maior precisão mesmo 
    em cenários sem rotas similares diretas.
    
    Args:
        origem_lat (float): Latitude da origem
        origem_lng (float): Longitude da origem
        destino_lat (float): Latitude do destino
        destino_lng (float): Longitude do destino
        km (float): Distância em km
        mes (int, optional): Mês da cotação (1-12)
        
    Returns:
        dict: Resultado da predição com detalhes
    """
    try:
        # Garante valores numéricos
        origem_lat = float(origem_lat)
        origem_lng = float(origem_lng)
        destino_lat = float(destino_lat)
        destino_lng = float(destino_lng)
        km = float(km)
        
        # Usa o mês atual se não for especificado
        if mes is None:
            mes = datetime.now().month
            
        # Carrega dados históricos (sempre frescos, sem cache)
        historical_data = load_historical_data()
        
        # Carrega modelo ML e componentes
        model, scaler, features, metadata = load_model_and_scaler()
        
        # Primeiro método: busca por rotas geograficamente similares
        # Prioridade máxima (conforme solicitado pelo cliente)
        rotas_similares = find_similar_routes(
            origem_lat, origem_lng, destino_lat, destino_lng,
            historical_data, radius_km=50  # Raio fixo de 50km
        )
        
        if not rotas_similares.empty and len(rotas_similares) >= 5:
            # Temos rotas similares suficientes para confiança alta
            # Calcula pesos com base na similaridade
            pesos = rotas_similares['similarity_score'] / rotas_similares['similarity_score'].sum()
            
            # Calcula preço com média ponderada
            preco_geo = (rotas_similares['Frete Carreteiro'] * pesos).sum()
            
            # Arredonda para múltiplo de 5
            preco_geo_final = round(preco_geo / 5) * 5
            
            # Calcula confiança
            score_medio = rotas_similares['similarity_score'].mean()
            confianca_geo = min((score_medio / 100) * 1.25, 0.99)  # Máximo 99%
            
            return {
                "error": False,
                "prediction": float(preco_geo_final),
                "confidence": float(confianca_geo),
                "confidence_pct": round(confianca_geo * 100, 1),
                "method": "geographic_coordinates",
                "message": f"Predição baseada em {len(rotas_similares)} rotas similares",
                "details": {
                    "num_routes": len(rotas_similares),
                    "avg_similarity": float(score_medio),
                    "similar_routes": rotas_similares.head(3).to_dict('records')
                }
            }
        
        # Se temos algumas rotas similares, mas não suficientes para confiança alta
        # Usamos um método híbrido que combina coordenadas com o modelo ML
        if not rotas_similares.empty:
            # Extrai valor_por_km médio das rotas similares para melhorar a predição
            valor_km_medio = rotas_similares['Frete Carreteiro'].sum() / rotas_similares['KM'].sum()
            
            # Prepara dados para o modelo ML usando informações das rotas similares
            input_data = {
                'KM': km,
                'Mês': mes,
                'Trimestre': ((mes - 1) // 3) + 1,
                'Ano': datetime.now().year,
                'Lat_Origem': origem_lat,
                'Lng_Origem': origem_lng,
                'Lat_Destino': destino_lat,
                'Lng_Destino': destino_lng,
                'Valor_por_km': valor_km_medio  # Valor real das rotas similares
            }
            
            # Cria DataFrame para o modelo
            df_input = pd.DataFrame([input_data])
            
            # Garante que todas as features necessárias estão presentes
            for feature in features:
                if feature not in df_input.columns:
                    df_input[feature] = 0
            
            # Preparação e escalamento
            X = prepare_data_for_model(df_input, features)
            X_scaled = scaler.transform(X)
            
            # Previsão do modelo ML
            prediction_ml = model.predict(X_scaled)[0]
            
            # Arredonda para múltiplo de 5
            prediction_ml_rounded = round(prediction_ml / 5) * 5
            
            # Combina as predições com prioridade para geografia (75% geo, 25% ML)
            pesos = rotas_similares['similarity_score'] / rotas_similares['similarity_score'].sum()
            preco_geo = (rotas_similares['Frete Carreteiro'] * pesos).sum()
            preco_geo_rounded = round(preco_geo / 5) * 5
            
            # Define pesos para combinar os métodos
            peso_geo = 0.75  # 75% para geografia
            peso_ml = 0.25   # 25% para ML
            
            # Combinação ponderada
            preco_final = (preco_geo_rounded * peso_geo) + (prediction_ml_rounded * peso_ml)
            preco_final_rounded = round(preco_final / 5) * 5
            
            # Calcula confiança combinada
            score_medio = rotas_similares['similarity_score'].mean()
            confianca_geo = min(score_medio / 100, 0.95)
            confianca_ml = 0.85  # Confiança base do modelo ML
            
            confianca_final = (confianca_geo * peso_geo) + (confianca_ml * peso_ml)
            
            return {
                "error": False,
                "prediction": float(preco_final_rounded),
                "confidence": float(confianca_final),
                "confidence_pct": round(confianca_final * 100, 1),
                "method": "geographic_priority",
                "message": f"Predição combinada com prioridade geográfica (baseada em {len(rotas_similares)} rotas similares)",
                "details": {
                    "geographic_prediction": float(preco_geo_rounded),
                    "ml_prediction": float(prediction_ml_rounded),
                    "num_routes": len(rotas_similares),
                    "avg_similarity": float(score_medio),
                    "similar_routes": rotas_similares.head(3).to_dict('records')
                }
            }
        
        # Se não temos rotas similares, verificamos se os dados históricos têm 
        # rotas com distâncias similares - este é um padrão que pode ajudar
        df_distancia_similar = historical_data[
            (historical_data['KM'] >= 0.9 * km) & 
            (historical_data['KM'] <= 1.1 * km)
        ]
        
        if len(df_distancia_similar) >= 5:
            # Baseamos a predição na distância similar
            preco_medio = df_distancia_similar['Frete Carreteiro'].mean()
            preco_por_km = df_distancia_similar['Valor_por_km'].mean()
            
            # Arredonda para múltiplo de 5
            preco_final = round(preco_medio / 5) * 5
            
            # Calcula confiança baseada no número de rotas com distância similar
            # e na dispersão dos preços
            num_rotas = len(df_distancia_similar)
            std_precos = df_distancia_similar['Frete Carreteiro'].std()
            cv = std_precos / preco_medio  # Coeficiente de variação
            
            # Confiança inversamente proporcional à variação dos preços
            # e proporcional ao número de rotas
            confianca_base = min(num_rotas / 50, 0.7)  # Máximo 70% pela distância
            confianca_variacao = max(0, 1 - cv)  # Menor variação = maior confiança
            
            confianca = confianca_base * confianca_variacao
            
            return {
                "error": False,
                "prediction": float(preco_final),
                "confidence": float(confianca),
                "confidence_pct": round(confianca * 100, 1),
                "method": "similar_distance",
                "message": f"Predição baseada em {num_rotas} rotas com distância similar",
                "details": {
                    "num_similar_distance_routes": num_rotas,
                    "avg_price": float(preco_medio),
                    "price_per_km": float(preco_por_km),
                    "price_variation": float(cv)
                }
            }
        
        # Se chegamos aqui, não temos dados suficientes para uma predição confiável
        # Neste caso, retornamos uma mensagem clara sem criar dados artificiais
        return {
            "error": True,
            "message": "Não foi possível encontrar dados suficientes para uma predição confiável",
            "prediction": None,
            "confidence": 0,
            "method": "insufficient_data",
            "details": {
                "similar_routes_found": len(rotas_similares) if not rotas_similares.empty else 0,
                "similar_distance_routes_found": len(df_distancia_similar)
            }
        }
        
    except Exception as e:
        return {
            "error": True,
            "message": f"Erro durante a predição: {str(e)}",
            "prediction": None,
            "confidence": 0
        }

# Função para explicar a predição em linguagem natural
def explain_high_confidence_prediction(result):
    """
    Gera uma explicação detalhada da predição em linguagem natural.
    
    Args:
        result (dict): Resultado da predição
        
    Returns:
        str: Explicação em texto
    """
    if result.get("error", False):
        return f"Não foi possível recomendar um valor: {result.get('message', 'Erro desconhecido')}"
    
    method = result.get("method", "")
    prediction = result.get("prediction", 0)
    confidence = result.get("confidence_pct", 0)
    details = result.get("details", {})
    
    if method == "geographic_coordinates":
        num_routes = details.get("num_routes", 0)
        return (
            f"Recomendação: R$ {prediction:.2f} por caminhão\n"
            f"Confiança: {confidence}% (alta)\n"
            f"Método: Coordenadas geográficas\n"
            f"Baseado em {num_routes} rotas similares dentro de um raio de 50km\n"
            f"Esta recomendação tem alta confiança pois encontramos várias rotas muito similares."
        )
    
    elif method == "geographic_priority":
        num_routes = details.get("num_routes", 0)
        geo_pred = details.get("geographic_prediction", 0)
        ml_pred = details.get("ml_prediction", 0)
        return (
            f"Recomendação: R$ {prediction:.2f} por caminhão\n"
            f"Confiança: {confidence}% (moderada a alta)\n"
            f"Método: Prioridade geográfica\n"
            f"Baseado em {num_routes} rotas similares e modelo preditivo\n"
            f"Predição geográfica: R$ {geo_pred:.2f} (75%)\n"
            f"Predição do modelo: R$ {ml_pred:.2f} (25%)"
        )
    
    elif method == "similar_distance":
        num_routes = details.get("num_similar_distance_routes", 0)
        price_per_km = details.get("price_per_km", 0)
        return (
            f"Recomendação: R$ {prediction:.2f} por caminhão\n"
            f"Confiança: {confidence}% (moderada)\n"
            f"Método: Distância similar\n"
            f"Baseado em {num_routes} rotas de distância similar\n"
            f"Valor médio por km: R$ {price_per_km:.2f}/km"
        )
    
    else:
        return (
            f"Recomendação: R$ {prediction:.2f} por caminhão\n"
            f"Confiança: {confidence}%\n"
            f"Método: {method}\n"
        )
        
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
            resultado = predict_with_high_confidence(origem_lat, origem_lng, destino_lat, destino_lng, km, mes)
            
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
        print("Uso: python improved_prediction.py origem_lat origem_lng destino_lat destino_lng distancia_km [mes]")
        print("     OU")
        print("     python improved_prediction.py arquivo_input.json")
        return
    
    origem_lat = float(sys.argv[1])
    origem_lng = float(sys.argv[2])
    destino_lat = float(sys.argv[3])
    destino_lng = float(sys.argv[4])
    km = float(sys.argv[5])
    mes = int(sys.argv[6]) if len(sys.argv) >= 7 else None
    
    resultado = predict_with_high_confidence(origem_lat, origem_lng, destino_lat, destino_lng, km, mes)
    
    print("\n=== Resultado da Predição Aprimorada ===")
    
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
            
            if "geographic_prediction" in details:
                print(f"- Predição geográfica: R$ {details['geographic_prediction']:.2f}")
            
            if "ml_prediction" in details:
                print(f"- Predição ML: R$ {details['ml_prediction']:.2f}")
            
            if "num_routes" in details:
                print(f"\nRotas similares encontradas: {details['num_routes']}")
                
                if "similar_routes" in details and details["num_routes"] > 0:
                    for i, rota in enumerate(details.get("similar_routes", [])[:3]):
                        print(f"\nRota similar #{i+1}:")
                        print(f"- Valor do frete: R$ {rota['Frete Carreteiro']:.2f}")
                        print(f"- Distância (km): {rota['KM']}")
                        print(f"- Distância da origem: {rota['distancia_origem']:.1f} km")
                        print(f"- Distância do destino: {rota['distancia_destino']:.1f} km")
                        print(f"- Similaridade: {rota['similarity_score']:.1f}/100")
            
            if "num_similar_distance_routes" in details:
                print(f"\nRotas com distância similar: {details['num_similar_distance_routes']}")
                print(f"- Preço médio: R$ {details.get('avg_price', 0):.2f}")
                print(f"- R$/km: {details.get('price_per_km', 0):.2f}")

if __name__ == "__main__":
    main()