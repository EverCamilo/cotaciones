import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Truck, FileText, BarChart, FileDown, Info, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { formatCurrency } from "../utils/currencyConverter";
import { PDFDownloadButton } from "../components/pdf/QuotePDF";
import { FreightQuote } from "../contexts/FreightContext";
import { formatLocationString } from "../utils/formatting";
import CostDetailsDialog from "@/components/CostDetailsDialog";

// Não usamos Omit<FreightQuote> para evitar problemas de tipo
interface QuoteHistory {
  id: string;
  clientId?: string;
  clientName?: string;
  
  origin: string;
  originCity?: string;
  originPlaceId?: string;
  destination: string;
  destinationCity?: string;
  destinationPlaceId?: string;
  productType: string;
  specificProduct?: string;
  tonnage: string | number;
  driverPayment: string | number;
  profitMargin: string | number;
  merchandiseValue: string | number;
  aduanaBr?: string;
  recommendedAduana?: string;
  
  totalCost?: string | number;
  costPerTon?: string | number;
  baseCostPerTon?: string | number;
  marginPerTon?: string | number;
  totalDistance?: string | number;
  requiredTrucks?: number;
  exchangeRate?: number;
  estimatedProfit?: string | number;
  
  customsDetails?: any;
  costBreakdown?: any[];
  
  createdAt: string;
}

interface PaginationResult {
  quotes: QuoteHistory[];
  pagination: {
    hasMore: boolean;
    currentPage: number;
    totalEstimate?: number;
    pageSize: number;
  };
}

export default function History() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuote, setSelectedQuote] = useState<QuoteHistory | null>(null);
  const [page, setPage] = useState(1);
  const [allQuotes, setAllQuotes] = useState<QuoteHistory[]>([]);
  const [hasMore, setHasMore] = useState(true);
  
  // Fetch history data with pagination
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['/api/freight/history', page],
    queryFn: async () => {
      const response = await fetch(`/api/freight/history?page=${page}&limit=10`);
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json() as PaginationResult;
      return data;
    },
    // Evitar refetch automático por 5 minutos para reduzir conexões repetitivas
    staleTime: 5 * 60 * 1000,
    // Desabilitar refetch automático em segundo plano
    refetchInterval: false,
    refetchOnWindowFocus: false,
    // O parâmetro placeholderData é a versão V5 de keepPreviousData
    placeholderData: (prev) => prev
  });

  // Atualizar hasMore e allQuotes quando novos dados chegarem
  useEffect(() => {
    if (data) {
      setHasMore(data.pagination.hasMore);
      
      // Para filtrar adequadamente, precisamos armazenar todas as cotações carregadas
      if (page === 1) {
        // Se é a primeira página, substituir tudo
        setAllQuotes(data.quotes);
      } else {
        // Se não, adicionar ao final
        setAllQuotes(prev => {
          // Evitar duplicações verificando IDs
          const newIds = new Set(data.quotes.map(q => q.id));
          const filteredPrev = prev.filter(p => !newIds.has(p.id));
          return [...filteredPrev, ...data.quotes];
        });
      }
    }
  }, [data, page]);

  // Carregar mais cotações
  const loadMore = () => {
    if (hasMore && !isFetching) {
      setPage(prev => prev + 1);
    }
  };

  // Filter history based on search term
  const filteredHistory = allQuotes.filter(
    (item: QuoteHistory) =>
      (item.origin || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.destination || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.productType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.recommendedAduana || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.specificProduct || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.clientName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-heading font-bold text-neutral-800 dark:text-white">Histórico de Cotações</h2>
          <p className="text-neutral-500 dark:text-neutral-400">
            Visualize e gerencie suas cotações anteriores
          </p>
        </div>
        <div className="flex mt-4 md:mt-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            </div>
            <Input
              type="text"
              placeholder="Buscar cotações..."
              className="pl-10 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      {/* History content */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"></div>
              <p>Carregando histórico de cotações...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center text-red-500">
              <p>Erro ao carregar histórico. Tente novamente mais tarde.</p>
            </CardContent>
          </Card>
        ) : filteredHistory.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma cotação encontrada</h3>
              <p className="text-neutral-500 dark:text-neutral-400">
                {searchTerm ? "Sua busca não retornou resultados." : "Você ainda não possui cotações salvas."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredHistory.map((item: QuoteHistory) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4" onClick={(e) => e.stopPropagation()}>
                {/* Cabeçalho do Card */}
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-medium">Cliente</span>
                    <h3 className="text-base font-semibold text-neutral-800 dark:text-white">
                      {item.clientName || "Cliente não especificado"}
                    </h3>
                  </div>
                  <div className="flex items-center bg-primary-50 dark:bg-primary-900 px-3 py-2 rounded-md">
                    <Calendar className="h-4 w-4 text-primary-500 mr-2" />
                    <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                      {new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                
                {/* Rota e Produto */}
                <div className="mb-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-lg font-medium text-neutral-800 dark:text-white">
                      {formatLocationString(item.customsDetails?.originLocation) || item.originCity || formatLocationString(item.origin)} → {formatLocationString(item.customsDetails?.destinationLocation) || item.destinationCity || formatLocationString(item.destination)}
                    </h3>
                    <span className="px-2 py-1 text-xs rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                      {item.productType || 'Não especificado'}
                      {item.specificProduct ? ` - ${item.specificProduct}` : ''}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center flex-wrap gap-y-1">
                    <span className="inline-flex items-center mr-3">
                      <BarChart className="h-4 w-4 mr-1 text-neutral-400" />
                      Via {item.aduanaBr || item.recommendedAduana}
                    </span>
                    <span className="inline-flex items-center mr-3">
                      <Truck className="h-4 w-4 mr-1 text-neutral-400" />
                      {item.requiredTrucks || Math.ceil(Number(item.tonnage) / 32)} caminhões
                    </span>
                    <span className="inline-flex items-center">
                      <FileText className="h-4 w-4 mr-1 text-neutral-400" />
                      {item.totalDistance ? `${Number(item.totalDistance).toFixed(0)} km` : "Dist. não calculada"}
                    </span>
                  </p>
                </div>
                
                {/* Dados de Preço e Tonelagem */}
                <div className="bg-white dark:bg-neutral-800 rounded-md border p-4 mb-4">
                  <div className="flex justify-between items-center border-b pb-3 mb-3">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-neutral-500 font-medium">Embarque</span>
                      <div className="text-lg font-bold text-neutral-800 dark:text-white">
                        {Number(item.tonnage).toLocaleString('pt-BR')} toneladas
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs uppercase tracking-wider text-neutral-500 font-medium">Preço por Ton</span>
                      <div className="text-xl font-bold text-primary-600">
                        {formatCurrency(Number(item.costPerTon) || 0, 'USD')}/ton
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded">
                      <span className="text-xs text-neutral-500">Custo Base</span>
                      <div className="text-sm font-medium">
                        {formatCurrency((Number(item.costPerTon) || 0) - (Number(item.profitMargin) || 0), 'USD')}/ton
                      </div>
                    </div>
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">Margem</span>
                      <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {formatCurrency(Number(item.profitMargin) || 0, 'USD')}/ton
                      </div>
                    </div>
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">Câmbio USD/BRL</span>
                      <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        R$ {(item.exchangeRate || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Valores Totais (menos enfatizados conforme solicitado) */}
                  <div className="mt-3 text-xs text-right text-neutral-500">
                    <span>Total: {formatCurrency(Number(item.totalCost) || 0, 'USD')} | </span>
                    <span>Lucro estimado: {formatCurrency(Number(item.estimatedProfit) || 0, 'USD')}</span>
                  </div>
                </div>
                
                {/* Botões */}
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation(); // Evitar propagação do clique
                      setSelectedQuote(item);
                    }}
                    className="flex items-center gap-1"
                  >
                    <FileText className="h-4 w-4" />
                    Detalhes
                  </Button>
                  <div onClick={(e) => e.stopPropagation()}> {/* Wrapper para evitar propagação */}
                    <PDFDownloadButton 
                      data={item as any} 
                      fileName={`cotacao-${item.recommendedAduana?.replace(/\s+/g, '-').toLowerCase()}-${new Date(item.createdAt).toISOString().split('T')[0]}.pdf`}
                      buttonText={
                        <span className="flex items-center gap-1">
                          <FileDown className="h-4 w-4" />
                          Exportar PDF
                        </span>
                      }
                      buttonClassName="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-transparent border border-input hover:bg-accent hover:text-accent-foreground h-9 px-3 py-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Botão de "Carregar Mais" */}
      {!isLoading && hasMore && filteredHistory.length > 0 && (
        <div className="flex justify-center my-6">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isFetching}
            className="w-full max-w-md"
          >
            {isFetching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando mais cotações...
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Carregar mais cotações
              </>
            )}
          </Button>
        </div>
      )}
      
      {/* Indicador de carregamento para paginação */}
      {isFetching && page > 1 && (
        <div className="text-center my-4 text-neutral-500">
          <Loader2 className="animate-spin h-4 w-4 inline mr-2" />
          Carregando mais cotações...
        </div>
      )}
      
      {/* Indicador de "fim dos resultados" */}
      {!hasMore && filteredHistory.length > 0 && (
        <div className="text-center my-6 text-neutral-500 text-sm">
          Você chegou ao fim dos resultados.
        </div>
      )}
      
      {/* Modal de detalhes dos custos */}
      <CostDetailsDialog 
        quote={selectedQuote} 
        onClose={() => setSelectedQuote(null)} 
      />
    </>
  );
}