/**
 * Preços de referência dos produtos
 * Valores em USD por tonelada
 */

export interface ProductPrice {
  name: string;
  price: number;
  description?: string;
  category: string;
  origin?: string;
}

const productPrices: Record<string, ProductPrice> = {
  'soja': {
    name: 'Soja',
    price: 360.25,
    description: 'Benchmark Internacional',
    category: 'grains'
  },
  'milho': {
    name: 'Milho',
    price: 181.23,
    description: 'Benchmark Internacional',
    category: 'grains'
  },
  'arroz-py': {
    name: 'Arroz (Paraguai)',
    price: 635.00,
    description: 'Paraguai FOB, 5% quebrados - Ref. Planeta Arroz, Jan 2025',
    category: 'grains',
    origin: 'py'
  },
  'arroz-int': {
    name: 'Arroz',
    price: 288.44,
    description: 'Benchmark Internacional',
    category: 'grains'
  },
  'trigo': {
    name: 'Trigo',
    price: 196.03,
    description: 'Benchmark Internacional',
    category: 'grains'
  },
  'sorgo': {
    name: 'Sorgo',
    price: 185.00,
    description: 'Benchmark Internacional',
    category: 'grains'
  },
  'ddgs': {
    name: 'DDGS',
    price: 210.00,
    description: 'Dried Distillers Grains with Solubles',
    category: 'grains'
  }
};

/**
 * Obtém o preço de referência para um produto específico
 * @param productKey Chave do produto
 * @returns Objeto com informações do produto e preço ou undefined se não encontrado
 */
export function getProductPrice(productKey: string): ProductPrice | undefined {
  return productPrices[productKey];
}

/**
 * Obtém todos os produtos por categoria
 * @param category Categoria dos produtos (opcional)
 * @returns Array de produtos filtrados por categoria ou todos se não especificado
 */
export function getProductsByCategory(category?: string): ProductPrice[] {
  return Object.values(productPrices).filter(
    product => !category || product.category === category
  );
}

/**
 * Lista de todos os produtos disponíveis
 */
export const allProducts = Object.values(productPrices);

export default productPrices;