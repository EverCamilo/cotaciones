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
import { FreightQuote, CostItem } from '@/contexts/FreightContext';

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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0C4A6E',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 10,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: '#F0F9FF',
    padding: 8,
    marginBottom: 10,
    color: '#0C4A6E',
    borderRadius: 3,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  column: {
    flexDirection: 'column',
    marginBottom: 10,
  },
  label: {
    width: '40%',
    fontWeight: 'bold',
    fontSize: 11,
  },
  value: {
    width: '60%',
    fontSize: 11,
  },
  costItem: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    borderBottomStyle: 'solid',
    paddingVertical: 5,
  },
  costLabel: {
    width: '50%',
    fontSize: 10,
  },
  costDetails: {
    width: '30%',
    fontSize: 9,
    color: '#666666',
  },
  costValue: {
    width: '20%',
    fontSize: 10,
    textAlign: 'right',
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
  },
  tableHeader: {
    backgroundColor: '#F0F9FF',
    color: '#0C4A6E',
    fontWeight: 'bold',
    fontSize: 10,
    padding: 5,
  },
  tableCell: {
    fontSize: 9,
    padding: 5,
    color: '#333333',
  },
  recommended: {
    color: '#047857',
    fontWeight: 'bold',
  },
  col10: { width: '10%' },
  col15: { width: '15%' },
  col20: { width: '20%' },
  col25: { width: '25%' },
  col30: { width: '30%' },
  col35: { width: '35%' },
  col40: { width: '40%' },
  col50: { width: '50%' },
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
  subtotal: {
    fontWeight: 'bold',
    fontSize: 10,
    borderTopWidth: 1,
    borderTopColor: '#CCCCCC',
    borderTopStyle: 'solid',
    paddingTop: 5,
  },
  total: {
    fontWeight: 'bold',
    fontSize: 11,
    color: '#0C4A6E',
    borderTopWidth: 2,
    borderTopColor: '#0C4A6E',
    borderTopStyle: 'solid',
    paddingTop: 5,
  },
  highlightBox: {
    backgroundColor: '#F0F9FF',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#0C4A6E',
    borderLeftStyle: 'solid',
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0C4A6E',
    marginBottom: 5,
  },
  highlightValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0E7490',
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  summaryLabel: {
    width: '60%',
    fontSize: 10,
    fontWeight: 'bold',
  },
  summaryValue: {
    width: '40%',
    fontSize: 10,
    textAlign: 'right',
  },
  reference: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#666666',
    marginTop: 2,
  },
  logo: {
    width: 80,
    height: 60,
    objectFit: 'contain',
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  note: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#777777',
    marginTop: 3,
  },
  date: {
    fontSize: 10,
    color: '#666666',
    marginTop: 5,
    textAlign: 'right',
  },
});

// Formatadores
const formatCurrency = (value: number, currency = 'USD') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
};

// Formatar data
const formatDate = (dateString?: string): string => {
  try {
    if (!dateString) return new Date().toLocaleDateString('pt-BR');
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  } catch (e) {
    return new Date().toLocaleDateString('pt-BR');
  }
};

// Componente de documento PDF
const QuotePDF: React.FC<{ data: FreightQuote }> = ({ data }) => {
  // Usar a data de criação da cotação, se disponível
  const quoteDate = formatDate(data.createdAt);
  
  // Aduana recomendada
  const recommendedAduana = data.recommendedAduana || 'Não disponível';
  
  // Verificar se aduanaComparison é um array ou um objeto (do Firebase)
  let aduanaComparisonArray: Array<any> = [];
  if (data.aduanaComparison) {
    if (Array.isArray(data.aduanaComparison)) {
      aduanaComparisonArray = data.aduanaComparison;
    } else if (typeof data.aduanaComparison === 'object') {
      // Converter de objeto para array (estrutura do Firebase)
      aduanaComparisonArray = Object.entries(data.aduanaComparison)
        .filter(([key]) => !isNaN(Number(key)))
        .map(([_, value]) => value);
    }
  }
  
  // Encontrar a aduana recomendada nos detalhes de comparação
  const recommendedDetails = aduanaComparisonArray.find((a: any) => a?.name === recommendedAduana);
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'column' }}>
            <Text style={styles.title}>Cotação de Frete Internacional</Text>
            <Text style={styles.subtitle}>Brasil ↔ Paraguai | Data: {quoteDate}</Text>
            <Text style={styles.date}>Ref: {`QUOTE-${Math.floor(Math.random() * 9000) + 1000}-${new Date().getFullYear()}`}</Text>
          </View>
          <Image src={logoImage} style={styles.logo} />
        </View>
        
        {/* Informações do Cliente */}
        {data.clientName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informações do Cliente</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Cliente:</Text>
              <Text style={styles.value}>{data.clientName}</Text>
            </View>
          </View>
        )}
        
        {/* Resumo da Cotação */}
        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>Aduana Recomendada: {recommendedAduana}</Text>
          <Text style={styles.highlightValue}>
            {Math.round(Number(data.costPerTon || 0))}/ton
          </Text>
          <Text style={styles.reference}>
            Embarque: {data.tonnage?.toLocaleString('pt-BR') || 0} toneladas
          </Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Custo Base (sem margem):</Text>
            <Text style={styles.summaryValue}>
              {Math.round(Number((data.costPerTon || 0) - (data.marginPerTon || data.profitMargin || 0)))}/ton
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Margem de Lucro:</Text>
            <Text style={styles.summaryValue}>
              {Math.round(Number(data.marginPerTon || data.profitMargin || 0))}/ton
            </Text>
          </View>
          <Text style={styles.reference}>
            Taxa de câmbio: $1 USD = R$ {data.exchangeRate?.toFixed(2) || '0.00'} BRL
          </Text>
        </View>
        
        {/* Detalhes da Rota */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhes da Rota</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Origem:</Text>
            <Text style={styles.value}>
              {formatLocationString(data.customsDetails?.originLocation || data.origin)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Destino:</Text>
            <Text style={styles.value}>
              {formatLocationString(data.customsDetails?.destinationLocation || data.destination)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Aduana:</Text>
            <Text style={styles.value}>{data.customsDetails?.customsPoint || recommendedAduana}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Distância Total:</Text>
            <Text style={styles.value}>{Math.round(data.totalDistance || 0)} km</Text>
          </View>
          {data.routeSegments && (
            <View style={styles.column}>
              <Text style={styles.note}>Origem até Aduana PY: {Math.round(data.routeSegments.originToCustoms || 0)} km</Text>
              <Text style={styles.note}>Aduana BR até Destino: {Math.round(data.routeSegments.customsToDestination || 0)} km</Text>
            </View>
          )}
        </View>
        
        {/* Detalhes da Carga */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhes da Carga</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Tipo de Produto:</Text>
            <Text style={styles.value}>{data.productType || 'Não especificado'} - {data.specificProduct || ''}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tonelagem:</Text>
            <Text style={styles.value}>{data.tonnage?.toLocaleString('pt-BR')} toneladas</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Caminhões Necessários:</Text>
            <Text style={styles.value}>{data.requiredTrucks} caminhões</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Valor da Mercadoria:</Text>
            <Text style={styles.value}>{formatCurrency(data.merchandiseValue || 0)}</Text>
          </View>
        </View>
        

        
        {/* Detalhamento de Custos */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Detalhamento de Custos</Text>
          <View style={styles.table}>
            {(() => {
              // Verifica se costBreakdown é um array ou um objeto (do Firebase)
              let costItems: Array<any> = [];
              if (data.costBreakdown) {
                if (Array.isArray(data.costBreakdown)) {
                  costItems = data.costBreakdown;
                } else if (typeof data.costBreakdown === 'object') {
                  // Converter de objeto para array (estrutura do Firebase)
                  costItems = Object.entries(data.costBreakdown)
                    .filter(([key]) => !isNaN(Number(key)))
                    .map(([_, value]) => value);
                }
              }
              
              return costItems.map((item: any, index: number) => {
                // Não incluir itens de referência no detalhamento (como frete base)
                if (item?.isReferenceOnly) return null;
                
                // Se for um item de margem ou total, aplicar estilo diferente
                const isSubtotal = item?.item === "Subtotal";
                const isTotal = item?.item === "Total";
                const isProfit = item?.item === "Margem de Lucro";
                
                const style = isTotal ? styles.total : 
                            isSubtotal || isProfit ? styles.subtotal : 
                            styles.costItem;
                
                return (
                  <View key={index} style={style}>
                    <Text style={styles.costLabel}>{item?.item || 'Item'}</Text>
                    <Text style={styles.costDetails}>{item?.details || ''}</Text>
                    <Text style={styles.costValue}>{formatCurrency(item?.value || 0)}</Text>
                  </View>
                );
              });
            })()}
            
            {/* Se não tiver os itens padrão de subtotal e total, adicioná-los manualmente */}
            {!data.costBreakdown || 
             (Array.isArray(data.costBreakdown) && !data.costBreakdown.some((item: any) => item?.item === "Total")) || 
             (typeof data.costBreakdown === 'object' && !Object.values(data.costBreakdown).some((item: any) => item?.item === "Total")) ? (
              <View style={styles.total}>
                <Text style={styles.costLabel}>Total</Text>
                <Text style={styles.costDetails}></Text>
                <Text style={styles.costValue}>{formatCurrency(data.totalCost || 0)}</Text>
              </View>
            ) : null}
          </View>
        </View>
        
        {/* Seção de comparação de aduanas removida conforme solicitado */}
        
        {/* Observações adicionais */}
        {data.customsDetails?.additionalNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações Adicionais</Text>
            <Text style={styles.value}>{data.customsDetails.additionalNotes}</Text>
          </View>
        )}
        
        {/* Rodapé */}
        <Text style={styles.footer}>
          Cotação gerada automaticamente pelo sistema Trans Fenix - Válida por 7 dias a partir da data de emissão.
          Os valores apresentados são apenas para referência e podem sofrer alterações.
        </Text>
      </Page>
    </Document>
  );
};

// Componente para o botão de download
export const PDFDownloadButton: React.FC<{ 
  data: FreightQuote, 
  fileName?: string,
  buttonText?: React.ReactNode,
  loading?: boolean,
  buttonClassName?: string
}> = ({ 
  data, 
  fileName = 'cotacao-frete.pdf', 
  buttonText = 'Baixar PDF',
  loading = false,
  buttonClassName
}) => {
  // Gere um nome de arquivo com timestamp para evitar duplicação
  const actualFileName = fileName.includes('.pdf') ? 
    fileName : 
    `${fileName}-${new Date().getTime()}.pdf`;
    
  return (
    <PDFDownloadLink 
      document={<QuotePDF data={data} />} 
      fileName={actualFileName}
      className={buttonClassName}
      style={{ textDecoration: 'none' }}
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
  );
};

export default QuotePDF;