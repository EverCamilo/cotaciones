import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';
import { FreightQuote } from '@/contexts/FreightContext';
import { toast } from '@/hooks/use-toast';
import { exportQuoteToExcel } from '@/utils/exportUtils';

interface ExportButtonProps {
  quote: FreightQuote;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  showPDFOption?: boolean;
  onExportPDF?: () => void;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  quote,
  variant = 'outline',
  size = 'sm',
  disabled = false,
  showPDFOption = true,
  onExportPDF
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const timestamp = new Date().toISOString().slice(0, 10);
      const fileName = `cotacao_${quote.id?.substring(0, 8)}_${timestamp}.xlsx`;

      exportQuoteToExcel(quote, fileName);
      
      toast({
        title: "Exportação concluída",
        description: `Cotação exportada para Excel com sucesso.`,
        duration: 3000
      });
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar a cotação para Excel.",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    if (onExportPDF) {
      onExportPDF();
    } else {
      toast({
        title: "Função indisponível",
        description: "A exportação para PDF não está configurada para esta cotação.",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isExporting}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportExcel} disabled={isExporting}>
          Exportar para Excel
        </DropdownMenuItem>
        
        {showPDFOption && (
          <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
            Exportar para PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportButton;