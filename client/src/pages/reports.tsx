import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatLocation } from '@/utils/formatters';
import CostDetailsDialog, { CostDetailsQuote } from "@/components/CostDetailsDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Download, 
  FileText, 
  Search, 
  ArrowUpDown,
  CheckSquare,
  Info,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PDFDownloadButton } from "../components/pdf/QuotePDF";
import { MultipleQuotesPDFButton } from "../components/pdf/MultipleQuotesPDF";
import { formatCurrency, formatUSD, formatDate } from "@/utils/formatters";
import { exportQuotesToExcel } from "@/utils/exportUtils";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";

// Tipo para agrupar as cotações de relatório (com mais campos)
interface QuoteReport {
  id: string;
  clientId?: string;
  clientName?: string;
  
  origin: string;
  originCity?: string;
  destination: string;
  destinationCity?: string;
  productType: string;
  specificProduct?: string;
  tonnage: string | number;
  driverPayment: string | number;
  profitMargin: string | number;
  aduanaBr?: string;
  recommendedAduana?: string;
  
  // Adicionar campo de customsDetails para acessar originLocation e destinationLocation
  customsDetails?: {
    originLocation?: string;
    destinationLocation?: string;
    customsPoint?: string;
    additionalNotes?: string;
    preferredAduana?: string;
    includeInsurance?: boolean;
    specialHandling?: boolean;
    customsProcess?: string;
    companyPaysBalsa?: boolean;
  };
  
  totalCost?: string | number;
  costPerTon?: string | number;
  baseCostPerTon?: string | number;
  marginPerTon?: string | number;
  totalDistance?: string | number;
  requiredTrucks?: number;
  exchangeRate?: number;
  estimatedProfit?: string | number;
  
  createdAt: string;
}

export default function Reports() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<CostDetailsQuote | null>(null);
  const [filterBy, setFilterBy] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<{startDate: string, endDate: string}>({
    startDate: '',
    endDate: ''
  });
  const [sortConfig, setSortConfig] = useState<{column: string, direction: 'asc' | 'desc'}>({
    column: 'createdAt',
    direction: 'desc'
  });

  // Fetch history data with pagination
  const [page, setPage] = useState(1);
  const [allQuotes, setAllQuotes] = useState<QuoteReport[]>([]);
  const [hasMore, setHasMore] = useState(true);
  
  // Fetch history data
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['/api/freight/history', page],
    queryFn: async () => {
      const response = await fetch(`/api/freight/history?page=${page}&limit=20`);
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      // API agora retorna { quotes: QuoteReport[], pagination: {...} }
      return data;
    },
    // Evitar refetch automático por 5 minutos para reduzir conexões repetitivas
    staleTime: 5 * 60 * 1000,
    // Desabilitar refetch automático em segundo plano
    refetchInterval: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev
  });

  // Toggle quote selection
  const toggleQuoteSelection = (id: string) => {
    if (selectedQuotes.includes(id)) {
      setSelectedQuotes(selectedQuotes.filter(quoteId => quoteId !== id));
    } else {
      setSelectedQuotes([...selectedQuotes, id]);
    }
  };

  // Select all quotes
  const toggleSelectAll = () => {
    if (filteredQuotes.length === selectedQuotes.length) {
      setSelectedQuotes([]);
    } else {
      setSelectedQuotes(filteredQuotes.map(quote => quote.id));
    }
  };

  // Fetch clients data
  const { data: clientsData } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients');
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      const data = await response.json();
      return data;
    },
    // Evitar refetch automático por 5 minutos para reduzir conexões repetitivas
    staleTime: 5 * 60 * 1000,
    // Desabilitar refetch automático em segundo plano
    refetchInterval: false,
    refetchOnWindowFocus: false
  });

  // Atualizar allQuotes quando novos dados chegarem
  useEffect(() => {
    if (data && data.quotes) {
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

  // Filter function
  const getFilteredQuotes = () => {
    if (!allQuotes.length) return [];
    
    let filtered = allQuotes.filter(
      (item: QuoteReport) =>
        (item.origin || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.destination || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.productType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.recommendedAduana || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.originCity || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.destinationCity || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.specificProduct || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Apply period filters
    if (filterBy !== 'all') {
      switch (filterBy) {
        case 'lastWeek':
          const lastWeek = new Date();
          lastWeek.setDate(lastWeek.getDate() - 7);
          filtered = filtered.filter(item => new Date(item.createdAt) >= lastWeek);
          break;
        case 'lastMonth':
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          filtered = filtered.filter(item => new Date(item.createdAt) >= lastMonth);
          break;
        case 'withClient':
          filtered = filtered.filter(item => !!item.clientId);
          break;
        case 'withoutClient':
          filtered = filtered.filter(item => !item.clientId);
          break;
      }
    }
    
    // Apply client filter
    if (clientFilter !== 'all') {
      filtered = filtered.filter(item => item.clientId === clientFilter);
    }
    
    // Apply date range filter if dates are provided
    if (dateFilter.startDate && dateFilter.endDate) {
      const startDate = new Date(dateFilter.startDate);
      const endDate = new Date(dateFilter.endDate);
      // Set endDate to end of day
      endDate.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.createdAt);
        return itemDate >= startDate && itemDate <= endDate;
      });
    } else if (dateFilter.startDate) {
      const startDate = new Date(dateFilter.startDate);
      filtered = filtered.filter(item => new Date(item.createdAt) >= startDate);
    } else if (dateFilter.endDate) {
      const endDate = new Date(dateFilter.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => new Date(item.createdAt) <= endDate);
    }
    
    // Sort the filtered data
    return filtered.sort((a, b) => {
      const aValue = getValueByPath(a, sortConfig.column);
      const bValue = getValueByPath(b, sortConfig.column);
      
      // Handle numeric sorting
      if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
        return sortConfig.direction === 'asc' 
          ? Number(aValue) - Number(bValue)
          : Number(bValue) - Number(aValue);
      }
      
      // Handle date sorting
      if (sortConfig.column === 'createdAt') {
        return sortConfig.direction === 'asc'
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      
      // Default to string comparison
      const aString = String(aValue || '').toLowerCase();
      const bString = String(bValue || '').toLowerCase();
      
      return sortConfig.direction === 'asc'
        ? aString.localeCompare(bString)
        : bString.localeCompare(aString);
    });
  };

  // Get value by nested path like 'customsDetails.preferredAduana'
  const getValueByPath = (obj: any, path: string) => {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  };

  // Toggle sorting
  const toggleSort = (column: string) => {
    setSortConfig({
      column,
      direction: sortConfig.column === column && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  // Filtered and sorted quotes
  const filteredQuotes = getFilteredQuotes();

  // Estado para controlar visibilidade do componente de PDF
  const [showPDFExport, setShowPDFExport] = useState(false);
  const [selectedQuotesData, setSelectedQuotesData] = useState<QuoteReport[]>([]);
  const [pdfFileName, setPdfFileName] = useState('');
  
  // Export selected quotes as PDF - abordagem direta com renderização inline
  const exportSelectedQuotes = () => {
    if (selectedQuotes.length === 0) return;
    
    // Obter as cotações completas selecionadas
    const quotesData = filteredQuotes.filter(q => selectedQuotes.includes(q.id));
    
    // Criar um nome de arquivo com data atual
    const fileName = `cotacoes-selecionadas-${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Renderizar o PDF diretamente em uma nova janela/aba
    const win = window.open('', '_blank');
    if (!win) {
      toast({
        title: "Erro ao exportar PDF",
        description: "O popup foi bloqueado pelo navegador. Por favor, permita popups e tente novamente.",
        variant: "destructive"
      });
      return;
    }
    
    // Mostrar mensagem de carregamento
    win.document.write(`
      <html>
        <head>
          <title>Gerando PDF...</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding-top: 50px; }
            .loader { border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; width: 50px; height: 50px; animation: spin 2s linear infinite; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <h2>Preparando seu PDF...</h2>
          <div class="loader"></div>
          <p>Por favor, aguarde. O download iniciará automaticamente.</p>
        </body>
      </html>
    `);
    
    // Fechar a janela temporária depois que o PDF for baixado
    setSelectedQuotesData(quotesData);
    setPdfFileName(fileName);
    setShowPDFExport(true);
    
    // Usar um método mais confiável para clicar no link após renderização completa
    setTimeout(() => {
      const pdfLink = document.querySelector('.pdf-download-link') as HTMLAnchorElement;
      if (pdfLink) {
        // Capturar o URL do PDF
        const pdfUrl = pdfLink.href;
        
        // Usar o URL para abrir/baixar o PDF na janela temporária
        if (pdfUrl) {
          win.location.href = pdfUrl;
          
          // Limpar estado após download iniciado
          setTimeout(() => {
            setShowPDFExport(false);
          }, 1000);
        } else {
          win.close();
          toast({
            title: "Erro na geração do PDF",
            description: "Não foi possível gerar o PDF. Tente novamente.",
            variant: "destructive"
          });
        }
      } else {
        win.close();
        toast({
          title: "Erro na geração do PDF",
          description: "Componente de PDF não encontrado. Tente novamente.",
          variant: "destructive"
        });
      }
    }, 500); // Tempo maior para garantir renderização completa
  };

  // Generate Excel file for quote data with advanced formatting
  const generateExcel = () => {
    if (selectedQuotes.length === 0) return;
    
    const selectedData = filteredQuotes.filter(q => selectedQuotes.includes(q.id));
    
    // Usar a função utilitária para criar o Excel
    try {
      exportQuotesToExcel(selectedData, `cotacoes_${new Date().toISOString().slice(0, 10)}.xlsx`);
      
      toast({
        title: "Exportação concluída",
        description: `${selectedData.length} cotações exportadas para Excel com sucesso.`,
        duration: 3000
      });
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar as cotações para Excel.",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* PDF Download Component - escondido, mas acessível para clique automático */}
      {showPDFExport && (
        <div className="hidden">
          <MultipleQuotesPDFButton 
            quotes={selectedQuotesData as any[]} 
            fileName={pdfFileName}
            buttonClassName="pdf-download-link"
          />
        </div>
      )}
      
      {/* Conteúdo principal - apenas cotações */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Relatório de Cotações</CardTitle>
            <p className="text-sm text-muted-foreground">
              Visão geral de todas as cotações realizadas.
            </p>
          </CardHeader>
          <CardContent>
            {/* Filters and Actions */}
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar cotações..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={generateExcel}
                    disabled={selectedQuotes.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                </div>
              </div>
              
              {/* Filtros avançados */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Select value={filterBy} onValueChange={setFilterBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os períodos</SelectItem>
                      <SelectItem value="lastWeek">Última semana</SelectItem>
                      <SelectItem value="lastMonth">Último mês</SelectItem>
                      <SelectItem value="withClient">Com cliente</SelectItem>
                      <SelectItem value="withoutClient">Sem cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os clientes</SelectItem>
                      {clientsData && clientsData.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Input
                    type="date"
                    placeholder="Data inicial"
                    value={dateFilter.startDate}
                    onChange={(e) => setDateFilter({
                      ...dateFilter,
                      startDate: e.target.value
                    })}
                  />
                </div>
                
                <div>
                  <Input
                    type="date"
                    placeholder="Data final"
                    value={dateFilter.endDate}
                    onChange={(e) => setDateFilter({
                      ...dateFilter,
                      endDate: e.target.value
                    })}
                  />
                </div>
              </div>
            </div>
            
            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox 
                        checked={filteredQuotes.length > 0 && selectedQuotes.length === filteredQuotes.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Selecionar todas"
                      />
                    </TableHead>
                    <TableHead className="w-[100px]">
                      <Button 
                        variant="ghost" 
                        onClick={() => toggleSort('id')}
                        className="font-medium flex items-center"
                      >
                        ID
                        {sortConfig.column === 'id' && (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[120px]">
                      <Button 
                        variant="ghost" 
                        onClick={() => toggleSort('createdAt')}
                        className="font-medium flex items-center"
                      >
                        Data
                        {sortConfig.column === 'createdAt' && (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        onClick={() => toggleSort('originCity')}
                        className="font-medium flex items-center"
                      >
                        Origem
                        {sortConfig.column === 'originCity' && (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        onClick={() => toggleSort('destinationCity')}
                        className="font-medium flex items-center"
                      >
                        Destino
                        {sortConfig.column === 'destinationCity' && (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        onClick={() => toggleSort('tonnage')}
                        className="font-medium flex items-center"
                      >
                        Toneladas
                        {sortConfig.column === 'tonnage' && (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        onClick={() => toggleSort('aduanaBr')}
                        className="font-medium flex items-center"
                      >
                        Aduana
                        {sortConfig.column === 'aduanaBr' && (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        onClick={() => toggleSort('costPerTon')}
                        className="font-medium flex items-center"
                      >
                        USD/Ton
                        {sortConfig.column === 'costPerTon' && (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        Carregando cotações...
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-red-500">
                        Erro ao carregar dados.
                      </TableCell>
                    </TableRow>
                  ) : filteredQuotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        Nenhuma cotação encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuotes.map((quote) => (
                      <TableRow key={quote.id} className={selectedQuotes.includes(quote.id) ? "bg-muted/40" : undefined}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedQuotes.includes(quote.id)}
                            onCheckedChange={() => toggleQuoteSelection(quote.id)}
                            aria-label={`Selecionar cotação ${quote.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          #{quote.id.slice(0, 5)}
                        </TableCell>
                        <TableCell>
                          {new Date(quote.createdAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {formatLocation(quote.customsDetails?.originLocation || quote.originCity || quote.origin)}
                          <Badge variant="outline" className="ml-2 text-xs">
                            {quote.origin?.includes('Brasil') || quote.origin?.includes('BR') ? 'BR' : 'PY'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatLocation(quote.customsDetails?.destinationLocation || quote.destinationCity || quote.destination)}
                          <Badge variant="outline" className="ml-2 text-xs">
                            {quote.destination?.includes('Brasil') || quote.destination?.includes('BR') ? 'BR' : 'PY'}
                          </Badge>
                        </TableCell>
                        <TableCell>{Number(quote.tonnage).toLocaleString('pt-BR')}</TableCell>
                        <TableCell>{quote.aduanaBr || quote.recommendedAduana || 'N/A'}</TableCell>
                        <TableCell className="font-semibold">
                          {Math.round(Number(quote.costPerTon || 0))}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <PDFDownloadButton
                              data={quote as any}
                              fileName={`cotacao-${quote.id.slice(0, 5)}-${new Date(quote.createdAt).toISOString().split('T')[0]}.pdf`}
                              buttonText={<Download className="h-4 w-4" />}
                              buttonClassName="h-8 w-8 p-0 flex items-center justify-center"
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => setSelectedQuote(quote as CostDetailsQuote)}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Botão de "Carregar Mais" */}
            {!isLoading && hasMore && filteredQuotes.length > 0 && (
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
            {!hasMore && filteredQuotes.length > 0 && (
              <div className="text-center my-6 text-neutral-500 text-sm">
                Você chegou ao fim dos resultados.
              </div>
            )}
            
            {/* Selection summary */}
            {selectedQuotes.length > 0 && (
              <div className="mt-4 flex items-center justify-between bg-muted p-3 rounded-md">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">
                    {selectedQuotes.length} {selectedQuotes.length === 1 ? 'cotação selecionada' : 'cotações selecionadas'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedQuotes([])}
                  >
                    Limpar seleção
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={exportSelectedQuotes}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Exportar selecionadas
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Modal de detalhes dos custos */}
      <CostDetailsDialog 
        quote={selectedQuote} 
        onClose={() => setSelectedQuote(null)} 
      />
    </div>
  );
}