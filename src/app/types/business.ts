export type UnitType = "unit" | "kg" | "gram" | "liter" | "ml" | "piece";

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number; // Cost per unit for profit calculation
  unit: UnitType;
  stock: number;
  imageUrl?: string;
  showInOrders?: boolean; // If false, hidden from Orders/POS section (internal material only)
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: UnitType;
  price: number;
  total: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  discountType: "percentage" | "fixed"; // Type of discount
  discount: number; // Discount percentage (0-100) or fixed amount
  discountAmount: number; // Calculated discount amount
  total: number;
  cashTendered?: number; // Amount given by customer
  date: Date;
  status: "completed" | "pending" | "cancelled";
}

export interface Expense {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: UnitType;
  costPerUnit: number;
  totalCost: number;
  date: Date;
  expiryDate?: string; // optional stock expiry date YYYY-MM-DD
  notes?: string;
}

export interface DailySummary {
  date: string;
  totalSales: number;
  totalCost: number;
  profit: number;
  orderCount: number;
  topProducts: {
    productName: string;
    quantity: number;
    revenue: number;
  }[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  businessName: string;
}

export type StockStatus = "good" | "low" | "out" | "expiring_soon" | "expired";

export type StockReduceReason = "sold" | "expired" | "broken" | "adjustment" | "returned";

export interface StockItem {
  id: string;
  productName: string;
  category: string;
  quantity: number;
  unit: UnitType;
  sellingPrice?: number;   // optional — set from Stock manual add
  costPerUnit?: number;    // optional — set from Stock manual add (overrides expense avg)
  expiryDate?: string;     // ISO date string YYYY-MM-DD, optional
  addedDate: Date;
  notes?: string;
}

export interface StockAdjustment {
  id: string;
  stockItemId: string;
  productName: string;
  adjustmentType: "add" | "reduce";
  reason: StockReduceReason | "received" | "initial";
  quantity: number;
  previousQty: number;
  newQty: number;
  date: Date;
  notes?: string;
}
