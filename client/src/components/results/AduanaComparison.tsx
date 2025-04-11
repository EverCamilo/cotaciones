import { Card, CardContent } from "../ui/card";
import { AduanaDetails } from "../../contexts/FreightContext";
import { formatCurrency } from "../../utils/currencyConverter";

interface AduanaComparisonProps {
  aduanas?: AduanaDetails[];
}

const AduanaComparison = ({ aduanas }: AduanaComparisonProps) => {
  // Default aduanas if none provided
  const defaultAduanas: AduanaDetails[] = [
    {
      name: "Foz do Iguaçu",
      country: "BR",
      partnerAduana: "Ciudad del Este",
      distance: 578,
      costPerTon: 145,
      costPerTonWithFreight: 155,
      hasBalsa: false,
      total: 4350,
      totalWithFreight: 4650,
      isRecommended: true
    },
    {
      name: "Santa Helena",
      country: "BR",
      partnerAduana: "Puerto Indio",
      distance: 612,
      costPerTon: 158.7,
      costPerTonWithFreight: 183.5,
      hasBalsa: true,
      balsaCost: 410,
      total: 4761,
      totalWithFreight: 5505
    },
    {
      name: "Mundo Novo",
      country: "BR",
      partnerAduana: "Salto del Guaíra",
      distance: 685,
      costPerTon: 172.2,
      costPerTonWithFreight: 199.8,
      hasBalsa: false,
      total: 5166,
      totalWithFreight: 5994
    }
  ];

  const displayAduanas = aduanas && aduanas.length > 0 ? aduanas : defaultAduanas;

  // Ordenar as aduanas pelo custo total com frete (que é o valor usado para comparação)
  const sortedAduanas = [...displayAduanas].sort((a, b) => 
    ((a.totalWithFreight || a.total || 0) - (b.totalWithFreight || b.total || 0))
  );
  
  // Primeira colocada (recomendada)
  const recommendedAduana = sortedAduanas[0];
  const recommendedTotalWithFreight = recommendedAduana?.totalWithFreight || recommendedAduana?.total || 0;
  
  // Calcular as diferenças percentuais para cada aduana em relação à recomendada
  const aduanasWithPercentage = sortedAduanas.map((aduana, index) => {
    const aduanaTotalWithFreight = aduana.totalWithFreight || aduana.total || 0;
    const percentageDiff = index === 0 ? 0 : 
      ((aduanaTotalWithFreight - recommendedTotalWithFreight) / recommendedTotalWithFreight * 100);
    
    return {
      ...aduana,
      percentageDiff: percentageDiff,
      position: index + 1
    };
  });
  
  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <h4 className="font-heading font-bold text-neutral-800 dark:text-white">Comparação de Aduanas</h4>
      </div>
      
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          {aduanasWithPercentage.map((aduana, index) => (
            <div 
              key={index} 
              className={`flex-1 border rounded-lg p-3 ${
                aduana.position === 1 
                  ? 'border-green-500 dark:border-green-700 bg-green-50 dark:bg-green-900/20' 
                  : 'border-neutral-200 dark:border-neutral-700'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h5 className="font-medium text-neutral-800 dark:text-white flex items-center">
                  {aduana.name}
                  <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                    aduana.position === 1 
                      ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                  }`}>
                    {aduana.position}º
                  </span>
                </h5>
                {aduana.position === 1 && (
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    Recomendado
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
                {aduana.partnerAduana} (PY)
              </p>
              
              <div className="space-y-3 mb-2">
                {/* Comparativo em % - o valor mais importante */}
                {aduana.position > 1 ? (
                  <div className="flex justify-between items-center py-1.5 px-3 bg-amber-50 dark:bg-amber-900/50 rounded-md border border-amber-200 dark:border-amber-800">
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Comparativo:
                    </span>
                    <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                      +{aduana.percentageDiff.toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center py-1.5 px-3 bg-green-50 dark:bg-green-900/30 rounded-md border border-green-200 dark:border-green-800">
                    <span className="text-sm font-medium text-green-800 dark:text-green-300">
                      Melhor opção
                    </span>
                    <span className="text-sm font-bold text-green-800 dark:text-green-300">
                      Base 0%
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">Distância:</span>
                  <span className="text-xs font-medium text-neutral-800 dark:text-white">
                    {aduana.distance} km
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">Balsa:</span>
                  <span className="text-xs font-medium text-neutral-800 dark:text-white">
                    {aduana.hasBalsa 
                      ? `Sim (${typeof aduana.balsaCost === 'number' 
                        ? formatCurrency(aduana.balsaCost, 'BRL') 
                        : 'Variável'})`
                      : 'Não'
                    }
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
            {recommendedAduana?.name} é a aduana recomendada por ter o menor valor total a cobrar
          </p>
          <p className="text-xs mt-2 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 p-3 rounded-md">
            <b>Legenda das porcentagens:</b> Os valores mostram o quanto cada opção é mais cara em relação à 
            aduana recomendada. Por exemplo, se uma aduana mostra <b>+10.5%</b>, significa que o valor total 
            dessa rota seria 10.5% maior que a rota recomendada.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AduanaComparison;
