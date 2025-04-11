"""
Script para testar o algoritmo de predição aprimorado.
Foca em obter alta confiança em cenários diversos.
"""

import sys
import os
import pandas as pd
import numpy as np
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml_service.improved_prediction import predict_with_high_confidence, explain_high_confidence_prediction
from ml_service.predict import load_historical_data
from geopy.distance import geodesic

def test_common_route():
    """Testa a rota mais comum do conjunto de dados."""
    print("\n=== Teste com Rota Mais Comum ===")
    
    # Coordenadas da rota mais comum identificada na análise
    origem_lat = -24.48545
    origem_lng = -54.83175
    destino_lat = -24.72896
    destino_lng = -53.73445
    km = 219.0
    mes = 4
    preco_real = 115.11  # Preço médio real desta rota
    
    print(f"Rota: ({origem_lat}, {origem_lng}) → ({destino_lat}, {destino_lng})")
    print(f"Distância: {km} km")
    print(f"Preço médio real: R$ {preco_real:.2f}")
    
    resultado = predict_with_high_confidence(
        origem_lat, origem_lng, destino_lat, destino_lng, km, mes
    )
    
    print("\nResultado da predição:")
    
    if resultado.get("error", False):
        print(f"ERRO: {resultado.get('message', 'Erro desconhecido')}")
    else:
        prediction = resultado['prediction']
        confidence = resultado['confidence_pct']
        method = resultado['method']
        
        print(f"Predição: R$ {prediction:.2f}")
        print(f"Confiança: {confidence}%")
        print(f"Método: {method}")
        print(f"Erro relativo: {abs(prediction - preco_real) / preco_real * 100:.2f}%")
        
        # Exibe explicação
        print("\nExplicação para o usuário:")
        print(explain_high_confidence_prediction(resultado))
        
        # Exibe detalhes
        print("\nDetalhes técnicos:")
        for k, v in resultado.get("details", {}).items():
            if isinstance(v, list) and len(v) > 0:
                print(f"- {k}: {len(v)} itens")
                if k == "similar_routes" and len(v) > 0:
                    for i, route in enumerate(v[:2]):
                        print(f"  Rota {i+1}: R$ {route['Frete Carreteiro']:.2f}, Score: {route['similarity_score']:.1f}")
            else:
                print(f"- {k}: {v}")

def test_similar_route():
    """Testa uma rota similar, mas não idêntica a uma existente."""
    print("\n=== Teste com Rota Similar ===")
    
    # Cria uma variação pequena a partir da rota mais comum
    origem_lat = -24.48545 + 0.01  # Pequeno deslocamento
    origem_lng = -54.83175
    destino_lat = -24.72896
    destino_lng = -53.73445
    km = 219.0
    mes = 4
    
    # Calcula a distância real do deslocamento
    deslocamento_km = geodesic(
        (-24.48545, -54.83175), (origem_lat, origem_lng)
    ).kilometers
    
    print(f"Rota com deslocamento de {deslocamento_km:.2f}km na origem:")
    print(f"({origem_lat}, {origem_lng}) → ({destino_lat}, {destino_lng})")
    print(f"Distância da rota: {km} km")
    
    resultado = predict_with_high_confidence(
        origem_lat, origem_lng, destino_lat, destino_lng, km, mes
    )
    
    print("\nResultado da predição:")
    
    if resultado.get("error", False):
        print(f"ERRO: {resultado.get('message', 'Erro desconhecido')}")
    else:
        prediction = resultado['prediction']
        confidence = resultado['confidence_pct']
        method = resultado['method']
        
        print(f"Predição: R$ {prediction:.2f}")
        print(f"Confiança: {confidence}%")
        print(f"Método: {method}")
        
        # Exibe explicação
        print("\nExplicação para o usuário:")
        print(explain_high_confidence_prediction(resultado))

def test_distant_route():
    """Testa uma rota distante das existentes, mas com distância similar."""
    print("\n=== Teste com Rota Distante (Sem Similaridade Geográfica) ===")
    
    # Usamos coordenadas completamente diferentes
    # mas mantemos a distância similar a algumas rotas conhecidas
    origem_lat = -24.00  # Coordenadas inventadas, não similares
    origem_lng = -55.00
    destino_lat = -23.50
    destino_lng = -54.00
    km = 220.0  # Distância similar a rotas conhecidas
    mes = 4
    
    print(f"Rota: ({origem_lat}, {origem_lng}) → ({destino_lat}, {destino_lng})")
    print(f"Distância: {km} km (similar a rotas conhecidas)")
    
    resultado = predict_with_high_confidence(
        origem_lat, origem_lng, destino_lat, destino_lng, km, mes
    )
    
    print("\nResultado da predição:")
    
    if resultado.get("error", False):
        print(f"ERRO: {resultado.get('message', 'Erro desconhecido')}")
    else:
        prediction = resultado['prediction']
        confidence = resultado['confidence_pct']
        method = resultado['method']
        
        print(f"Predição: R$ {prediction:.2f}")
        print(f"Confiança: {confidence}%")
        print(f"Método: {method}")
        
        # Exibe explicação
        print("\nExplicação para o usuário:")
        print(explain_high_confidence_prediction(resultado))

def test_unknown_route():
    """Testa uma rota totalmente desconhecida."""
    print("\n=== Teste com Rota Totalmente Desconhecida ===")
    
    # Coordenadas e distância fora do escopo dos dados
    origem_lat = -27.00
    origem_lng = -58.00
    destino_lat = -29.00
    destino_lng = -60.00
    km = 1500.0  # Muito maior que as distâncias conhecidas
    mes = 4
    
    print(f"Rota: ({origem_lat}, {origem_lng}) → ({destino_lat}, {destino_lng})")
    print(f"Distância: {km} km (fora do escopo dos dados conhecidos)")
    
    resultado = predict_with_high_confidence(
        origem_lat, origem_lng, destino_lat, destino_lng, km, mes
    )
    
    print("\nResultado da predição:")
    
    if resultado.get("error", False):
        print(f"ERRO: {resultado.get('message', 'Erro desconhecido')}")
    else:
        prediction = resultado['prediction']
        confidence = resultado['confidence_pct']
        method = resultado['method']
        
        print(f"Predição: R$ {prediction:.2f}")
        print(f"Confiança: {confidence}%")
        print(f"Método: {method}")
        
        # Exibe explicação
        print("\nExplicação para o usuário:")
        print(explain_high_confidence_prediction(resultado))

def main():
    """Função principal para testes."""
    print("=== Testes do Algoritmo de Predição com Alta Confiança ===")
    
    # Testa com diferentes cenários
    test_common_route()    # Rota comum no dataset
    test_similar_route()   # Rota similar a uma existente
    test_distant_route()   # Rota distante geograficamente, mas com km similar
    test_unknown_route()   # Rota completamente desconhecida

if __name__ == "__main__":
    main()