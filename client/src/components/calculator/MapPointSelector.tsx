import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { XCircle, MapPin, Check } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Centrado na fronteira entre Paraguai e Brasil
const DEFAULT_CENTER = {
  lat: -24.0,
  lng: -54.5
};

interface MapPointSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectLocation: (data: { lat: number; lng: number; address: string }) => void;
  pointType: 'origin' | 'destination'; // Tipo de ponto - origem ou destino
  initialPosition?: { lat: number; lng: number } | null;
}

const MapPointSelector: React.FC<MapPointSelectorProps> = ({
  open,
  onClose,
  onSelectLocation,
  pointType,
  initialPosition
}) => {
  const [selectedPosition, setSelectedPosition] = useState<google.maps.LatLngLiteral | null>(
    initialPosition || DEFAULT_CENTER
  );
  const [mapZoom, setMapZoom] = useState(6);
  const [isLoading, setIsLoading] = useState(false);
  const [address, setAddress] = useState<string>('');
  const mapRef = useRef<google.maps.Map | null>(null);
  
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
    id: 'google-map-script'
  });
  
  const getAddressFromLatLng = useCallback(async (latLng: google.maps.LatLngLiteral) => {
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ location: latLng });
      
      if (result.results[0]) {
        setAddress(result.results[0].formatted_address);
        return result.results[0].formatted_address;
      } else {
        setAddress(`Ponto selecionado: ${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`);
        return `Ponto selecionado: ${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`;
      }
    } catch (error) {
      console.error('Erro ao obter endereço:', error);
      setAddress(`Ponto selecionado: ${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`);
      return `Ponto selecionado: ${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`;
    }
  }, []);
  
  const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    
    const newPosition = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    };
    
    setSelectedPosition(newPosition);
    await getAddressFromLatLng(newPosition);
  }, [getAddressFromLatLng]);
  
  const handleSelectLocation = useCallback(async () => {
    if (!selectedPosition) return;
    
    setIsLoading(true);
    try {
      let locationAddress = address;
      if (!locationAddress) {
        locationAddress = await getAddressFromLatLng(selectedPosition);
      }
      
      onSelectLocation({
        lat: selectedPosition.lat,
        lng: selectedPosition.lng,
        address: locationAddress
      });
      
      onClose();
    } catch (error) {
      console.error('Erro ao selecionar localização:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPosition, address, getAddressFromLatLng, onSelectLocation, onClose]);
  
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);
  
  const isOrigin = pointType === 'origin';
  const country = isOrigin ? 'Paraguai' : 'Brasil';
  const countryCodes = isOrigin ? ['py'] : ['br'];
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <MapPin className="mr-2 h-5 w-5 text-primary" />
            Selecione o ponto de {isOrigin ? 'origem' : 'destino'} no mapa
          </DialogTitle>
        </DialogHeader>
        
        <div className="h-96 relative">
          {!isLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 rounded-md">
              <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
              center={selectedPosition || DEFAULT_CENTER}
              zoom={mapZoom}
              onClick={handleMapClick}
              onLoad={onMapLoad}
              options={{
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true,
                zoomControl: true,
                restriction: {
                  latLngBounds: {
                    north: -13.0,
                    south: -32.0,
                    east: -39.0,
                    west: -64.0
                  },
                  strictBounds: false
                },
                styles: [
                  {
                    featureType: "administrative.country",
                    elementType: "geometry.stroke",
                    stylers: [{ color: "#ff0000" }, { weight: 2 }]
                  }
                ]
              }}
            >
              {selectedPosition && (
                <Marker
                  position={selectedPosition}
                  icon={{
                    url: isOrigin 
                      ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                      : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                    scaledSize: new google.maps.Size(38, 38)
                  }}
                />
              )}
            </GoogleMap>
          )}
          
          <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-neutral-800 p-3 rounded-md shadow-md">
            <p className="text-sm font-medium mb-1">
              {isOrigin ? 'Origem' : 'Destino'} ({country}):
            </p>
            <p className="text-sm truncate">
              {address || `Clique no mapa para selecionar um ponto em ${country}`}
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex sm:justify-between">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <XCircle className="h-4 w-4" />
            Cancelar
          </Button>
          <Button 
            onClick={handleSelectLocation} 
            disabled={!selectedPosition || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Confirmar local selecionado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MapPointSelector;