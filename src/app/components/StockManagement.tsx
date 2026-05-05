import { useState, useMemo } from "react";
import {
  Package2, Plus, Trash2, AlertTriangle, CheckCircle2,
  Clock, XCircle, TrendingDown, DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
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

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpItem, setTopUpItem] = useState<StockItem | null>(null);
  const [topUpQty, setTopUpQty] = useState("");
  const [topUpCost, setTopUpCost] = useState("");
  const [topUpNotes, setTopUpNotes] = useState("");

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);

  // ── Cost map (avg cost per item from expenses) ────────────────────────────
  const costMap = useMemo(() => {
    const map = new Map<string, number>();
    stockItems.forEach(item => {
      if ((item.costPerUnit ?? 0) > 0) {
        map.set(item.id, item.costPerUnit!);
        return;
      }
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

  // ── Summary stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const statuses = stockItems.map(getStockStatus);
    const totalValue = stockItems.reduce(
      (sum, item) => sum + item.quantity * (costMap.get(item.id) ?? 0), 0
    );
    return {
      total: stockItems.length,
      good: statuses.filter(s => s === "good").length,
      low: statuses.filter(s => s === "low").length,
      out: statuses.filter(s => s === "out").length,
      expiringSoon: statuses.filter(s => s === "expiring_soon").length,
      expired: statuses.filter(s => s === "expired").length,
      totalValue,
    };
  }, [stockItems, costMap]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddSubmit = () => {
    if (!addForm.productName.trim() || !addForm.quantity || parseFloat(addForm.quantity) <= 0) return;
    const isDuplicate = stockItems.some(
      s => s.productName.trim().toLowerCase() === addForm.productName.trim().toLowerCase()
    );
    if (isDuplicate) {
      setAddFormError(`"${addForm.productName.trim()}" already exists. Use the + button on its card to top up.`);
      return;
    }
    onAddStock(
      {
        productName: addForm.productName.trim(),
        category: addForm.category.trim() || "General",
        quantity: parseFloat(addForm.quantity),
        unit: addForm.unit,
        sellingPrice: addForm.sellingPrice ? parseFloat(addForm.sellingPrice) : undefined,
        costPerUnit: addForm.costPerUnit ? parseFloat(addForm.costPerUnit) : undefined,
        expiryDate: addForm.expiryDate || undefined,
        notes: addForm.notes.trim() || undefined,
      },
      parseFloat(addForm.quantity)
    );
    setAddForm({ productName: "", category: "", quantity: "", unit: "unit", sellingPrice: "", costPerUnit: "", expiryDate: "", notes: "" });
    setAddFormError("");
    setAddOpen(false);
  };

  const handleTopUpSubmit = () => {
    if (!topUpItem || !topUpQty || parseFloat(topUpQty) <= 0) return;
    const cost = topUpCost ? parseFloat(topUpCost) : undefined;
    onReduceStock(topUpItem.id, -Math.abs(parseFloat(topUpQty)), "received", topUpNotes, cost);
    setTopUpOpen(false);
    setTopUpQty(""); setTopUpCost(""); setTopUpNotes(""); setTopUpItem(null);
  };

  const openTopUp = (item: StockItem) => {
    setTopUpItem(item);
    setTopUpQty(""); setTopUpCost(""); setTopUpNotes("");
    setTopUpOpen(true);
  };

  const confirmDelete = (item: StockItem) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  // ── Status helpers ────────────────────────────────────────────────────────
  const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    good:          { label: s.statusGood,         color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200", icon: <CheckCircle2 className="h-3 w-3" /> },
    low:           { label: s.statusLow,          color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200", icon: <AlertTriangle className="h-3 w-3" /> },
    out:           { label: s.statusOut,          color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",   icon: <XCircle className="h-3 w-3" /> },
    expiring_soon: { label: s.statusExpiringSoon, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200",icon: <Clock className="h-3 w-3" /> },
    expired:       { label: s.statusExpired,      color: "text-red-800",    bg: "bg-red-100",   border: "border-red-300",   icon: <XCircle className="h-3 w-3" /> },
  };

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
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

      {/* ── Summary stat cards ──────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: s.totalItems,   value: stats.total,               color: "text-foreground", bg: "bg-muted/40",  icon: <Package2 className="h-4 w-4 text-muted-foreground" />, isMoney: false },
          { label: s.good,         value: stats.good,                color: "text-green-700",  bg: "bg-green-50",  icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,   isMoney: false },
          { label: s.lowStock,     value: stats.low,                 color: "text-amber-700",  bg: "bg-amber-50",  icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,  isMoney: false },
          { label: s.expiringSoon, value: stats.expiringSoon,        color: "text-orange-700", bg: "bg-orange-50", icon: <Clock className="h-4 w-4 text-orange-500" />,         isMoney: false },
          { label: s.expiredOut,   value: stats.expired + stats.out, color: "text-red-700",    bg: "bg-red-50",    icon: <XCircle className="h-4 w-4 text-red-500" />,          isMoney: false },
          { label: s.stockValue,   value: stats.totalValue,          color: "text-primary",    bg: "bg-primary/5", icon: <TrendingDown className="h-4 w-4 text-primary" />,      isMoney: true  },
        ].map(card => (
          <Card key={card.label} className={`${card.bg}`}>
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

      {/* ── Stock Card Grid ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{s.stockInventory}</CardTitle>
          <CardDescription>{stockItems.length} {s.itemsShown}</CardDescription>
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
                      status === "expired" ? "border-red-300 bg-red-50/40" :
                      status === "expiring_soon" ? "border-orange-300 bg-orange-50/30" :
                      status === "out" ? "border-red-200 opacity-70" :
                      status === "low" ? "border-amber-200" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      {/* Delete button — top right, visible on hover */}
                      <div className="absolute top-1 right-1 z-10">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-600 hover:bg-red-50"
                          onClick={e => { e.stopPropagation(); confirmDelete(item); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Clickable body — opens top-up dialog */}
                      <div className="cursor-pointer" onClick={() => openTopUp(item)}>
                        {/* Icon square */}
                        <div className={`aspect-square rounded-lg mb-2 flex items-center justify-center ${cfg.bg} border ${cfg.border}`}>
                          <Package2 className={`h-6 w-6 ${cfg.color}`} />
                        </div>

                        {/* Name */}
                        <h4 className="font-medium text-sm truncate">{item.productName}</h4>
                        <p className="text-xs text-muted-foreground truncate">{item.category}</p>

                        {/* Quantity */}
                        <p className={`text-lg font-bold mt-1 ${
                          item.quantity === 0 ? "text-red-600" :
                          item.quantity <= LOW_STOCK_THRESHOLD ? "text-amber-600" :
                          "text-foreground"
                        }`}>
                          {item.quantity}
                          <span className="text-xs font-normal text-muted-foreground ml-1">{item.unit}</span>
                        </p>

                        {/* Stock value */}
                        {stockValue > 0 && (
                          <p className="text-xs text-primary font-semibold mt-0.5">
                            RM {stockValue.toFixed(2)}
                          </p>
                        )}

                        {/* Status badge */}
                        <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium mt-1.5 ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                          {cfg.icon}{cfg.label}
                        </div>

                        {/* Expiry */}
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

              {/* Add new stock card */}
              <Card
                className="cursor-pointer hover:border-primary transition-colors border-dashed"
                onClick={() => setAddOpen(true)}
              >
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

      {/* ── Add New Stock Dialog ─────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={v => {
        setAddOpen(v);
        if (!v) { setAddFormError(""); setAddForm({ productName: "", category: "", quantity: "", unit: "unit", sellingPrice: "", costPerUnit: "", expiryDate: "", notes: "" }); }
      }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />{s.addTitle}
            </DialogTitle>
            <DialogDescription>{s.addDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>{s.productName}</Label>
                <Input
                  value={addForm.productName}
                  onChange={e => { setAddForm(f => ({ ...f, productName: e.target.value })); setAddFormError(""); }}
                  placeholder="e.g. SR927"
                  className={addFormError ? "border-red-400" : ""}
                />
                {addFormError && <p className="text-xs text-red-500">{addFormError}</p>}
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Input
                  value={addForm.category}
                  onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Battery"
                />
              </div>
              <div className="space-y-1">
                <Label>{t.common.unit}</Label>
                <Select value={addForm.unit} onValueChange={v => setAddForm(f => ({ ...f, unit: v as UnitType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t.common.quantity}</Label>
                <Input
                  type="number" min="0" step="1"
                  value={addForm.quantity}
                  onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label>{s.costPerUnit} (RM)</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={addForm.costPerUnit}
                  onChange={e => setAddForm(f => ({ ...f, costPerUnit: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label>Selling Price (RM) <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={addForm.sellingPrice}
                  onChange={e => setAddForm(f => ({ ...f, sellingPrice: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Expiry Date <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Input
                  type="date"
                  value={addForm.expiryDate}
                  onChange={e => setAddForm(f => ({ ...f, expiryDate: e.target.value }))}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>{t.common.notes} <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Textarea
                  value={addForm.notes}
                  onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder={t.common.notes}
                  rows={2}
                />
              </div>
            </div>

            {/* Total cost preview */}
            {addForm.quantity && addForm.costPerUnit && parseFloat(addForm.quantity) > 0 && parseFloat(addForm.costPerUnit) > 0 && (
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm">Total Stock Cost:</span>
                <span className="text-lg font-semibold text-primary">
                  RM {(parseFloat(addForm.quantity) * parseFloat(addForm.costPerUnit)).toFixed(2)}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleAddSubmit} disabled={!addForm.productName.trim() || !addForm.quantity || parseFloat(addForm.quantity) <= 0}>
              <Plus className="h-4 w-4 mr-1" />{s.addStockItem}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Top-Up Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={topUpOpen} onOpenChange={v => { setTopUpOpen(v); if (!v) { setTopUpItem(null); setTopUpQty(""); setTopUpCost(""); setTopUpNotes(""); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package2 className="h-5 w-5 text-primary" />
              Top Up Stock
            </DialogTitle>
            <DialogDescription>
              {topUpItem ? `Add more stock for "${topUpItem.productName}" (current: ${topUpItem.quantity} ${topUpItem.unit})` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>{t.common.quantity} to add</Label>
              <Input
                type="number" min="1" step="1"
                value={topUpQty}
                onChange={e => setTopUpQty(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label>Cost per Unit (RM) <span className="text-xs text-muted-foreground">(optional — records an expense)</span></Label>
              <Input
                type="number" min="0" step="0.01"
                value={topUpCost}
                onChange={e => setTopUpCost(e.target.value)}
                placeholder="0.00"
              />
              {topUpCost && parseFloat(topUpCost) > 0 && topUpQty && parseFloat(topUpQty) > 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Will record RM {(parseFloat(topUpCost) * parseFloat(topUpQty)).toFixed(2)} expense automatically
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>{t.common.notes} <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Textarea
                value={topUpNotes}
                onChange={e => setTopUpNotes(e.target.value)}
                placeholder="e.g. Restocked from supplier"
                rows={2}
              />
            </div>

            {/* New quantity preview */}
            {topUpQty && parseFloat(topUpQty) > 0 && topUpItem && (
              <div className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-sm text-green-700">New quantity:</span>
                <span className="text-lg font-bold text-green-700">
                  {topUpItem.quantity + parseFloat(topUpQty)} {topUpItem.unit}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopUpOpen(false)}>{t.common.cancel}</Button>
            <Button
              onClick={handleTopUpSubmit}
              disabled={!topUpQty || parseFloat(topUpQty) <= 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1" />Top Up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ───────────────────────────────────────── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={v => { setDeleteConfirmOpen(v); if (!v) setItemToDelete(null); }}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>{s.deleteTitle}</DialogTitle>
            <DialogDescription>
              {itemToDelete?.productName} — {s.deleteDesc}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>{t.common.cancel}</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (itemToDelete) onDeleteStock(itemToDelete.id);
                setDeleteConfirmOpen(false);
                setItemToDelete(null);
              }}
            >
              {t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
