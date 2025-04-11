"""
Script para testar o algoritmo de predição com coordenadas não existentes no banco.
Foca em manter taxa de confiança estável mesmo para rotas desconhecidas.
"""

import sys
import os
import pandas as pd
import numpy as np
from tabulate import tabulate
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml_service.improved_prediction import predict_with_high_confidence
from ml_service.predict import load_historical_data
from geopy.distance import geodesic

def find_unknown_coordinate_variations(historical_data, quantidade=3):
    """
    Encontra coordenadas que não existem no banco de dados, mas estão próximas 
    de coordenadas existentes em diferentes distâncias.
    """
    # Encontra as origens mais comuns
    top_origins = historical_data.groupby(['Lat_Origem', 'Lng_Origem']).size().nlargest(3)
    top_origins = top_origins.reset_index()
    
    # Encontra os destinos mais comuns
    top_destinations = historical_data.groupby(['Lat_Destino', 'Lng_Destino']).size().nlargest(3)
    top_destinations = top_destinations.reset_index()
    
    # Lista para armazenar variações de coordenadas
    variations = []
    
    # Cria variações em diferentes distâncias (5km, 10km, 25km, 50km, 100km)
    distances_km = [5, 10, 25, 50, 100]
    
    # Para cada origem e distância
    for idx, row in top_origins.iterrows():
        origem_lat = row['Lat_Origem']
        origem_lng = row['Lng_Origem']
        
        # Seleciona destino da mesma posição no índice (evitando repetições)
        if idx < len(top_destinations):
            dest_row = top_destinations.iloc[idx]
            destino_lat = dest_row['Lat_Destino']
            destino_lng = dest_row['Lng_Destino']
            
            # Encontra a distância real desta rota
            original_distance = geodesic(
                (origem_lat, origem_lng), (destino_lat, destino_lng)
            ).kilometers
            
            # Para cada variação de distância
            for dist_km in distances_km:
                # Variação na latitude (aproximadamente 0.01 graus = 1.11km)
                # 1 grau de latitude ≈ 111km
                lat_variation = dist_km / 111
                
                # Cria novas coordenadas deslocadas
                new_origem_lat = origem_lat + lat_variation
                
                # Verifica se esta origem já existe no banco
                exists = any(
                    (abs(historical_data['Lat_Origem'] - new_origem_lat) < 0.001) & 
                    (abs(historical_data['Lng_Origem'] - origem_lng) < 0.001)
                )
                
                if not exists:
                    # Calcula distância real do deslocamento
                    real_dist = geodesic(
                        (origem_lat, origem_lng), (new_origem_lat, origem_lng)
                    ).kilometers
                    
                    variations.append({
                        "orig_lat": origem_lat,
                        "orig_lng": origem_lng,
                        "new_lat": new_origem_lat,
                        "new_lng": origem_lng,
                        "dest_lat": destino_lat,
                        "dest_lng": destino_lng,
                        "real_distance": real_dist,
                        "route_km": original_distance,
                        "target_variation": dist_km
                    })
    
    return variations[:quantidade]

def test_unknown_coordinates():
    """Testa o algoritmo com coordenadas que não existem no banco de dados."""
    print("=== Teste de Coordenadas Não Existentes ===")
    
    # Carrega dados históricos
    historical_data = load_historical_data()
    
    # Encontra variações de coordenadas não existentes
    variations = find_unknown_coordinate_variations(historical_data)
    
    print(f"Encontradas {len(variations)} variações de coordenadas para teste")
    
    results = []
    
    # Testa cada variação
    for i, var in enumerate(variations):
        print(f"\n=== Teste {i+1}: Variação de {var['real_distance']:.1f}km da origem ===")
        print(f"Coordenadas originais: ({var['orig_lat']}, {var['orig_lng']}) → ({var['dest_lat']}, {var['dest_lng']})")
        print(f"Coordenadas novas: ({var['new_lat']}, {var['new_lng']}) → ({var['dest_lat']}, {var['dest_lng']})")
        print(f"Distância da rota: {var['route_km']:.1f}km")
        
        # Predição com coordenadas originais
        resultado_original = predict_with_high_confidence(
            var['orig_lat'], var['orig_lng'], var['dest_lat'], var['dest_lng'], var['route_km'], 4
        )
        
        # Predição com coordenadas novas
        resultado_novo = predict_with_high_confidence(
            var['new_lat'], var['new_lng'], var['dest_lat'], var['dest_lng'], var['route_km'], 4
        )
        
        # Exibe resultados
        print("\nResultado original:")
        if resultado_original.get("error", False):
            print(f"ERRO: {resultado_original.get('message', 'Erro desconhecido')}")
            pred_original = "N/A"
            conf_original = "N/A"
            metodo_original = "error"
        else:
            pred_original = f"R$ {resultado_original['prediction']:.2f}"
            conf_original = f"{resultado_original['confidence_pct']}%"
            metodo_original = resultado_original['method']
            print(f"Predição: {pred_original}")
            print(f"Confiança: {conf_original}")
            print(f"Método: {metodo_original}")
        
        print("\nResultado com coordenadas deslocadas:")
        if resultado_novo.get("error", False):
            print(f"ERRO: {resultado_novo.get('message', 'Erro desconhecido')}")
            pred_novo = "N/A"
            conf_novo = "N/A"
            metodo_novo = "error"
        else:
            pred_novo = f"R$ {resultado_novo['prediction']:.2f}"
            conf_novo = f"{resultado_novo['confidence_pct']}%"
            metodo_novo = resultado_novo['method']
            print(f"Predição: {pred_novo}")
            print(f"Confiança: {conf_novo}")
            print(f"Método: {metodo_novo}")
        
        # Armazena resultados para tabela comparativa
        results.append([
            f"{var['real_distance']:.1f}km",
            pred_original,
            conf_original,
            metodo_original,
            pred_novo,
            conf_novo,
            metodo_novo
        ])
    
    # Exibe tabela comparativa
    headers = [
        "Variação", "Pred. Original", "Conf. Original", "Método Original", 
        "Pred. Nova", "Conf. Nova", "Método Novo"
    ]
    print("\n=== Tabela Comparativa ===")
    print(tabulate(results, headers=headers, tablefmt='grid'))
    
    # Analisa estabilidade
    print("\n=== Análise de Estabilidade ===")
    
    erros = 0
    mudancas_metodo = 0
    
    for r in results:
        if r[4] == "N/A" or r[1] == "N/A":
            erros += 1
        if r[3] != r[6] and r[6] != "error" and r[3] != "error":
            mudancas_metodo += 1
    
    print(f"Coordenadas que resultaram em erro: {erros} de {len(results)}")
    print(f"Mudanças de método de predição: {mudancas_metodo} de {len(results)}")
    
    # Extrai confianças para análise
    confianças_originais = []
    confianças_novas = []
    
    for r in results:
        if r[2] != "N/A":
            confianças_originais.append(float(r[2].replace("%", "")))
        if r[5] != "N/A":
            confianças_novas.append(float(r[5].replace("%", "")))
    
    if confianças_originais and confianças_novas:
        média_original = np.mean(confianças_originais)
        média_nova = np.mean(confianças_novas)
        std_original = np.std(confianças_originais)
        std_nova = np.std(confianças_novas)
        
        print(f"Confiança média (original): {média_original:.1f}%")
        print(f"Confiança média (nova): {média_nova:.1f}%")
        print(f"Desvio padrão (original): {std_original:.1f}%")
        print(f"Desvio padrão (nova): {std_nova:.1f}%")
        
        # Diferença média percentual
        if média_original > 0:
            diff_pct = abs(média_original - média_nova) / média_original * 100
            print(f"Diferença média de confiança: {diff_pct:.1f}%")

def main():
    """Função principal."""
    test_unknown_coordinates()

if __name__ == "__main__":
    main()