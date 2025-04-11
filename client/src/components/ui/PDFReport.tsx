import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { FreightQuote, CostItem, AduanaDetails } from '../../contexts/FreightContext';

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    padding: 30
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#112F59',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#0F4C81',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  logo: {
    width: 25,
    height: 25
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F4C81'
  },
  subtitle: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4
  },
  quoteDate: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'right'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#343a40',
    paddingTop: 5,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6'
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1'
  },
  column: {
    flex: 1
  },
  label: {
    fontSize: 10,
    color: '#6c757d'
  },
  value: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#212529'
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginTop: 10
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6'
  },
  tableCol: {
    flex: 1,
    padding: 8
  },
  tableHeader: {
    backgroundColor: '#f8f9fa'
  },
  tableCell: {
    fontSize: 10,
    color: '#212529'
  },
  totalRow: {
    backgroundColor: '#e8f4fc',
    fontWeight: 'bold'
  },
  footer: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    paddingTop: 10,
    fontSize: 10,
    color: '#6c757d',
    textAlign: 'center'
  },
  aduanaComparison: {
    flexDirection: 'row',
    marginTop: 15,
    justifyContent: 'space-between'
  },
  aduanaCard: {
    width: '30%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 4
  },
  recommendedAduana: {
    borderColor: '#28a745',
    backgroundColor: '#f8fff8'
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: '#f8f9fa',
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 4
  },
  mapText: {
    color: '#6c757d',
    fontSize: 12
  }
});

interface PDFReportProps {
  freightQuote: FreightQuote;
}

const formatCurrency = (amount: number | undefined, currency: string) => {
  if (amount === undefined) return '-';
  
  return `${currency} ${amount.toFixed(2)}`;
};

const PDFReport: React.FC<PDFReportProps> = ({ freightQuote }) => {
  const currentDate = new Date().toLocaleDateString('pt-BR');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLogo}>
            <View style={styles.logoContainer}>
              {/* Truck icon as SVG */}
              <Image src={{ uri: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtdHJ1Y2siPjxwYXRoIGQ9Ik04IDE3aDIiLz48cGF0aCBkPSJNMTQgMTdoMiIvPjxwYXRoIGQ9Ik0zIDE3VjZhMSAxIDAgMCAxIDEtMWg5djEyIi8+PHBhdGggZD0iTTEzIDNoOGwyIDR2MTBoLTEwVjMiLz48cGF0aCBkPSJNOCAxOWEyIDIgMCAxIDAgMC00IDIgMiAwIDAgMCAwIDQiLz48cGF0aCBkPSJNMTYgMTlhMiAyIDAgMSAwIDAtNCAyIDIgMCAwIDAgMCA0Ii8+PC9zdmc+" }} style={styles.logo} />
            </View>
            <View>
              <Text style={styles.title}>Trans Fenix</Text>
              <Text style={styles.subtitle}>Calculadora de Frete Internacional</Text>
            </View>
          </View>
          <View>
            <Text style={styles.quoteDate}>Data: {currentDate}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhes da Cotação</Text>
          
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Origem (Paraguai)</Text>
              <Text style={styles.value}>{freightQuote.origin}</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Destino (Brasil)</Text>
              <Text style={styles.value}>{freightQuote.destination}</Text>
            </View>
          </View>
          
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Tipo de Produto</Text>
              <Text style={styles.value}>{freightQuote.productType}</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Quantidade (Toneladas)</Text>
              <Text style={styles.value}>{freightQuote.tonnage} ton</Text>
            </View>
          </View>
          
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Pagamento do Motorista</Text>
              <Text style={styles.value}>R$ {freightQuote.driverPayment?.toFixed(2)}/ton</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Margem de Lucro</Text>
              <Text style={styles.value}>$ {freightQuote.profitMargin?.toFixed(2)}/ton</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo da Cotação</Text>
          
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Aduana Recomendada</Text>
              <Text style={styles.value}>{freightQuote.recommendedAduana}</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Custo Total</Text>
              <Text style={styles.value}>{formatCurrency(freightQuote.totalCost, 'USD')}</Text>
            </View>
          </View>
          
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Custo por Tonelada</Text>
              <Text style={styles.value}>{formatCurrency(freightQuote.costPerTon, 'USD')}/ton</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Distância Total</Text>
              <Text style={styles.value}>{freightQuote.totalDistance?.toFixed(0)} km</Text>
            </View>
          </View>
          
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Caminhões Necessários</Text>
              <Text style={styles.value}>{freightQuote.requiredTrucks}</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Lucro Estimado</Text>
              <Text style={styles.value}>{formatCurrency(freightQuote.estimatedProfit, 'USD')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rota</Text>
          
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapText}>Mapa da Rota: {freightQuote.origin} → {freightQuote.destination}</Text>
            <Text style={styles.mapText}>Via {freightQuote.recommendedAduana}</Text>
          </View>
          
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Ponto de Origem</Text>
              <Text style={styles.value}>{freightQuote.origin}, Paraguai</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Aduana</Text>
              <Text style={styles.value}>{freightQuote.recommendedAduana}</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Ponto de Destino</Text>
              <Text style={styles.value}>{freightQuote.destination}, Brasil</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhamento de Custos</Text>
          
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <View style={[styles.tableCol, { flex: 2 }]}>
                <Text style={styles.tableCell}>Item</Text>
              </View>
              <View style={[styles.tableCol, { flex: 3 }]}>
                <Text style={styles.tableCell}>Detalhes</Text>
              </View>
              <View style={[styles.tableCol, { flex: 1 }]}>
                <Text style={styles.tableCell}>Valor (USD)</Text>
              </View>
            </View>
            
            {freightQuote.costBreakdown?.map((item, index) => (
              <View 
                key={index} 
                style={[
                  styles.tableRow, 
                  item.item === 'Subtotal' && styles.tableHeader,
                  item.item === 'Total' && styles.totalRow
                ]}
              >
                <View style={[styles.tableCol, { flex: 2 }]}>
                  <Text style={styles.tableCell}>{item.item}</Text>
                </View>
                <View style={[styles.tableCol, { flex: 3 }]}>
                  <Text style={styles.tableCell}>{item.details}</Text>
                </View>
                <View style={[styles.tableCol, { flex: 1 }]}>
                  <Text style={styles.tableCell}>{item.value.toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Seção de comparação de aduanas removida conforme solicitado */}

        <View style={styles.footer}>
          <Text>Trans Fenix - Calculadora de Frete Internacional</Text>
          <Text>Este documento é uma estimativa de frete e custos associados.</Text>
          <Text>Todas as informações estão sujeitas a confirmação.</Text>
        </View>
      </Page>
    </Document>
  );
};

export default PDFReport;
