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
const HISTORY_LIMIT = 15;

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
  productName: string;
  category: string;
  quantity: string;
  unit: UnitType;
  sellingPrice: string;
  costPerUnit: string;
  expiryDate: string;
  notes: string;
}

export function StockManagement({
  stockItems,
  stockAdjustments,
  expenses,
  onAddStock,
  onReduceStock,
  onDeleteStock,
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

  // Manage dialog (top-up OR set quantity)
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
    const totalValue = stockItems.reduce(
      (sum, item) => sum + item.quantity * (costMap.get(item.id) ?? 0), 0
    );
    const totalTopUps = stockAdjustments.filter(a => a.adjustmentType === "add").length;
    const totalReductions = stockAdjustments.filter(a => a.adjustmentType === "reduce").length;
    const totalTopUpQty = stockAdjustments
      .filter(a => a.adjustmentType === "add")
      .reduce((sum, a) => sum + a.quantity, 0);
    return {
      total: stockItems.length,
      good: statuses.filter(st => st === "good").length,
      low: statuses.filter(st => st === "low").length,
      out: statuses.filter(st => st === "out").length,
      expiringSoon: statuses.filter(st => st === "expiring_soon").length,
      expired: statuses.filter(st => st === "expired").length,
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
    good:          { label: s.statusGood,         color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200",  icon: <CheckCircle2 className="h-3 w-3" /> },
    low:           { label: s.statusLow,          color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  icon: <AlertTriangle className="h-3 w-3" /> },
    out:           { label: s.statusOut,          color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    icon: <XCircle className="h-3 w-3" /> },
    expiring_soon: { label: s.statusExpiringSoon, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", icon: <Clock className="h-3 w-3" /> },
    expired:       { label: s.statusExpired,      color: "text-red-800",    bg: "bg-red-100",   border: "border-red-300",    icon: <XCircle className="h-3 w-3" /> },
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const resetManage = () => {
    setManageItem(null);
    setManageTab("topup");
    setTopUpQty(""); setTopUpCost(""); setTopUpNotes("");
    setSetQtyVal(""); setSetQtyNotes("");
  };

  const openManage = (item: StockItem) => {
    resetManage();
    setManageItem(item);
    setSetQtyVal(String(item.quantity));
    setManageOpen(true);
  };

  const handleTopUpSubmit = () => {
    if (!manageItem || !topUpQty || parseFloat(topUpQty) <= 0) return;
    const cost = topUpCost ? parseFloat(topUpCost) : undefined;
    onReduceStock(manageItem.id, -Math.abs(parseFloat(topUpQty)), "received", topUpNotes, cost);
    setManageOpen(false);
    resetManage();
  };

  const handleSetQtySubmit = () => {
    if (!manageItem || setQtyVal === "" || parseFloat(setQtyVal) < 0) return;
    const newQty = parseFloat(setQtyVal);
    const diff = newQty - manageItem.quantity;
    if (diff === 0) { setManageOpen(false); resetManage(); return; }
    onReduceStock(
      manageItem.id,
      diff > 0 ? -diff : Math.abs(diff),
      diff > 0 ? "received" : "adjustment",
      setQtyNotes || "Manual quantity update"
    );
    setManageOpen(false);
    resetManage();
  };

  const handleAddSubmit = () => {
    if (!addForm.productName.trim() || !addForm.quantity || parseFloat(addForm.quantity) <= 0) return;
    const isDuplicate = stockItems.some(
      i => i.productName.trim().toLowerCase() === addForm.productName.trim().toLowerCase()
    );
    if (isDuplicate) {
      setAddFormError(`"${addForm.productName.trim()}" already exists. Click its card to top up.`);
      return;
    }
    onAddStock({
      productName: addForm.productName.trim(),
      category: addForm.category.trim() || "General",
      quantity: parseFloat(addForm.quantity),
      unit: addForm.unit,
      sellingPrice: addForm.sellingPrice ? parseFloat(addForm.sellingPrice) : undefined,
      costPerUnit: addForm.costPerUnit ? parseFloat(addForm.costPerUnit) : undefined,
      expiryDate: addForm.expiryDate || undefined,
      notes: addForm.notes.trim() || undefined,
    }, parseFloat(addForm.quantity));
    setAddForm({ productName: "", category: "", quantity: "", unit: "unit", sellingPrice: "", costPerUnit: "", expiryDate: "", notes: "" });
    setAddFormError("");
    setAddOpen(false);
  };

  const reasonLabel = (reason: string) => {
    const map: Record<string, string> = {
      received: s.reasonReceived, sold: s.reasonSold, expired: s.reasonExpired,
      broken: s.reasonBroken, returned: s.reasonReturned, adjustment: s.reasonAdjustment,
      initial: "Initial",
    };
    return map[reason] || reason;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package2 className="h-5 w-5 text-primary" />{s.title}
          </h2>
          <p className="text-sm text-muted-foreground">{s.description}</p>
        </div>
        <Button onClick={() => setAddOpen(true)} variant="outline" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />{s.manualEntry}
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: s.totalItems,   value: stats.total,               color: "text-foreground", bg: "bg-muted/40",  icon: <Package2 className="h-4 w-4 text-muted-foreground" />, isMoney: false },
          { label: s.good,         value: stats.good,                color: "text-green-700",  bg: "bg-green-50",  icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,   isMoney: false },
          { label: s.lowStock,     value: stats.low,                 color: "text-amber-700",  bg: "bg-amber-50",  icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,  isMoney: false },
          { label: s.expiringSoon, value: stats.expiringSoon,        color: "text-orange-700", bg: "bg-orange-50", icon: <Clock className="h-4 w-4 text-orange-500" />,         isMoney: false },
          { label: s.expiredOut,   value: stats.expired + stats.out, color: "text-red-700",    bg: "bg-red-50",    icon: <XCircle className="h-4 w-4 text-red-500" />,          isMoney: false },
          { label: s.stockValue,   value: stats.totalValue,          color: "text-primary",    bg: "bg-primary/5", icon: <TrendingDown className="h-4 w-4 text-primary" />,      isMoney: true  },
        ].map(card => (
          <Card key={card.label} className={card.bg}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{card.label}</span>
                {card.icon}
              </div>
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.isMoney ? `RM ${(card.value as number).toFixed(2)}` : card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />Stock Summary Report
          </CardTitle>
          <CardDescription>Overview of all stock movements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
              <p className="text-xs text-blue-600 font-medium">Total Products</p>
              <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-center">
              <p className="text-xs text-green-600 font-medium">Total Top-Ups</p>
              <p className="text-2xl font-bold text-green-700">{stats.totalTopUps}</p>
              <p className="text-xs text-green-600">{stats.totalTopUpQty} units added</p>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center">
              <p className="text-xs text-red-600 font-medium">Total Reductions</p>
              <p className="text-2xl font-bold text-red-700">{stats.totalReductions}</p>
            </div>
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-center">
              <p className="text-xs text-primary font-medium">Stock Value</p>
              <p className="text-xl font-bold text-primary">RM {stats.totalValue.toFixed(2)}</p>
            </div>
          </div>

          {/* Per-product breakdown */}
          {stockItems.length > 0 && (
            <div className="mt-4 border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Cost/Unit</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockItems.map(item => {
                    const status = getStockStatus(item);
                    const cfg = statusConfig[status] ?? statusConfig.good;
                    const avgCost = costMap.get(item.id) ?? 0;
                    const stockValue = item.quantity * avgCost;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                        </TableCell>
                        <TableCell className="text-center font-bold">{item.quantity} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span></TableCell>
                        <TableCell className="text-right text-sm">{avgCost > 0 ? `RM ${avgCost.toFixed(2)}` : "—"}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{stockValue > 0 ? `RM ${stockValue.toFixed(2)}` : "—"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                            {cfg.icon}{cfg.label}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Card Grid */}
      <Card>
        <CardHeader>
          <CardTitle>{s.stockInventory}</CardTitle>
          <CardDescription>{stockItems.length} {s.itemsShown} — click a card to top up or edit</CardDescription>
        </CardHeader>
        <CardContent>
          {stockItems.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{s.noStockFound}</p>
              <p className="text-sm mt-1">{s.noStockDesc}</p>
              <Button className="mt-4" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />{s.addStockItem}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {stockItems.map(item => {
                const status = getStockStatus(item);
                const cfg = statusConfig[status] ?? statusConfig.good;
                const avgCost = costMap.get(item.id) ?? 0;
                const stockValue = item.quantity * avgCost;
                return (
                  <Card
                    key={item.id}
                    className={`relative group transition-all hover:shadow-md ${
                      status === "expired"       ? "border-red-300 bg-red-50/40" :
                      status === "expiring_soon" ? "border-orange-300 bg-orange-50/30" :
                      status === "out"           ? "border-red-200 opacity-70" :
                      status === "low"           ? "border-amber-200" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      {/* Action buttons — visible on hover */}
                      <div className="absolute top-1 right-1 z-10 flex gap-0.5">
                        <Button
                          variant="ghost" size="sm"
                          title="Edit / Set Quantity"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                          onClick={e => { e.stopPropagation(); openManage(item); setManageTab("set"); }}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          title="Delete"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-600 hover:bg-red-50"
                          onClick={e => { e.stopPropagation(); setItemToDelete(item); setDeleteConfirmOpen(true); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Clickable body — opens top-up */}
                      <div className="cursor-pointer" onClick={() => { openManage(item); setManageTab("topup"); }}>
                        <div className={`aspect-square rounded-lg mb-2 flex items-center justify-center ${cfg.bg} border ${cfg.border}`}>
                          <Package2 className={`h-6 w-6 ${cfg.color}`} />
                        </div>
                        <h4 className="font-medium text-sm truncate">{item.productName}</h4>
                        <p className="text-xs text-muted-foreground truncate">{item.category}</p>
                        <p className={`text-lg font-bold mt-1 ${
                          item.quantity === 0 ? "text-red-600" :
                          item.quantity <= LOW_STOCK_THRESHOLD ? "text-amber-600" : "text-foreground"
                        }`}>
                          {item.quantity}
                          <span className="text-xs font-normal text-muted-foreground ml-1">{item.unit}</span>
                        </p>
                        {stockValue > 0 && (
                          <p className="text-xs text-primary font-semibold mt-0.5">RM {stockValue.toFixed(2)}</p>
                        )}
                        <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium mt-1.5 ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                          {cfg.icon}{cfg.label}
                        </div>
                        {item.expiryDate && (
                          <p className={`text-xs mt-1 ${status === "expired" ? "text-red-600" : status === "expiring_soon" ? "text-orange-600" : "text-muted-foreground"}`}>
                            Exp: {new Date(item.expiryDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Add new card */}
              <Card className="cursor-pointer hover:border-primary transition-colors border-dashed" onClick={() => setAddOpen(true)}>
                <CardContent className="p-4">
                  <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h4 className="font-medium text-sm text-center">{s.addStockItem}</h4>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top-Up History */}
      <Card>
        <CardHeader>
          <button
            className="flex items-center justify-between w-full text-left"
            onClick={() => setShowHistory(v => !v)}
          >
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-muted-foreground" />{s.adjustmentHistory}
              </CardTitle>
              <CardDescription>{sortedHistory.length} {s.records}</CardDescription>
            </div>
            {showHistory ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CardHeader>
        {showHistory && (
          <CardContent className="p-0">
            {sortedHistory.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{s.noAdjustments}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{s.colDateTime}</TableHead>
                        <TableHead>{s.colProduct}</TableHead>
                        <TableHead>{s.colType}</TableHead>
                        <TableHead>{s.colReason}</TableHead>
                        <TableHead className="text-center">{s.colQtyChanged}</TableHead>
                        <TableHead className="text-center">{s.colBeforeAfter}</TableHead>
                        <TableHead>{s.colNotes}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(historyShowAll ? sortedHistory : sortedHistory.slice(0, HISTORY_LIMIT)).map(adj => (
                        <TableRow key={adj.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {new Date(adj.date).toLocaleDateString()}{" "}
                            <span className="text-muted-foreground text-xs">
                              {new Date(adj.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">{adj.productName}</TableCell>
                          <TableCell>
                            {adj.adjustmentType === "add" ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full border border-green-200">
                                <ArrowUpCircle className="h-3 w-3" />{s.typeAdded}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                                <ArrowDownCircle className="h-3 w-3" />{s.typeReduced}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm capitalize">{reasonLabel(adj.reason)}</TableCell>
                          <TableCell className="text-center">
                            <span className={`font-mono font-semibold ${adj.adjustmentType === "add" ? "text-green-600" : "text-red-600"}`}>
                              {adj.adjustmentType === "add" ? "+" : "-"}{adj.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-sm font-mono text-muted-foreground">
                            {adj.previousQty} → <strong className="text-foreground">{adj.newQty}</strong>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                            {adj.notes || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {sortedHistory.length > HISTORY_LIMIT && (
                  <div className="flex justify-center py-3 border-t">
                    <Button variant="ghost" size="sm" onClick={() => setHistoryShowAll(v => !v)}>
                      {historyShowAll
                        ? <><ChevronUp className="h-4 w-4 mr-1" />{t.analytics.showLess}</>
                        : <><ChevronDown className="h-4 w-4 mr-1" />{t.analytics.showAll} ({sortedHistory.length})</>}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* ── Manage Dialog (Top-Up + Set Quantity tabs) ── */}
      <Dialog open={manageOpen} onOpenChange={v => { if (!v) resetManage(); setManageOpen(v); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package2 className="h-5 w-5 text-primary" />
              {manageItem?.productName}
            </DialogTitle>
            <DialogDescription>
              Current stock: <strong>{manageItem?.quantity} {manageItem?.unit}</strong>
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-2 border-b pb-2">
            <button
              onClick={() => setManage
