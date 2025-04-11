"""
Script para testar a predição de fretes usando o sistema natural de ML.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml_service.predict import predict_freight_price

def main():
    """Teste de predição de frete."""
    print("=== Teste de Predição de Frete com ML Natural ===")
    
    # Coordenadas de teste - rota entre Foz do Iguaçu e Ciudad del Este
    origem_lat = -25.5478
    origem_lng = -54.5881
    destino_lat = -25.5144
    destino_lng = -54.6110
    km = 15
    mes = 4  # Abril
    
    print(f"Origem: {origem_lat}, {origem_lng}")
    print(f"Destino: {destino_lat}, {destino_lng}")
    print(f"Distância: {km} km")
    print(f"Mês: {mes}")
    print("\nExecutando predição...")
    
    resultado = predict_freight_price(origem_lat, origem_lng, destino_lat, destino_lng, km, mes)
    
    if resultado.get("error", False):
        print(f"\nERRO: {resultado.get('message', 'Erro desconhecido')}")
    else:
        print(f"\nPredição: R$ {resultado['prediction']:.2f}")
        print(f"Confiança: {resultado['confidence_pct']}%")
        print(f"Método: {resultado['method']}")
        print(f"Detalhes: {resultado['message']}")

    # Outra rota - mais longa
    print("\n=== Outra rota - mais longa ===")
    origem_lat = -25.2513
    origem_lng = -57.5138
    destino_lat = -23.5505
    destino_lng = -46.6333
    km = 1154
    
    print(f"Origem: {origem_lat}, {origem_lng} (Assunção)")
    print(f"Destino: {destino_lat}, {destino_lng} (São Paulo)")
    print(f"Distância: {km} km")
    print(f"Mês: {mes}")
    print("\nExecutando predição...")
    
    resultado = predict_freight_price(origem_lat, origem_lng, destino_lat, destino_lng, km, mes)
    
    if resultado.get("error", False):
        print(f"\nERRO: {resultado.get('message', 'Erro desconhecido')}")
    else:
        print(f"\nPredição: R$ {resultado['prediction']:.2f}")
        print(f"Confiança: {resultado['confidence_pct']}%")
        print(f"Método: {resultado['method']}")
        print(f"Detalhes: {resultado['message']}")

if __name__ == "__main__":
    main()