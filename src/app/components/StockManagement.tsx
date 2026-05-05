import { useState, useMemo } from "react";
import {
  Package2, Plus, Trash2, AlertTriangle, CheckCircle2,
  Clock, XCircle, TrendingDown, DollarSign, Edit3,
  ArrowUpCircle, ArrowDownCircle, History, ChevronDown, ChevronUp, BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { StockItem, StockAdjustment, UnitType, Expense } from "../types/business";
import { useLanguage } from "../contexts/LanguageContext";

const UNITS: UnitType[] = ["unit", "kg", "gram", "liter", "ml", "piece"];
const LOW_STOCK_THRESHOLD = 10;

function getStockStatus(item: StockItem) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (item.quantity === 0) return "out";
  if (item.expiryDate) {
    const exp = new Date(item.expiryDate);
    exp.setHours(0, 0, 0, 0);
    if (exp < today) return "expired";
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
    if (diffDays <= 7) return "expiring_soon";
  }
  if (item.quantity <= LOW_STOCK_THRESHOLD) return "low";
  return "good";
}

interface StockManagementProps {
  stockItems: StockItem[];
  stockAdjustments: StockAdjustment[];
  expenses: Expense[];
  onAddStock: (item: Omit<StockItem, "id" | "addedDate">, qty: number) => void;
  onReduceStock: (itemId: string, qty: number, reason: string, notes: string, costPerUnit?: number) => void;
  onDeleteStock: (itemId: string) => void;
}

interface AddStockForm {
  productName: string; category: string; quantity: string; unit: UnitType;
  sellingPrice: string; costPerUnit: string; expiryDate: string; notes: string;
}

export function StockManagement({
  stockItems, stockAdjustments, expenses, onAddStock, onReduceStock, onDeleteStock,
}: StockManagementProps) {
  const { t } = useLanguage();
  const s = t.stock;

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddStockForm>({
    productName: "", category: "", quantity: "", unit: "unit",
    sellingPrice: "", costPerUnit: "", expiryDate: "", notes: "",
  });
  const [addFormError, setAddFormError] = useState("");

  // Manage dialog — top-up OR set quantity tabs
  const [manageOpen, setManageOpen] = useState(false);
  const [manageItem, setManageItem] = useState<StockItem | null>(null);
  const [manageTab, setManageTab] = useState<"topup" | "set">("topup");
  const [topUpQty, setTopUpQty] = useState("");
  const [topUpCost, setTopUpCost] = useState("");
  const [topUpNotes, setTopUpNotes] = useState("");
  const [setQtyVal, setSetQtyVal] = useState("");
  const [setQtyNotes, setSetQtyNotes] = useState("");

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [historyShowAll, setHistoryShowAll] = useState(false);

  // ── Cost map ──────────────────────────────────────────────────────────────
  const costMap = useMemo(() => {
    const map = new Map<string, number>();
    stockItems.forEach(item => {
      if ((item.costPerUnit ?? 0) > 0) { map.set(item.id, item.costPerUnit!); return; }
      const matching = expenses.filter(
        e => e.productName.toLowerCase() === item.productName.toLowerCase() &&
          !e.notes?.startsWith("Initial stock entry") &&
          e.notes !== "Initial stock entry from new product"
      );
      const totalQty = matching.reduce((sum, e) => sum + e.quantity, 0);
      const totalSpent = matching.reduce((sum, e) => sum + e.totalCost, 0);
      map.set(item.id, totalQty > 0 ? totalSpent / totalQty : 0);
    });
    return map;
  }, [stockItems, expenses]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const statuses = stockItems.map(getStockStatus);
    const totalValue = stockItems.reduce((sum, item) => sum + item.quantity * (costMap.get(item.id) ?? 0), 0);
    const totalTopUps = stockAdjustments.filter(a => a.adjustmentType === "add").length;
    const totalReductions = stockAdjustments.filter(a => a.adjustmentType === "reduce").length;
    const totalTopUpQty = stockAdjustments.filter(a => a.adjustmentType === "add").reduce((sum, a) => sum + a.quantity, 0);
    return {
      total: stockItems.length,
      good: statuses.filter(s => s === "good").length,
      low: statuses.filter(s => s === "low").length,
      out: statuses.filter(s => s === "out").length,
      expiringSoon: statuses.filter(s => s === "expiring_soon").length,
      expired: statuses.filter(s => s === "expired").length,
      totalValue,
      totalTopUps,
      totalReductions,
      totalTopUpQty,
    };
  }, [stockItems, stockAdjustments, costMap]);

  // ── Sorted history ────────────────────────────────────────────────────────
  const sortedHistory = useMemo(() =>
    [...stockAdjustments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [stockAdjustments]
  );

  // ── Status config ─────────────────────────────────────────────────────────
  const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    good:          { label: s
