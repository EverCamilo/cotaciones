import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FreightQuote } from '@/contexts/FreightContext';
import { formatCurrency } from '@/utils/formatters';
import { Info, Eye, Download, Copy } from 'lucide-react';
import { useLocation } from 'wouter';
import ExportButton from './ExportButton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FreightQuoteCardProps {
  quote: FreightQuote;
  compact?: boolean;
  onShowDetails?: (quoteId: string) => void;
  onExportPDF?: (quote: FreightQuote) => void;
  showActions?: boolean;
}

const FreightQuoteCard: React.FC<FreightQuoteCardProps> = ({
  quote,
  compact = false,
  onShowDetails,
  onExportPDF,
  showActions = true
}) => {
  const [, navigate] = useLocation();
  const [showCostDetails, setShowCostDetails] = useState(false);

  // Formatação de texto de origem/destino para mostrar apenas a cidade principal
  const formatLocation = (location: string | undefined): string => {
    if (!location) return 'N/A';
    return location.split(',')[0].trim();
  };

  // Usa a localização do customsDetails se disponível, ou cai para a localização original
  const originLocation = quote.customsDetails?.originLocation || quote.origin;
  const destinationLocation = quote.customsDetails?.destinationLocation || quote.destination;

  // Determina se mostra a cotação completa ou o formato compacto
  const handleViewDetails = () => {
    if (onShowDetails) {
      onShowDetails(quote.id || '');
    } else {
      navigate(`/quotes/${quote.id}`);
    }
  };

  const renderCostDetails = () => {
    return (
      <div className="space-y-2">
        {quote.costDetails && Object.entries(quote.costDetails).map(([key, value]) => {
          // Não mostrar valores zero
          if (value === 0) return null;
          
          // Não mostrar chaves com "raw" já que são dados internos
          if (key.toLowerCase().includes('raw')) return null;
          
          // Formatação especial para chaves conhecidas
          let formattedKey = key
            .replace(/([A-Z])/g, ' $1') // Adiciona espaço antes de maiúsculas
            .replace(/_/g, ' ') // Substitui underlines por espaços
            .replace(/^./, (str) => str.toUpperCase()); // Primeira letra maiúscula
          
          return (
            <div key={key} className="grid grid-cols-2 text-sm">
              <span>{formattedKey}:</span>
              <span className="text-right">{formatCurrency(value, 'USD')}</span>
            </div>
          );
        })}
        
        {/* Taxa de câmbio */}
        {quote.exchangeRate && (
          <div className="grid grid-cols-2 text-sm border-t pt-2 mt-2">
            <span>Câmbio USD/BRL:</span>
            <span className="text-right">{Number(quote.exchangeRate).toFixed(2)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Card className={`w-full ${compact ? 'border shadow-sm' : 'shadow-md'}`}>
        <CardHeader className={compact ? 'p-4 pb-2' : 'p-6 pb-3'}>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className={`${compact ? 'text-lg' : 'text-xl'} flex items-center gap-2`}>
                <span>{formatLocation(originLocation)}</span>
                <span className="text-muted-foreground">→</span>
                <span>{formatLocation(destinationLocation)}</span>
              </CardTitle>
              <CardDescription>
                {quote.createdAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(quote.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                )}
                {' • '}
                <span className="font-medium">
                  {quote.clientName || 'Sem cliente'}
                </span>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold">
                U$ {Math.round(Number(quote.costPerTon || 0))}/ton
              </div>
              <div className="text-sm text-muted-foreground">
                {quote.tonnage} toneladas
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className={compact ? 'p-4 pt-0' : 'p-6 pt-2'}>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <div className="text-sm font-medium">Produto</div>
              <div className="text-sm text-muted-foreground truncate">
                {quote.productType}{quote.specificProduct ? ` - ${quote.specificProduct}` : ''}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Aduana</div>
              <div className="text-sm text-muted-foreground">
                {quote.aduanaBr || quote.recommendedAduana || 'N/A'}
              </div>
            </div>
          </div>
          
          {!compact && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium">Valor Total</div>
                  <div className="text-lg font-bold">
                    U$ {Number(quote.totalCost || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Distância</div>
                  <div className="text-lg">
                    {quote.totalDistance ? `${Math.round(Number(quote.totalDistance))} km` : 'N/A'}
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
        
        {showActions && (
          <CardFooter className={`${compact ? 'p-4 pt-2' : 'p-6 pt-3'} flex justify-between`}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowCostDetails(true)}
            >
              <Info className="h-4 w-4 mr-2" />
              Detalhes
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDetails}
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver Mais
              </Button>
              
              <ExportButton
                quote={quote}
                variant="outline"
                size="sm"
                showPDFOption={!!onExportPDF}
                onExportPDF={() => onExportPDF && onExportPDF(quote)}
              />
            </div>
          </CardFooter>
        )}
      </Card>
      
      {/* Dialog para exibição detalhada dos custos */}
      <Dialog open={showCostDetails} onOpenChange={setShowCostDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhamento de Custos</DialogTitle>
            <DialogDescription>
              Cotação: {formatLocation(originLocation)} → {formatLocation(destinationLocation)}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="p-4">
              {renderCostDetails()}
              
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-2 text-base font-bold">
                  <span>Valor Total a cobrar:</span>
                  <span className="text-right">{formatCurrency(quote.totalCost || 0, 'USD')}</span>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FreightQuoteCard;