#!/usr/bin/env python3
"""
Script de teste para verificar o processamento do CSV
"""
import os
import sys
import pandas as pd
from data_processor import load_csv_data, preprocess_data

def main():
    """Função principal para testar o processamento do CSV"""
    # Encontrar arquivo CSV
    possible_paths = [
        "../attached_assets/Libro3_utf8.csv",
        "./attached_assets/Libro3_utf8.csv",
        "../Libro3_utf8.csv",
        "./Libro3_utf8.csv",
    ]
    
    csv_path = None
    for path in possible_paths:
        if os.path.exists(path):
            csv_path = path
            print(f"Arquivo CSV encontrado: {path}")
            break
    
    if csv_path is None:
        print("ERRO: Arquivo CSV não encontrado")
        return
    
    # Carregar dados
    print(f"Carregando dados de: {csv_path}")
    raw_df = load_csv_data(csv_path)
    
    if raw_df.empty:
        print("ERRO: Falha ao carregar dados")
        return
    
    # Mostrar primeiras linhas
    print("\nPrimeiras 5 linhas do CSV bruto:")
    print(raw_df.head(5))
    
    # Mostrar colunas
    print("\nColunas disponíveis:")
    for col in raw_df.columns:
        print(f"  - {col}: {raw_df[col].dtype}")
    
    # Processar dados
    print("\nPré-processando dados...")
    df = preprocess_data(raw_df)
    
    # Mostrar estatísticas
    print(f"\nDataset processado: {len(df)} registros")
    
    # Mostrar primeiras linhas processadas
    print("\nPrimeiras 5 linhas processadas:")
    print(df.head(5))
    
    # Mostrar colunas processadas
    print("\nColunas processadas:")
    for col in df.columns:
        print(f"  - {col}: {df[col].dtype}")
    
    # Análise por distância
    if 'distance' in df.columns and 'freight_value' in df.columns:
        print("\nAnálise por distância:")
        distance_groups = df.groupby('distance')['freight_value'].agg(['mean', 'count', 'min', 'max'])
        print(distance_groups)
        
        # Filtrar grupos com pelo menos 5 registros
        significant_groups = distance_groups[distance_groups['count'] >= 5]
        print("\nRotas com maior volume de dados (>= 5 registros):")
        print(significant_groups)
        
        # Verificar preços para distâncias específicas
        for distance in [90, 110, 400, 500]:
            approx_match = df[(df['distance'] >= distance - 5) & (df['distance'] <= distance + 5)]
            if not approx_match.empty:
                print(f"\nRegistros para distância ~{distance}km ({len(approx_match)} registros):")
                prices = approx_match['freight_value'].tolist()
                print(f"  Valores: {prices}")
                print(f"  Média: R$ {approx_match['freight_value'].mean():.2f}")
                print(f"  Desvio padrão: R$ {approx_match['freight_value'].std():.2f}")

if __name__ == "__main__":
    main()