import React from 'react';
import { useRealtimeSyncContext } from '@/contexts/RealtimeSyncContext';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SyncStatusProps {
  variant?: 'icon' | 'badge' | 'button';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

// Versão simplificada que apenas mostra um ícone sem funcionalidade
export function SyncStatus({
  variant = 'badge',
  size = 'md',
  className,
  showTooltip = true
}: SyncStatusProps) {
  // Tamanhos dos ícones
  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20
  };
  
  // Classes para variantes
  const classes = {
    icon: cn(
      "flex items-center justify-center",
      "text-success",
      className
    ),
    badge: cn(
      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
      "bg-success/10 text-success",
      className
    ),
    button: cn(
      "inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors",
      "bg-success/10 text-success hover:bg-success/20",
      className
    )
  };
  
  // Conteúdo sempre mostrando como sincronizado
  const getContent = () => {
    const iconSize = iconSizes[size];
    return (
      <>
        <Wifi size={iconSize} className="mr-1" />
        {variant !== 'icon' && <span>Dados Carregados</span>}
      </>
    );
  };
  
  // Renderização com ou sem tooltip
  const content = (
    <div className={classes[variant]}>
      {getContent()}
    </div>
  );
  
  // Conteúdo do botão ou do elemento padrão
  const buttonContent = (
    <Button 
      variant="ghost" 
      size="sm" 
      className={classes.button}
    >
      {getContent()}
    </Button>
  );
  
  // Se for botão
  if (variant === 'button') {
    return showTooltip ? (
      <Tooltip>
        <TooltipTrigger asChild>
          {buttonContent}
        </TooltipTrigger>
        <TooltipContent>Dados carregados corretamente</TooltipContent>
      </Tooltip>
    ) : buttonContent;
  }
  
  // Para outras variantes
  return showTooltip ? (
    <Tooltip>
      <TooltipTrigger asChild>
        {content}
      </TooltipTrigger>
      <TooltipContent>Dados carregados corretamente</TooltipContent>
    </Tooltip>
  ) : content;
}