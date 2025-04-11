import { cn } from "@/lib/utils";

/**
 * Componente de esqueleto para indicar estado de carregamento.
 * Usado para criar placeholders animados enquanto os dados estão carregando.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-primary/10",
        className
      )}
      {...props}
    />
  );
}

/**
 * Skeleton para texto, com altura padrão de 1rem
 */
function TextSkeleton({
  className,
  width = "100%",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  width?: string | number;
}) {
  return (
    <Skeleton
      style={{ width }}
      className={cn("h-4", className)}
      {...props}
    />
  );
}

/**
 * Skeleton para cartões, com alturas variáveis
 */
function CardSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton
      className={cn("h-40 w-full", className)}
      {...props}
    />
  );
}

/**
 * Skeleton para imagens ou avatares
 */
function ImageSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton
      className={cn("h-12 w-12 rounded-full", className)}
      {...props}
    />
  );
}

/**
 * Skeleton para barras de carregamento ou progresso
 */
function BarSkeleton({
  className,
  width = "100%",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  width?: string | number;
}) {
  return (
    <Skeleton
      style={{ width }}
      className={cn("h-2", className)}
      {...props}
    />
  );
}

/**
 * Skeleton para listas de itens
 */
function ListSkeleton({ 
  itemCount = 5, 
  itemHeight = "h-12",
  gap = "gap-2"
}: { 
  itemCount?: number;
  itemHeight?: string;
  gap?: string;
}) {
  return (
    <div className={`flex flex-col ${gap}`}>
      {Array.from({ length: itemCount }).map((_, i) => (
        <Skeleton key={i} className={itemHeight} />
      ))}
    </div>
  );
}

/**
 * Skeleton para tabelas
 */
function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  headerHeight = "h-10",
  rowHeight = "h-12",
  gap = "gap-px"
}: { 
  rows?: number;
  columns?: number;
  headerHeight?: string;
  rowHeight?: string;
  gap?: string;
}) {
  return (
    <div className={`grid ${gap}`}>
      {/* Cabeçalho */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className={headerHeight} />
        ))}
      </div>
      
      {/* Linhas */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid grid-cols-4 gap-2 my-1">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              className={rowHeight} 
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton para formulários
 */
function FormSkeleton({ 
  fields = 4,
  gap = "gap-4" 
}: { 
  fields?: number;
  gap?: string;
}) {
  return (
    <div className={`flex flex-col ${gap}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-10" />
        </div>
      ))}
      <Skeleton className="h-10 w-24 mt-4" />
    </div>
  );
}

// Exportar o componente principal e as variantes especializadas
export { 
  Skeleton, 
  TextSkeleton,
  CardSkeleton,
  ImageSkeleton,
  BarSkeleton,
  ListSkeleton,
  TableSkeleton,
  FormSkeleton
};