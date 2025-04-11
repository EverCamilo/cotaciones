"""
Script para testar predição e similaridade com rotas existentes no conjunto de dados.
"""

import sys
import os
import pandas as pd
import numpy as np
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml_service.predict import predict_freight_price, load_historical_data
from ml_service.data_processor import find_similar_routes
from geopy.distance import geodesic

def main():
    """Testa predições em rotas existentes no conjunto de dados."""
    print("=== Teste com Rotas Existentes nos Dados ===")
    
    # Carrega dados históricos
    historical_data = load_historical_data()
    
    # Extrai coordenadas únicas de origem e destino (top 5 mais comuns)
    common_origins = historical_data.groupby(['Lat_Origem', 'Lng_Origem']).size().reset_index().rename(columns={0: 'count'})
    common_origins = common_origins.sort_values('count', ascending=False).head(5)
    
    common_destinations = historical_data.groupby(['Lat_Destino', 'Lng_Destino']).size().reset_index().rename(columns={0: 'count'})
    common_destinations = common_destinations.sort_values('count', ascending=False).head(5)
    
    print("\nOrigens mais comuns para teste:")
    for i, row in common_origins.iterrows():
        print(f"{i+1}. {row['Lat_Origem']}, {row['Lng_Origem']} - {row['count']} ocorrências")
    
    print("\nDestinos mais comuns para teste:")
    for i, row in common_destinations.iterrows():
        print(f"{i+1}. {row['Lat_Destino']}, {row['Lng_Destino']} - {row['count']} ocorrências")
    
    # Seleciona as 3 rotas mais comuns para teste
    common_routes = historical_data.groupby(['Lat_Origem', 'Lng_Origem', 'Lat_Destino', 'Lng_Destino']).agg({
        'Frete Carreteiro': ['mean', 'count'],
        'KM': 'mean'
    }).reset_index()
    common_routes.columns = ['Lat_Origem', 'Lng_Origem', 'Lat_Destino', 'Lng_Destino', 'Frete_Medio', 'Count', 'KM_Medio']
    common_routes = common_routes.sort_values('Count', ascending=False).head(3)
    
    print("\n=== Testando rotas mais comuns ===")
    for i, row in common_routes.iterrows():
        # Extrai as coordenadas e distância média
        origem_lat = row['Lat_Origem']
        origem_lng = row['Lng_Origem']
        destino_lat = row['Lat_Destino']
        destino_lng = row['Lng_Destino']
        km = row['KM_Medio']
        preco_real = row['Frete_Medio']
        
        print(f"\n{i+1}. Rota: ({origem_lat}, {origem_lng}) → ({destino_lat}, {destino_lng})")
        print(f"   Distância média: {km:.1f} km")
        print(f"   Preço médio real: R$ {preco_real:.2f}")
        print(f"   Ocorrências: {row['Count']}")
        
        # Encontra rotas similares
        similares = find_similar_routes(
            origem_lat, origem_lng, destino_lat, destino_lng,
            historical_data, radius_km=50
        )
        
        print(f"   Rotas similares encontradas: {len(similares)}")
        if not similares.empty:
            for j, rota in similares.head(3).iterrows():
                print(f"   - Similar {j+1}: R$ {rota['Frete Carreteiro']:.2f}, {rota['KM']} km, Score: {rota['similarity_score']:.1f}/100")
        
        # Faz predição
        resultado = predict_freight_price(origem_lat, origem_lng, destino_lat, destino_lng, km, mes=4)
        
        if resultado.get("error", False):
            print(f"   ERRO NA PREDIÇÃO: {resultado.get('message', 'Erro desconhecido')}")
        else:
            print(f"   Predição: R$ {resultado['prediction']:.2f}")
            print(f"   Confiança: {resultado['confidence_pct']}%")
            print(f"   Método: {resultado['method']}")
            print(f"   Erro relativo: {abs(resultado['prediction'] - preco_real) / preco_real * 100:.2f}%")
    
    # Testar variações pequenas das coordenadas para ver o impacto na predição
    print("\n=== Testando variações de coordenadas ===")
    # Pega a primeira rota comum
    row = common_routes.iloc[0]
    origem_lat = row['Lat_Origem']
    origem_lng = row['Lng_Origem']
    destino_lat = row['Lat_Destino']
    destino_lng = row['Lng_Destino']
    km = row['KM_Medio']
    
    print(f"Rota base: ({origem_lat}, {origem_lng}) → ({destino_lat}, {destino_lng})")
    print(f"Testando variações de coordenadas (deslocamento em km):")
    
    # Teste de variações
    variations = [0.1, 1, 5, 10, 25, 50]
    
    for var_km in variations:
        # Calcula o deslocamento em graus (aproximado)
        # 1 grau de latitude ≈ 111 km
        lat_var = var_km / 111
        
        # 1 grau de longitude varia com a latitude, mas cerca de 111*cos(lat) km no equador
        lng_var = var_km / (111 * np.cos(np.radians(origem_lat)))
        
        # Varia a origem
        var_orig_lat = origem_lat + lat_var
        var_orig_lng = origem_lng
        
        # Distância em km entre a origem original e a variada
        dist = geodesic((origem_lat, origem_lng), (var_orig_lat, var_orig_lng)).kilometers
        
        print(f"\nVariação de {var_km:.1f} km na origem:")
        print(f"  Original: ({origem_lat}, {origem_lng})")
        print(f"  Variação: ({var_orig_lat}, {var_orig_lng})")
        print(f"  Distância real: {dist:.2f} km")
        
        # Busca rotas similares para a rota variada
        similares = find_similar_routes(
            var_orig_lat, var_orig_lng, destino_lat, destino_lng,
            historical_data, radius_km=50
        )
        
        print(f"  Rotas similares encontradas: {len(similares)}")
        
        # Predição para a rota variada
        resultado = predict_freight_price(var_orig_lat, var_orig_lng, destino_lat, destino_lng, km, mes=4)
        
        if resultado.get("error", False):
            print(f"  ERRO: {resultado.get('message', 'Erro desconhecido')}")
        else:
            print(f"  Predição: R$ {resultado['prediction']:.2f}, Método: {resultado['method']}")

if __name__ == "__main__":
    main()