import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  /**
   * Key única para a página. É usada para identificar
   * quando ocorre uma mudança de página.
   */
  pageKey: string | number;
}

/**
 * Componente que adiciona uma transição suave entre páginas
 * Utiliza framer-motion para criar animações de fade in/out
 */
export function PageTransition({ children, className, pageKey }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ 
          duration: 0.3,
          ease: "easeInOut"
        }}
        className={`h-full ${className || ""}`}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Variante para seções dentro da mesma página
 */
export function SectionTransition({ children, className, pageKey }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ 
          duration: 0.2,
          ease: "easeOut"
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Variante para elementos que aparecem após carregamento de dados
 */
export function FadeIn({ 
  children, 
  className,
  delay = 0
}: { 
  children: ReactNode; 
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ 
        duration: 0.5,
        ease: "easeInOut",
        delay
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Componente que anima elementos em uma lista, com efeito
 * de entrada em cascata.
 */
export function StaggeredList({ 
  children, 
  className,
  staggerDelay = 0.1
}: { 
  children: ReactNode[]; 
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children.map((child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.3 }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}