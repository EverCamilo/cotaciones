import React from 'react';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  PDFDownloadLink,
  Image
} from '@react-pdf/renderer';
import logoImage from '@/assets/images/logo.png';
import { FreightQuote } from '@/contexts/FreightContext';

// Função para limpar strings de localização vindas do banco de dados
const formatLocationString = (location: string | undefined): string => {
  if (!location) return '';
  
  // Remove aspas do início e do fim da string, se houver
  return location.replace(/^["']|["']$/g, '');
};

// Definindo estilos para o PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#0C4A6E',
    borderBottomStyle: 'solid',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0C4A6E',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#555555',
    marginBottom: 10,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderStyle: 'solid',
    marginBottom: 10,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    borderBottomStyle: 'solid',
    minHeight: 20,
  },
  tableHeader: {
    backgroundColor: '#F0F9FF',
    color: '#0C4A6E',
    fontWeight: 'bold',
    fontSize: 9,
    padding: 5,
  },
  tableCell: {
    fontSize: 8,
    padding: 4,
    color: '#333333',
  },
  altRow: {
    backgroundColor: '#F9FAFB',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 9,
    textAlign: 'center',
    color: '#666666',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    borderTopStyle: 'solid',
    paddingTop: 10,
  },
  date: {
    fontSize: 10,
    color: '#666666',
    marginTop: 5,
    textAlign: 'right',
  },
  logo: {
    width: 80,
    height: 60,
    objectFit: 'contain',
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  // Ajustando larguras das colunas para caber melhor na página
  colDate: { width: '8%' },
  colClient: { width: '12%' },
  colOrigin: { width: '18%' },
  colDestination: { width: '18%' },
  colProduct: { width: '10%' },
  colTonnage: { width: '8%' },
  colCustoms: { width: '12%' },
  colCost: { width: '7%' },
  colTotal: { width: '7%' },
  // Divisor de cliente
  clientDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderBottomStyle: 'solid',
    marginTop: 2,
    marginBottom: 2,
  },
});

// Atualizar a interface FreightQuote para incluir createdAt para fins deste componente
interface ExtendedFreightQuote extends FreightQuote {
  createdAt?: string;
  clientName?: string;
  originCity?: string;
  destinationCity?: string;
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
}

// Formatadores
const formatCurrency = (value: number | string, currency = 'USD') => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '—';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(numValue);
};

// Formatar data
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  } catch (e) {
    return dateString;
  }
};

// Componente de documento PDF para múltiplas cotações
const MultipleQuotesPDF: React.FC<{ quotes: ExtendedFreightQuote[] }> = ({ quotes }) => {
  // Gerar a data do relatório com base na última cotação, se disponível,
  // ou usar a data atual se não houver cotações ou datas
  const getReportDate = () => {
    if (quotes.length > 0) {
      // Organizar as cotações por data de criação (mais recente primeiro)
      const sortedQuotes = [...quotes].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Ordenação decrescente
      });
      
      // Usar a data da cotação mais recente
      if (sortedQuotes[0].createdAt) {
        return formatDate(sortedQuotes[0].createdAt);
      }
    }
    // Fallback para a data atual se não houver cotações com data
    return new Date().toLocaleDateString('pt-BR');
  };
  
  const reportDate = getReportDate();
  
  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="landscape">
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'column' }}>
            <Text style={styles.title}>Relatório de Cotações de Frete Internacional</Text>
            <Text style={styles.subtitle}>Brasil ↔ Paraguai | Data de Emissão: {reportDate}</Text>
            <Text style={styles.date}>Total de cotações: {quotes.length}</Text>
          </View>
          <Image src={logoImage} style={styles.logo} />
        </View>
        
        {/* Tabela de Cotações */}
        <View style={styles.table}>
          {/* Cabeçalho da tabela */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.colDate, styles.tableHeader]}>Data</Text>
            <Text style={[styles.colClient, styles.tableHeader]}>Cliente</Text>
            <Text style={[styles.colOrigin, styles.tableHeader]}>Origem</Text>
            <Text style={[styles.colDestination, styles.tableHeader]}>Destino</Text>
            <Text style={[styles.colProduct, styles.tableHeader]}>Produto</Text>
            <Text style={[styles.colTonnage, styles.tableHeader]}>Toneladas</Text>
            <Text style={[styles.colCustoms, styles.tableHeader]}>Aduana</Text>
            <Text style={[styles.colCost, styles.tableHeader]}>USD/Ton</Text>
            <Text style={[styles.colTotal, styles.tableHeader]}>Câmbio USD/BRL</Text>
          </View>
          
          {/* Agrupar cotações por cliente */}
          {(() => {
            // Agrupar cotações por cliente
            const groupedByClient = quotes.reduce((acc, quote) => {
              const clientKey = quote.clientName || 'Sem cliente';
              if (!acc[clientKey]) acc[clientKey] = [];
              acc[clientKey].push(quote);
              return acc;
            }, {} as Record<string, ExtendedFreightQuote[]>);
            
            // Renderizar as cotações agrupadas
            let rowIndex = 0;
            return Object.entries(groupedByClient).flatMap(([clientName, clientQuotes]) => {
              // Criar uma linha de separador para o cliente
              const rows = clientQuotes.map((quote, index) => {
                // Verificar se é aduana BR ou recomendada
                const aduana = quote.customsDetails?.customsPoint || quote.aduanaBr || quote.recommendedAduana || '—';
                
                // Obter origem e destino, usando localização completa do customsDetails se disponível
                const origin = formatLocationString(quote.customsDetails?.originLocation) || 
                              quote.originCity || 
                              formatLocationString(quote.origin) || 
                              '—';
                
                const destination = formatLocationString(quote.customsDetails?.destinationLocation) || 
                                  quote.destinationCity || 
                                  formatLocationString(quote.destination) || 
                                  '—';
                
                // Produto
                const product = quote.specificProduct || quote.productType || '—';
                
                // Incrementar índice de linha para alternar cores
                rowIndex++;
                
                return (
                  <View key={`quote-${index}-${rowIndex}`} style={[
                    styles.tableRow, 
                    rowIndex % 2 === 1 ? styles.altRow : {}
                  ]}>
                    <Text style={[styles.colDate, styles.tableCell]}>
                      {formatDate(quote.createdAt || '')}
                    </Text>
                    <Text style={[styles.colClient, styles.tableCell]}>
                      {clientName !== 'Sem cliente' ? clientName : '—'}
                    </Text>
                    <Text style={[styles.colOrigin, styles.tableCell]}>
                      {formatLocationString(origin)}
                    </Text>
                    <Text style={[styles.colDestination, styles.tableCell]}>
                      {formatLocationString(destination)}
                    </Text>
                    <Text style={[styles.colProduct, styles.tableCell]}>
                      {product}
                    </Text>
                    <Text style={[styles.colTonnage, styles.tableCell]}>
                      {typeof quote.tonnage === 'number' 
                        ? quote.tonnage.toLocaleString('pt-BR')
                        : quote.tonnage || '—'}
                    </Text>
                    <Text style={[styles.colCustoms, styles.tableCell]}>
                      {aduana}
                    </Text>
                    <Text style={[styles.colCost, styles.tableCell]}>
                      {Math.round(Number(quote.costPerTon || 0))}
                    </Text>
                    <Text style={[styles.colTotal, styles.tableCell]}>
                      {quote.exchangeRate ? `R$ ${Number(quote.exchangeRate).toFixed(2)}` : '—'}
                    </Text>
                  </View>
                );
              });
              
              return rows;
            });
          })()}
        </View>
        
        {/* Rodapé */}
        <Text style={styles.footer}>
          Relatório gerado automaticamente pelo sistema Trans Fenix - {reportDate}
        </Text>
      </Page>
    </Document>
  );
};

// Componente para o botão de download
export const MultipleQuotesPDFButton: React.FC<{ 
  quotes: ExtendedFreightQuote[], 
  fileName?: string,
  buttonText?: React.ReactNode,
  loading?: boolean,
  buttonClassName?: string,
  onClick?: () => void
}> = ({ 
  quotes, 
  fileName = 'relatorio-cotacoes.pdf', 
  buttonText = 'Baixar PDF',
  loading = false,
  buttonClassName,
  onClick
}) => {
  // Gere um nome de arquivo com timestamp para evitar duplicação
  const actualFileName = fileName.includes('.pdf') ? 
    fileName : 
    `${fileName}-${new Date().getTime()}.pdf`;
  
  // Só renderiza o PDFDownloadLink quando necessário (lazy loading)
  const [renderPDF, setRenderPDF] = React.useState(false);
  
  // Se estamos em modo carregado inicial (quando o componente é montado),
  // não renderizamos o PDFDownloadLink ainda para economizar recursos
  React.useEffect(() => {
    // Se temos um onClick prop, significa que estamos esperando um clique explícito,
    // então não renderizamos o PDF até que o botão seja clicado
    if (!onClick) {
      // Pequeno atraso para melhorar a performance na carga da página
      const timer = setTimeout(() => {
        setRenderPDF(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [onClick]);
  
  // Função para lidar com o clique no botão
  const handleClick = (event: React.MouseEvent) => {
    // Se não estamos renderizando ainda, começamos a renderizar agora
    if (!renderPDF) {
      setRenderPDF(true);
    }
    // Chamamos o onClick do componente pai, se existir
    if (onClick) {
      onClick();
    }
  };
    
  return renderPDF ? (
    <PDFDownloadLink 
      document={<MultipleQuotesPDF quotes={quotes} />} 
      fileName={actualFileName}
      className={buttonClassName}
      style={{ textDecoration: 'none' }}
      onClick={onClick}
    >
      {({ blob, url, loading: pdfLoading, error }) => (
        <div className="flex items-center gap-2">
          {loading || pdfLoading ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              <span>Gerando PDF...</span>
            </>
          ) : error ? (
            <>
              <span className="text-destructive">Erro ao gerar PDF</span>
            </>
          ) : (
            buttonText
          )}
        </div>
      )}
    </PDFDownloadLink>
  ) : (
    // Renderizar apenas o botão sem o PDFDownloadLink até que seja necessário
    <button 
      className={buttonClassName} 
      onClick={handleClick}
      style={{ textDecoration: 'none' }}
    >
      <div className="flex items-center gap-2">
        {buttonText}
      </div>
    </button>
  );
};

export default MultipleQuotesPDF;