import { Card, CardContent } from "../ui/card";
import { formatCurrency } from "../../utils/currencyConverter";
import { CostItem } from "../../contexts/FreightContext";

interface CostBreakdownProps {
  costItems?: CostItem[];
}

const CostBreakdown = ({ costItems = [] }: CostBreakdownProps) => {
  // Default cost items if none provided
  const defaultItems: CostItem[] = [
    {
      item: "Subtotal",
      details: "Sem margem de lucro",
      value: 0
    },
    {
      item: "Margem de Lucro",
      details: "Margem de lucro por tonelada",
      value: 0
    },
    {
      item: "Total",
      details: "Valor total a cobrar",
      value: 0
    }
  ];

  // Filtrar itens que são apenas para referência interna (como o Frete Base)
  // E também remover qualquer referência à "Balsa (Sanga Funda)" que possa existir
  // em cotações antigas ou registros persistidos
  const filteredItems = costItems.filter(item => 
    !item.isReferenceOnly && 
    item.item !== "Balsa (Sanga Funda)" // Removendo explicitamente qualquer referência a Sanga Funda
  );
  
  const displayItems = filteredItems.length > 0 ? filteredItems : defaultItems;
  const total = displayItems.find(item => item.item === "Total")?.value || 0;

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <h4 className="font-heading font-bold text-neutral-800 dark:text-white">Detalhamento de Custos</h4>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
          <thead className="bg-neutral-50 dark:bg-neutral-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
                Item
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
                Detalhes
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
                Valor (USD)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
            {displayItems.map((item, index) => {
              // Determine special styling for certain rows
              const isSubtotal = item.item === "Subtotal";
              const isProfit = item.item === "Margem de Lucro";
              const isTotal = item.item === "Total";
              
              return (
                <tr 
                  key={index}
                  className={`
                    ${isSubtotal ? "bg-neutral-50 dark:bg-neutral-700" : ""}
                    ${isTotal ? "bg-primary-50 dark:bg-primary-900" : ""}
                  `}
                >
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium 
                    ${isTotal ? "text-base text-primary-700 dark:text-primary-300 font-bold" : ""} 
                    ${isProfit ? "text-secondary-500" : "text-neutral-800 dark:text-white"}`}>
                    {item.item}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm
                    ${isTotal ? "text-primary-600 dark:text-primary-400" : "text-neutral-500 dark:text-neutral-400"}`}>
                    {/* Mostrar detalhe original, sem alterações forçadas */}
                    {item.details}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold
                    ${isTotal ? "text-base text-primary-700 dark:text-primary-300 font-bold" : ""} 
                    ${isProfit ? "text-secondary-500" : "text-neutral-800 dark:text-white"}`}>
                    {item.value.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default CostBreakdown;
