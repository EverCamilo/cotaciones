import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "../utils/currencyConverter";
import { formatLocationString } from "../utils/formatting";

// Interface que define o formato dos dados necessários para o modal
export interface CostDetailsQuote {
  id: string;
  clientName?: string;
  
  origin: string;
  originCity?: string;
  customsDetails?: any;
  destination: string;
  destinationCity?: string;
  recommendedAduana?: string;
  aduanaBr?: string;
  
  tonnage: string | number;
  costPerTon?: string | number;
  marginPerTon?: string | number;
  profitMargin?: string | number;
  
  costBreakdown?: any[] | Record<string, any>;
}

interface CostDetailsDialogProps {
  quote: CostDetailsQuote | null;
  onClose: () => void;
}

const CostDetailsDialog: React.FC<CostDetailsDialogProps> = ({ quote, onClose }) => {
  if (!quote) return null;
  
  // Obter a origem formatada
  const origin = formatLocationString(quote.customsDetails?.originLocation) || 
                 quote.originCity || 
                 formatLocationString(quote.origin) || 
                 '—';
  
  // Obter o destino formatado
  const destination = formatLocationString(quote.customsDetails?.destinationLocation) || 
                      quote.destinationCity || 
                      formatLocationString(quote.destination) || 
                      '—';
  
  // Processar o breakdown de custos para exibição
  const getCostItems = () => {
    let costItems: Array<any> = [];
    if (quote.costBreakdown) {
      if (Array.isArray(quote.costBreakdown)) {
        costItems = quote.costBreakdown;
      } else if (typeof quote.costBreakdown === 'object') {
        // Converter de objeto para array (estrutura do Firebase)
        costItems = Object.entries(quote.costBreakdown)
          .filter(([key]) => !isNaN(Number(key)))
          .map(([_, value]) => value);
      }
    }
    return costItems;
  };
  
  const costItems = getCostItems();
  
  return (
    <Dialog open={!!quote} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhamento de Custos</DialogTitle>
        </DialogHeader>
        
        <div className="pt-2 pb-3">
          <div className="mb-3">
            <h3 className="text-lg font-semibold mb-1">
              {origin} {" → "} {destination}
            </h3>
            <p className="text-sm text-neutral-500">
              Cliente: {quote.clientName || "Não especificado"} | 
              Via aduana: {quote.aduanaBr || quote.recommendedAduana} | 
              Embarque: {Number(quote.tonnage).toLocaleString('pt-BR')} toneladas
            </p>
          </div>
          
          <div className="border rounded-md mb-3 dark:border-gray-700">
            <div className="bg-muted px-3 py-2 border-b dark:border-gray-700">
              <h4 className="font-medium">Detalhamento de Custos</h4>
            </div>
            
            <div className="p-3">
              {costItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-2">
                  Detalhamento de custos não disponível para esta cotação.
                </p>
              ) : (
                <div className="space-y-1">
                  {costItems.map((item: any, index: number) => {
                    // Não incluir itens de referência no detalhamento (como frete base)
                    if (item?.isReferenceOnly) return null;
                    
                    // Se for um item de margem ou total, aplicar estilo diferente
                    const isSubtotal = item?.item === "Subtotal";
                    const isTotal = item?.item === "Total";
                    const isProfit = item?.item === "Margem de Lucro";
                    
                    const bgClass = isTotal ? "bg-primary/10 font-bold dark:bg-primary/20" : 
                                  isSubtotal || isProfit ? "bg-muted font-semibold" : 
                                  "";
                    
                    return (
                      <div 
                        key={index} 
                        className={`grid grid-cols-[1fr,auto] py-1.5 px-3 ${bgClass} ${isTotal ? "border-t border-primary/20 dark:border-primary/30" : ""}`}
                      >
                        <div className="pr-2">
                          <span className="block">{item?.item || 'Item'}</span>
                          {item?.details && <span className="text-xs text-muted-foreground block">{item.details}</span>}
                        </div>
                        <span className={`text-right ${isTotal ? "text-primary-700 dark:text-primary-300 font-bold" : ""}`}>
                          US ${(item?.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-muted rounded-md dark:bg-muted/50">
            <div className="text-left">
              <p className="text-sm font-medium">Custo Base</p>
              <p className="text-lg text-foreground">US ${Math.round(Number(quote.costPerTon || 0) - Number(quote.marginPerTon || quote.profitMargin || 0))}/ton</p>
            </div>
            <div className="text-left md:text-center">
              <p className="text-sm font-medium">Margem</p>
              <p className="text-lg text-primary">US ${Math.round(Number(quote.marginPerTon || quote.profitMargin || 0))}/ton</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm font-medium">Valor Total</p>
              <p className="text-lg font-bold text-primary-700 dark:text-primary-300">US ${Math.round(Number(quote.costPerTon || 0))}/ton</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-0">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CostDetailsDialog;