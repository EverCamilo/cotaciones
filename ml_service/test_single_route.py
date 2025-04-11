"""
Script simplificado para testar apenas uma rota específica.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml_service.predict import predict_freight_price

def main():
    """Testa uma única rota específica."""
    print("=== Teste de Rota Específica ===")
    
    # Coordenadas da rota mais comum identificada
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
    print(f"Mês: {mes}")
    
    # Faz a predição usando o modelo ML
    print("\nRealizando predição...")
    resultado = predict_freight_price(origem_lat, origem_lng, destino_lat, destino_lng, km, mes)
    
    if resultado.get("error", False):
        print(f"ERRO: {resultado.get('message', 'Erro desconhecido')}")
    else:
        print(f"Predição: R$ {resultado['prediction']:.2f}")
        print(f"Confiança: {resultado['confidence_pct']}%")
        print(f"Método: {resultado['method']}")
        print(f"Erro relativo: {abs(resultado['prediction'] - preco_real) / preco_real * 100:.2f}%")
        
        # Detalhes adicionais
        print("\nDetalhes:")
        if "details" in resultado:
            details = resultado["details"]
            if "model_prediction" in details:
                print(f"- Predição do modelo ML: R$ {details['model_prediction']:.2f}")
            if "similarity_prediction" in details:
                print(f"- Predição por similaridade: R$ {details['similarity_prediction']:.2f}")
            if "num_routes" in details:
                print(f"- Rotas similares encontradas: {details['num_routes']}")

if __name__ == "__main__":
    main()