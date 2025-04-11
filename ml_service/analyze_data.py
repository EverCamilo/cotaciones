"""
Script para analisar os dados do conjunto de treinamento e identificar padrões.
"""

import os
import pandas as pd
import numpy as np
from datetime import datetime

# Configuração
CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'attached_assets', 'Libro3_utf8.csv')

def load_data():
    """Carrega e processa os dados do CSV original."""
    print(f"Carregando dados de: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH, sep=';')
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
    
    print(f"Dados carregados: {len(df)} registros")
    return df

def analyze_coordinates(df):
    """Analisa as coordenadas de origem e destino no dataset."""
    print("\n=== Análise de Coordenadas ===")
    
    # Encontra os pares de coordenadas mais comuns
    coord_origem = df[['Lat_Origem', 'Lng_Origem']].round(4)
    coord_destino = df[['Lat_Destino', 'Lng_Destino']].round(4)
    
    # Converte para strings para facilitar contagem
    df['origem_str'] = coord_origem.apply(lambda row: f"{row['Lat_Origem']},{row['Lng_Origem']}", axis=1)
    df['destino_str'] = coord_destino.apply(lambda row: f"{row['Lat_Destino']},{row['Lng_Destino']}", axis=1)
    
    # Conta ocorrências
    origens_comuns = df['origem_str'].value_counts().head(10)
    destinos_comuns = df['destino_str'].value_counts().head(10)
    
    print("\nOrigens mais comuns:")
    for i, (coord, count) in enumerate(origens_comuns.items()):
        print(f"{i+1}. {coord} - {count} ocorrências")
    
    print("\nDestinos mais comuns:")
    for i, (coord, count) in enumerate(destinos_comuns.items()):
        print(f"{i+1}. {coord} - {count} ocorrências")
    
    # Conta rotas únicas
    rotas = df['origem_str'] + ' → ' + df['destino_str']
    rotas_unicas = rotas.nunique()
    print(f"\nNúmero total de rotas únicas: {rotas_unicas}")
    
    # Rotas mais comuns
    rotas_comuns = rotas.value_counts().head(10)
    print("\nRotas mais comuns:")
    for i, (rota, count) in enumerate(rotas_comuns.items()):
        print(f"{i+1}. {rota} - {count} ocorrências")

def analyze_price_distribution(df):
    """Analisa a distribuição dos preços de frete."""
    print("\n=== Análise de Preços ===")
    
    # Estatísticas básicas
    stats = df['Frete Carreteiro'].describe()
    print(f"Estatísticas de preço de frete:")
    print(f"  Mínimo: R$ {stats['min']:.2f}")
    print(f"  Máximo: R$ {stats['max']:.2f}")
    print(f"  Média: R$ {stats['mean']:.2f}")
    print(f"  Mediana: R$ {stats['50%']:.2f}")
    print(f"  Desvio padrão: R$ {stats['std']:.2f}")
    
    # Preço por km
    stats_km = df['Valor_por_km'].describe()
    print(f"\nEstatísticas de preço por km:")
    print(f"  Mínimo: R$ {stats_km['min']:.2f}/km")
    print(f"  Máximo: R$ {stats_km['max']:.2f}/km")
    print(f"  Média: R$ {stats_km['mean']:.2f}/km")
    print(f"  Mediana: R$ {stats_km['50%']:.2f}/km")
    
    # Preços por distância
    print("\nPreço médio por faixa de distância:")
    distance_bins = [0, 100, 500, 1000, 2000, float('inf')]
    labels = ['0-100km', '100-500km', '500-1000km', '1000-2000km', '2000km+']
    df['distance_bin'] = pd.cut(df['KM'], bins=distance_bins, labels=labels)
    price_by_distance = df.groupby('distance_bin')['Frete Carreteiro'].agg(['mean', 'count'])
    for bin_name, row in price_by_distance.iterrows():
        print(f"  {bin_name}: R$ {row['mean']:.2f} (baseado em {row['count']} rotas)")

def main():
    """Função principal."""
    print("=== Análise de Dados para ML Natural ===")
    
    # Carrega dados
    df = load_data()
    
    # Analisa coordenadas
    analyze_coordinates(df)
    
    # Analisa preços
    analyze_price_distribution(df)
    
    print("\n=== Análise Concluída ===")

if __name__ == "__main__":
    main()