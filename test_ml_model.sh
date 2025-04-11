#!/bin/bash

echo "Testando Serviço ML TravelIntelligence"
echo "======================================="
echo

# Pedir parâmetros do usuário
read -p "Origem (latitude): " origin_lat
read -p "Origem (longitude): " origin_lng
read -p "Destino (latitude): " dest_lat
read -p "Destino (longitude): " dest_lng
read -p "Distância total (km): " distance
read -p "Data de saída (DD/MM/AAAA): " departure_date

# Construir payload JSON
payload="{\"origin\": \"Teste\", \"destination\": \"Teste\", \"origin_coordinates\": {\"lat\": $origin_lat, \"lng\": $origin_lng}, \"destination_coordinates\": {\"lat\": $dest_lat, \"lng\": $dest_lng}, \"totalDistance\": $distance, \"departure_date\": \"$departure_date\", \"origin_lat\": $origin_lat, \"origin_lng\": $origin_lng, \"destination_lat\": $dest_lat, \"destination_lng\": $dest_lng}"

echo
echo "Enviando payload:"
echo "$payload"
echo
echo "Resultado da predição:"

# Executar a predição
python3 -c "from ml_service.predict import predict; import json; result = predict($payload); print(json.dumps(result, indent=2))"

echo
echo "======================================="