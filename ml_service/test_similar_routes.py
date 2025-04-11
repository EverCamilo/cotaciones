"""
Script para testar a busca por rotas similares no raio de 50km.
"""

import sys
import os
import pandas as pd
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml_service.data_processor import find_similar_routes
from ml_service.predict import load_historical_data

def main():
    """Teste de busca por rotas similares."""
    print("=== Teste de Busca por Rotas Similares (Raio 50km) ===")
    
    # Carrega dados históricos
    historical_data = load_historical_data()
    
    # Três pares de coordenadas para teste
    test_coords = [
        # Rota 1: Foz do Iguaçu - Ciudad del Este
        {
            'origem_lat': -25.5478, 'origem_lng': -54.5881,
            'destino_lat': -25.5144, 'destino_lng': -54.6110,
            'nome': "Foz do Iguaçu → Ciudad del Este"
        },
        # Rota 2: Assunção - São Paulo
        {
            'origem_lat': -25.2513, 'origem_lng': -57.5138,
            'destino_lat': -23.5505, 'destino_lng': -46.6333,
            'nome': "Assunção → São Paulo"
        },
        # Rota 3: Ciudad del Este - Paranaguá
        {
            'origem_lat': -25.5148, 'origem_lng': -54.6113,
            'destino_lat': -25.5162, 'destino_lng': -48.5055,
            'nome': "Ciudad del Este → Paranaguá"
        }
    ]
    
    # Testa cada par de coordenadas
    for i, coords in enumerate(test_coords):
        print(f"\n{i+1}. Rota: {coords['nome']}")
        print(f"   Origem: {coords['origem_lat']}, {coords['origem_lng']}")
        print(f"   Destino: {coords['destino_lat']}, {coords['destino_lng']}")
        
        # Busca rotas similares num raio de 50km
        similares = find_similar_routes(
            coords['origem_lat'], coords['origem_lng'],
            coords['destino_lat'], coords['destino_lng'],
            historical_data, radius_km=50
        )
        
        # Mostra resultados
        if similares.empty:
            print("   RESULTADO: Nenhuma rota similar encontrada no raio de 50km")
        else:
            print(f"   RESULTADO: {len(similares)} rota(s) similar(es) encontrada(s)")
            # Mostra as 3 rotas mais similares
            for j, rota in similares.head(3).iterrows():
                print(f"   - Rota {j+1}: Similaridade {rota['similarity_score']:.1f}/100, Frete R$ {rota['Frete Carreteiro']:.2f}")
                print(f"     Distância da origem: {rota['distancia_origem']:.1f}km, do destino: {rota['distancia_destino']:.1f}km")
    
    # Teste com diferentes raios para a rota Assunção - São Paulo
    print("\n=== Teste com diferentes raios para Assunção → São Paulo ===")
    coords = test_coords[1]
    for radius in [10, 30, 50, 100, 150]:
        similares = find_similar_routes(
            coords['origem_lat'], coords['origem_lng'],
            coords['destino_lat'], coords['destino_lng'],
            historical_data, radius_km=radius
        )
        
        count = len(similares)
        print(f"Raio {radius}km: {count} rota(s) encontrada(s)")

if __name__ == "__main__":
    main()