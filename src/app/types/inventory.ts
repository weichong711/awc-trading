export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minStock: number;
  price: number;
  supplier: string;
  lastUpdated: Date;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  productCount: number;
}

export interface InventoryStats {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  categories: number;
}
