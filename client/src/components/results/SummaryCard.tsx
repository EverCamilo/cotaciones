import { formatCurrency } from "../../utils/currencyConverter";
import { Card, CardContent } from "../ui/card";
import { ArrowRight, TruckIcon, DollarSign, LineChart, Route, Package, Wheat } from "lucide-react";

interface SummaryCardProps {
  recommendedAduana: string;
  totalCost?: number;
  costPerTon?: number;
  totalDistance?: number;
  requiredTrucks?: number;
  exchangeRate?: number;
  estimatedProfit?: number;
  productType?: string;
  specificProduct?: string;
  productPrice?: number;
  tonnage?: number;
}

const SummaryCard = ({
  recommendedAduana,
  totalCost = 0,
  costPerTon = 0,
  totalDistance = 0,
  requiredTrucks = 1,
  exchangeRate = 5.42,
  estimatedProfit = 0,
  productType = '',
  specificProduct = '',
  productPrice = 0,
  tonnage = 0
}: SummaryCardProps) => {
  // Get paired Paraguayan aduana based on the Brazilian one
  const getParaguayanAduana = (brazilianAduana: string): string => {
    const pairs: Record<string, string> = {
      "Guaíra": "Salto del Guaíra",
      "Mundo Novo": "Salto del Guaíra",
      "Foz do Iguaçu": "Ciudad del Este",
      "Santa Helena": "Puerto Indio"
    };
    
    return pairs[brazilianAduana] || "";
  };

  const paraguayanAduana = getParaguayanAduana(recommendedAduana);

  return (
    <>
      {/* Recommendation Card */}
      <Card className="overflow-hidden">
        <div className="p-4">
          <h4 className="font-heading text-lg font-bold text-neutral-800 dark:text-white">Aduana Recomendada</h4>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Menor custo total por tonelada</p>
        </div>
        <CardContent className="p-4 text-center">
          <h2 className="text-3xl font-bold text-neutral-800 dark:text-primary-400">
            {recommendedAduana}
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm">
            Brasil <ArrowRight className="inline h-3 w-3 text-neutral-600 dark:text-neutral-400" /> {paraguayanAduana}, Paraguai
          </p>
          
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex justify-between mb-2">
              <span className="text-neutral-600 dark:text-neutral-400">Valor Total a cobrar:</span>
              <span className="font-bold text-neutral-800 dark:text-white">
                {formatCurrency(totalCost, 'USD')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600 dark:text-neutral-400">Por Tonelada:</span>
              <span className="font-bold text-secondary-500">
                {formatCurrency(costPerTon, 'USD')}/ton
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Key Metrics */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h4 className="font-heading font-bold text-neutral-800 dark:text-white">Métricas Importantes</h4>
          
          <div className="flex justify-between items-center">
            <div>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">Distância Total</p>
              <p className="text-lg font-semibold text-neutral-800 dark:text-white">
                {Math.round(totalDistance)} km
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <Route className="text-primary-500 h-5 w-5" />
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">Caminhões Necessários</p>
              <p className="text-lg font-semibold text-neutral-800 dark:text-white">
                {requiredTrucks} {requiredTrucks === 1 ? 'caminhão' : 'caminhões'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <TruckIcon className="text-primary-500 h-5 w-5" />
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">Cotação BRL/USD</p>
              <p className="text-lg font-semibold text-neutral-800 dark:text-white">
                R$ {exchangeRate.toFixed(2)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <DollarSign className="text-primary-500 h-5 w-5" />
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">Lucro Estimado</p>
              <p className="text-lg font-semibold text-secondary-500">
                {formatCurrency(estimatedProfit, 'USD')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary-100 dark:bg-secondary-900 flex items-center justify-center">
              <LineChart className="text-secondary-500 h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Product Info */}
      {productType === 'grains' && specificProduct && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-heading font-bold text-neutral-800 dark:text-white">Informações do Produto</h4>
              <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                <Wheat className="text-yellow-600 dark:text-yellow-400 h-4 w-4" />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Produto:</span>
                <span className="font-semibold text-neutral-800 dark:text-white">
                  {specificProduct}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Preço de Referência:</span>
                <span className="font-semibold text-neutral-800 dark:text-white">
                  {formatCurrency(productPrice, 'USD')}/ton
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Quantidade:</span>
                <span className="font-semibold text-neutral-800 dark:text-white">
                  {tonnage} toneladas
                </span>
              </div>
              
              <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-600 dark:text-neutral-400">Valor Total da Mercadoria:</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(productPrice * tonnage, 'USD')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default SummaryCard;
