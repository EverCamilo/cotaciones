import React from "react";
import { 
  Toast, 
  ToastTitle, 
  ToastDescription, 
  ToastClose, 
  ToastAction, 
  type ToastProps,
} from "@/components/ui/toast";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { type VariantProps } from "class-variance-authority";
import { 
  AlertCircle, 
  CheckCircle, 
  Info, 
  AlertTriangle, 
  Bell, 
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

// Tipos de ícones associados a cada variante
const VARIANT_ICONS: Record<string, LucideIcon> = {
  default: Bell,
  success: CheckCircle,
  destructive: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

// Tamanhos dos ícones
const ICON_SIZES = {
  sm: 16,
  md: 18,
  lg: 20
};

export interface ToastWithIconProps extends Omit<ToastProps, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  iconSize?: keyof typeof ICON_SIZES;
  icon?: LucideIcon; // Permitir ícone personalizado
  hideIcon?: boolean;
}

/**
 * Versão aprimorada do Toast com ícones baseados na variante
 */
export function ToastWithIcon({
  title,
  description,
  action,
  variant = "default",
  iconSize = "md",
  icon: CustomIcon,
  hideIcon = false,
  className,
  ...props
}: ToastWithIconProps) {
  // Determinar qual ícone usar (personalizado ou baseado na variante)
  const IconComponent = CustomIcon || VARIANT_ICONS[variant as string] || Bell;
  const iconSizeValue = ICON_SIZES[iconSize];
  
  return (
    <Toast variant={variant} className={cn("flex items-start gap-3", className)} {...props}>
      {!hideIcon && (
        <div className="flex-shrink-0 self-start mt-1">
          <IconComponent size={iconSizeValue} />
        </div>
      )}
      
      <div className="flex-grow">
        {title && <ToastTitle>{title}</ToastTitle>}
        {description && <ToastDescription>{description}</ToastDescription>}
      </div>
      
      {action && <ToastAction altText="Action" className="ml-auto">{action}</ToastAction>}
      <ToastClose />
    </Toast>
  );
}

/**
 * Componente específico para toast de sucesso
 */
export function SuccessToast(props: Omit<ToastWithIconProps, "variant">) {
  return <ToastWithIcon variant="success" {...props} />;
}

/**
 * Componente específico para toast de erro
 */
export function ErrorToast(props: Omit<ToastWithIconProps, "variant">) {
  return <ToastWithIcon variant="destructive" {...props} />;
}

/**
 * Componente específico para toast de aviso
 */
export function WarningToast(props: Omit<ToastWithIconProps, "variant">) {
  return <ToastWithIcon variant="warning" {...props} />;
}

/**
 * Componente específico para toast informativo
 */
export function InfoToast(props: Omit<ToastWithIconProps, "variant">) {
  return <ToastWithIcon variant="info" {...props} />;
}