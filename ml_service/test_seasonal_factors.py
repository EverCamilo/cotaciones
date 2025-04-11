"""
Script para testar o comportamento sazonal do modelo de predição.
Verifica como o mês do ano influencia as previsões de preço.
"""

import sys
import os
import pandas as pd
import numpy as np
from tabulate import tabulate
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml_service.improved_prediction import predict_with_high_confidence
from ml_service.predict import load_historical_data

def test_monthly_variation():
    """Testa a variação mensal para uma mesma rota."""
    print("\n=== Teste de Variação Sazonal (Mensal) ===")
    
    # Usamos a rota mais comum para este teste
    origem_lat = -24.48545
    origem_lng = -54.83175
    destino_lat = -24.72896
    destino_lng = -53.73445
    km = 219.0
    
    print(f"Rota: ({origem_lat}, {origem_lng}) → ({destino_lat}, {destino_lng})")
    print(f"Distância: {km} km")
    print(f"Testando a mesma rota em diferentes meses do ano...")
    
    # Carrega dados históricos para análise
    historical_data = load_historical_data()
    
    # Analisa variação mensal nos dados históricos para esta rota
    similar_routes = historical_data[
        (abs(historical_data['Lat_Origem'] - origem_lat) < 0.01) &
        (abs(historical_data['Lng_Origem'] - origem_lng) < 0.01) &
        (abs(historical_data['Lat_Destino'] - destino_lat) < 0.01) &
        (abs(historical_data['Lng_Destino'] - destino_lng) < 0.01)
    ]
    
    if not similar_routes.empty:
        print(f"\nDados históricos para esta rota:")
        monthly_stats = similar_routes.groupby('Mês')['Frete Carreteiro'].agg(['mean', 'count']).reset_index()
        monthly_stats.columns = ['Mês', 'Preço Médio', 'Quantidade']
        monthly_stats['Preço Médio'] = monthly_stats['Preço Médio'].round(2)
        print(tabulate(monthly_stats, headers='keys', tablefmt='grid'))
    
    # Resultados para cada mês
    results = []
    
    for mes in range(1, 13):
        resultado = predict_with_high_confidence(
            origem_lat, origem_lng, destino_lat, destino_lng, km, mes
        )
        
        if not resultado.get("error", False):
            prediction = resultado['prediction']
            confidence = resultado['confidence_pct']
            method = resultado['method']
            
            results.append([
                mes, 
                f"R$ {prediction:.2f}", 
                f"{confidence}%", 
                method
            ])
    
    # Exibe resultados em formato de tabela
    headers = ["Mês", "Predição", "Confiança", "Método"]
    print("\nVariação sazonal de preços:")
    print(tabulate(results, headers=headers, tablefmt='grid'))
    
    # Calcula e exibe a variação percentual
    predictions = [float(row[1].replace("R$ ", "")) for row in results]
    min_price = min(predictions)
    max_price = max(predictions)
    avg_price = np.mean(predictions)
    
    variation_pct = ((max_price - min_price) / avg_price) * 100
    
    print(f"\nAnálise da variação sazonal:")
    print(f"Preço mínimo: R$ {min_price:.2f}")
    print(f"Preço máximo: R$ {max_price:.2f}")
    print(f"Preço médio: R$ {avg_price:.2f}")
    print(f"Variação percentual: {variation_pct:.1f}%")
    
    # Identifica trimestres de alta e baixa
    q1 = np.mean([predictions[0], predictions[1], predictions[2]])
    q2 = np.mean([predictions[3], predictions[4], predictions[5]])
    q3 = np.mean([predictions[6], predictions[7], predictions[8]])
    q4 = np.mean([predictions[9], predictions[10], predictions[11]])
    
    print(f"\nPreço médio por trimestre:")
    print(f"Q1 (Jan-Mar): R$ {q1:.2f}")
    print(f"Q2 (Abr-Jun): R$ {q2:.2f}")
    print(f"Q3 (Jul-Set): R$ {q3:.2f}")
    print(f"Q4 (Out-Dez): R$ {q4:.2f}")

def test_quarterly_variation_multiple_routes():
    """Analisa variação trimestral em várias rotas populares."""
    print("\n=== Teste de Variação Trimestral em Múltiplas Rotas ===")
    
    # Carrega dados históricos
    historical_data = load_historical_data()
    
    # Encontra as 3 rotas mais comuns
    route_counts = historical_data.groupby(['Lat_Origem', 'Lng_Origem', 'Lat_Destino', 'Lng_Destino']).size()
    top_routes = route_counts.nlargest(3).reset_index()
    
    print(f"Analisando variação trimestral nas {len(top_routes)} rotas mais comuns:")
    
    for idx, route in top_routes.iterrows():
        origem_lat = route['Lat_Origem']
        origem_lng = route['Lng_Origem']
        destino_lat = route['Lat_Destino']
        destino_lng = route['Lng_Destino']
        
        # Filtra dados históricos para esta rota
        route_data = historical_data[
            (abs(historical_data['Lat_Origem'] - origem_lat) < 0.01) &
            (abs(historical_data['Lng_Origem'] - origem_lng) < 0.01) &
            (abs(historical_data['Lat_Destino'] - destino_lat) < 0.01) &
            (abs(historical_data['Lng_Destino'] - destino_lng) < 0.01)
        ]
        
        # Calcula distância média
        km = route_data['KM'].mean()
        
        print(f"\nRota {idx+1}: ({origem_lat}, {origem_lng}) → ({destino_lat}, {destino_lng})")
        print(f"Distância média: {km:.1f} km")
        print(f"Ocorrências nos dados: {len(route_data)}")
        
        # Analisa por trimestre
        route_data['Trimestre'] = ((route_data['Mês'] - 1) // 3) + 1
        quarterly_stats = route_data.groupby('Trimestre')['Frete Carreteiro'].agg(['mean', 'count']).reset_index()
        quarterly_stats.columns = ['Trimestre', 'Preço Médio', 'Quantidade']
        quarterly_stats['Preço Médio'] = quarterly_stats['Preço Médio'].round(2)
        
        print("Dados históricos por trimestre:")
        print(tabulate(quarterly_stats, headers='keys', tablefmt='grid'))
        
        # Testa predição para cada trimestre
        trimester_results = []
        trimester_months = {1: 2, 2: 5, 3: 8, 4: 11}  # Mês representativo de cada trimestre
        
        for trimestre, mes in trimester_months.items():
            resultado = predict_with_high_confidence(
                origem_lat, origem_lng, destino_lat, destino_lng, km, mes
            )
            
            if not resultado.get("error", False):
                prediction = resultado['prediction']
                confidence = resultado['confidence_pct']
                
                trimester_results.append([
                    f"Q{trimestre}", 
                    f"R$ {prediction:.2f}", 
                    f"{confidence}%"
                ])
        
        # Exibe resultados da predição
        print("Predições por trimestre:")
        print(tabulate(trimester_results, headers=["Trimestre", "Predição", "Confiança"], tablefmt='grid'))

def main():
    """Função principal."""
    print("=== Análise de Fatores Sazonais no Modelo ===")
    
    # Testa variação mensal
    test_monthly_variation()
    
    # Testa variação trimestral em várias rotas
    test_quarterly_variation_multiple_routes()

if __name__ == "__main__":
    main()