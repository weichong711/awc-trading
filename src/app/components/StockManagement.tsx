import { useState, useMemo } from "react";
import {
  Package2, Plus, Minus, Trash2, AlertTriangle, CheckCircle2,
  Clock, XCircle, ChevronDown, ChevronUp, Search, History,
  RefreshCw, ArrowDownCircle, ArrowUpCircle, Link2, TrendingDown,
  BarChart3, Square, CheckSquare,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "./ui/dialog";
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

function daysUntilExpiry(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000);
}

interface StatusBadgeProps {
  status: string;
  labels: { good: string; low: string; out: string; expiringSoon: string; expired: string };
}
function StatusBadge({ status, labels }: StatusBadgeProps) {
  const cfg: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    good:          { label: labels.good,         className: "bg-green-100 text-green-700 border-green-200",    icon: <CheckCircle2 className="h-3 w-3" /> },
    low:           { label: labels.low,          className: "bg-amber-100 text-amber-700 border-amber-200",    icon: <AlertTriangle className="h-3 w-3" /> },
    out:           { label: labels.out,          className: "bg-red-100 text-red-700 border-red-200",          icon: <XCircle className="h-3 w-3" /> },
    expiring_soon: { label: labels.expiringSoon, className: "bg-orange-100 text-orange-700 border-orange-200", icon: <Clock className="h-3 w-3" /> },
    expired:       { label: labels.expired,      className: "bg-red-200 text-red-800 border-red-300",          icon: <XCircle className="h-3 w-3" /> },
  };
  const c = cfg[status] || cfg.good;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${c.className}`}>
      {c.icon}{c.label}
    </span>
  );
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
interface ReduceForm { quantity: string; reason: string; notes: string; }

type ActiveTab = "inventory" | "history" | "report";

export function StockManagement({
  stockItems, stockAdjustments, expenses, onAddStock, onReduceStock, onDeleteStock,
}: StockManagementProps) {
  const { t } = useLanguage();
  const s = t.stock;

  const REDUCE_REASONS = [
    { value: "sold",       label: s.reasonSold },
    { value: "expired",    label: s.reasonExpired },
    { value: "broken",     label: s.reasonBroken },
    { value: "returned",   label: s.reasonReturned },
    { value: "adjustment", label: s.reasonAdjustment },
  ];

  const statusLabels = {
    good: s.statusGood, low: s.statusLow, out: s.statusOut,
    expiringSoon: s.statusExpiringSoon, expired: s.statusExpired,
  };

  // -- Tab state --------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<ActiveTab>("inventory");

  // -- Inventory state --------------------------------------------------------
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // -- History state ----------------------------------------------------------
  const [historyShowAll, setHistoryShowAll] = useState(false);

  // -- Add stock dialog -------------------------------------------------------
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddStockForm>({
    productName: "", category: "", quantity: "", unit: "unit",
    sellingPrice: "", costPerUnit: "", expiryDate: "", notes: "",
  });
  const [addFormError, setAddFormError] = useState("");

  // -- Top-up dialog ----------------------------------------------------------
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpItem, setTopUpItem] = useState<StockItem | null>(null);
  const [topUpQty, setTopUpQty] = useState("");
  const [topUpNotes, setTopUpNotes] = useState("");
  const [topUpCost, setTopUpCost] = useState("");

  // -- Reduce dialog ----------------------------------------------------------
  const [reduceOpen, setReduceOpen] = useState(false);
  const [reduceItem, setReduceItem] = useState<StockItem | null>(null);
  const [reduceForm, setReduceForm] = useState<ReduceForm>({ quantity: "", reason: "sold", notes: "" });

  // -- Delete confirm dialog --------------------------------------------------
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // -- Derived data -----------------------------------------------------------
  const costMap = useMemo(() => {
    const map = new Map<string, { avgCost: number; totalSpent: number; lastCost: number }>();
    stockItems.forEach(item => {
      const matching = expenses.filter(
        e =>
          e.productName.toLowerCase() === item.productName.toLowerCase() &&
          e.notes !== "Initial stock entry from new product" &&
          !e.notes?.startsWith("Initial stock entry")
      );
      const totalQty = matching.reduce((sum, e) => sum + e.quantity, 0);
      const totalSpent = matching.reduce((sum, e) => sum + e.totalCost, 0);
      const lastCost = [...matching].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.costPerUnit ?? 0;
      const avgCostFromExpenses = totalQty > 0 ? totalSpent / totalQty : 0;
      const avgCost = (item.costPerUnit ?? 0) > 0 ? item.costPerUnit! : avgCostFromExpenses;
      map.set(item.id, { avgCost, totalSpent, lastCost });
    });
    return map;
  }, [stockItems, expenses]);

  const totalStockValue = useMemo(() =>
    stockItems.reduce((sum, item) => sum + item.quantity * (costMap.get(item.id)?.avgCost ?? 0), 0),
    [stockItems, costMap]
  );

  const stats = useMemo(() => {
    const statuses = stockItems.map(getStockStatus);
    return {
      total: stockItems.length,
      good: statuses.filter(s => s === "good").length,
      low: statuses.filter(s => s === "low").length,
      out: statuses.filter(s => s === "out").length,
      expiringSoon: statuses.filter(s => s === "expiring_soon").length,
      expired: statuses.filter(s => s === "expired").length,
    };
  }, [stockItems]);

  const filtered = useMemo(() =>
    stockItems
      .filter(item => {
        const matchSearch = item.productName.toLowerCase().includes(search.toLowerCase()) ||
          item.category.toLowerCase().includes(search.toLowerCase());
        const status = getStockStatus(item);
        return matchSearch && (filterStatus === "all" || status === filterStatus);
      })
      .sort((a, b) => {
        const order: Record<string, number> = { expired: 0, expiring_soon: 1, out: 2, low: 3, good: 4 };
        return (order[getStockStatus(a)] ?? 5) - (order[getStockStatus(b)] ?? 5);
      }),
    [stockItems, search, filterStatus]
  );

  // Top-up history only (reason === "received"), filtered to only active stock items
  const activeStockIds = useMemo(() => new Set(stockItems.map(i => i.id)), [stockItems]);
  const topUpHistory = useMemo(() =>
    [...stockAdjustments]
      .filter(adj => adj.reason === "received" && activeStockIds.has(adj.stockItemId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [stockAdjustments, activeStockIds]
  );
  const HISTORY_LIMIT = 20;

  const alertItems = stockItems.filter(i => ["expired", "expiring_soon", "out"].includes(getStockStatus(i)));

  // -- Handlers ---------------------------------------------------------------
  const handleAddSubmit = () => {
    if (!addForm.productName.trim() || !addForm.quantity || parseFloat(addForm.quantity) <= 0) return;
    const isDuplicate = stockItems.some(
      s => s.productName.trim().toLowerCase() === addForm.productName.trim().toLowerCase()
    );
    if (isDuplicate) {
      setAddFormError(`"${addForm.productName.trim()}" already exists. Use the + button to top up instead.`);
      return;
    }
    onAddStock({
      productName: addForm.productName.trim(),
      category:    addForm.category.trim() || "General",
      quantity:    parseFloat(addForm.quantity),
      unit:        addForm.unit,
      sellingPrice: addForm.sellingPrice ? parseFloat(addForm.sellingPrice) : undefined,
      costPerUnit:  addForm.costPerUnit ? parseFloat(addForm.costPerUnit) : undefined,
      expiryDate:  addForm.expiryDate || undefined,
      notes:       addForm.notes.trim() || undefined,
    }, parseFloat(addForm.quantity));
    setAddForm({ productName: "", category: "", quantity: "", unit: "unit", sellingPrice: "", costPerUnit: "", expiryDate: "", notes: "" });
    setAddFormError("");
    setAddOpen(false);
  };

  const handleTopUpSubmit = () => {
    if (!topUpItem || !topUpQty || parseFloat(topUpQty) <= 0) return;
    const cost = topUpCost ? parseFloat(topUpCost) : undefined;
    onReduceStock(topUpItem.id, -Math.abs(parseFloat(topUpQty)), "received", topUpNotes, cost);
    setTopUpOpen(false); setTopUpQty(""); setTopUpNotes(""); setTopUpCost(""); setTopUpItem(null);
  };

  const handleReduceSubmit = () => {
    if (!reduceItem || !reduceForm.quantity || parseFloat(reduceForm.quantity) <= 0) return;
    const qty = Math.min(parseFloat(reduceForm.quantity), reduceItem.quantity);
    onReduceStock(reduceItem.id, qty, reduceForm.reason, reduceForm.notes);
    setReduceOpen(false); setReduceForm({ quantity: "", reason: "sold", notes: "" }); setReduceItem(null);
  };

  const openReduce = (item: StockItem) => { setReduceItem(item); setReduceForm({ quantity: "", reason: "sold", notes: "" }); setReduceOpen(true); };
  const openTopUp  = (item: StockItem) => { setTopUpItem(item); setTopUpQty(""); setTopUpNotes(""); setTopUpCost(""); setTopUpOpen(true); };
  const confirmDelete = (item: StockItem) => { setItemToDelete(item); setDeleteConfirmOpen(true); };

  // Selection handlers
  const toggleSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedItems(new Set(filtered.map(item => item.id)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const handleBulkDelete = () => {
    selectedItems.forEach(itemId => {
      onDeleteStock(itemId);
    });
    setSelectedItems(new Set());
    setBulkDeleteConfirmOpen(false);
  };

  // -- Render -----------------------------------------------------------------
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

      {/* Info banner */}
      <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <Link2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
        <div>
          <strong>{s.linkedBanner}</strong>{" "}
          <Minus className="h-3.5 w-3.5 inline mx-0.5" /> {s.linkedBanner2}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: s.totalItems,   value: stats.total,               color: "text-foreground",  bg: "bg-muted/40",  icon: <Package2 className="h-4 w-4 text-muted-foreground" />, filter: "all",           isCount: true },
          { label: s.good,         value: stats.good,                color: "text-green-700",   bg: "bg-green-50",  icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,   filter: "good",          isCount: true },
          { label: s.lowStock,     value: stats.low,                 color: "text-amber-700",   bg: "bg-amber-50",  icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,  filter: "low",           isCount: true },
          { label: s.expiringSoon, value: stats.expiringSoon,        color: "text-orange-700",  bg: "bg-orange-50", icon: <Clock className="h-4 w-4 text-orange-500" />,         filter: "expiring_soon", isCount: true },
          { label: s.expiredOut,   value: stats.expired + stats.out, color: "text-red-700",     bg: "bg-red-50",    icon: <XCircle className="h-4 w-4 text-red-500" />,          filter: "expired",       isCount: true },
          { label: s.stockValue,   value: totalStockValue,           color: "text-primary",     bg: "bg-primary/5", icon: <TrendingDown className="h-4 w-4 text-primary" />,      filter: null,            isCount: false },
        ].map(card => (
          <Card key={card.label}
            className={`transition-all ${card.filter ? "cursor-pointer hover:shadow-md" : ""} ${filterStatus === card.filter ? "ring-2 ring-primary" : ""} ${card.bg}`}
            onClick={() => { if (card.filter) { setFilterStatus(filterStatus === card.filter ? "all" : card.filter); setActiveTab("inventory"); } }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{card.label}</span>
                {card.icon}
              </div>
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.isCount ? card.value : `RM ${(card.value as number).toFixed(2)}`}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alert banner */}
      {alertItems.length > 0 && (
        <div className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
            <AlertTriangle className="h-4 w-4" />
            {alertItems.length} {s.needAttention}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {alertItems.map(item => {
              const status = getStockStatus(item);
              const days = item.expiryDate ? daysUntilExpiry(item.expiryDate) : 0;
              return (
                <div key={item.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-200 text-sm">
                  <div>
                    <p className="font-medium text-sm">{item.productName}</p>
                    {status === "expiring_soon" && item.expiryDate && (
                      <p className="text-xs text-orange-600">{s.expiresIn} {days} {days !== 1 ? s.days : s.day}</p>
                    )}
                    {status === "expired" && <p className="text-xs text-red-600">{s.expiredReduceNow}</p>}
                    {status === "out" && <p className="text-xs text-red-600">{s.outOfStock}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={status} labels={statusLabels} />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600" onClick={() => openReduce(item)}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 border-b">
        {([
          { key: "inventory", label: "Inventory", icon: <Package2 className="h-4 w-4" /> },
          { key: "history",   label: "Top-Up History", icon: <History className="h-4 w-4" /> },
          { key: "report",    label: "Summary Report", icon: <BarChart3 className="h-4 w-4" /> },
        ] as { key: ActiveTab; label: string; icon: React.ReactNode }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* -- INVENTORY TAB --------------------------------------------------- */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          {/* Search + filter + bulk actions */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder={s.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{s.allStatus}</SelectItem>
                <SelectItem value="good">{s.statusGood}</SelectItem>
                <SelectItem value="low">{s.statusLow}</SelectItem>
                <SelectItem value="expiring_soon">{s.statusExpiringSoon}</SelectItem>
                <SelectItem value="expired">{s.statusExpired}</SelectItem>
                <SelectItem value="out">{s.statusOut}</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Bulk action buttons */}
            {selectedItems.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground">
                  {selectedItems.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAll}
                >
                  Clear
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteConfirmOpen(true)}
                  className="flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            )}
            
            {/* Select all button when no items selected */}
            {selectedItems.size === 0 && filtered.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="ml-auto"
              >
                Select All
              </Button>
            )}
          </div>

          {/* Stock Card Grid */}
          {filtered.length === 0 ? (
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
              {filtered.map(item => {
                const status = getStockStatus(item);
                const avgCost = costMap.get(item.id)?.avgCost ?? 0;
                const stockValue = item.quantity * avgCost;
                const isExpenseLinked = expenses.some(e => e.productName.toLowerCase() === item.productName.toLowerCase());
                const expDays = item.expiryDate ? daysUntilExpiry(item.expiryDate) : 0;

                const statusBorderColor =
                  status === "expired" ? "border-red-300 bg-red-50/40" :
                  status === "expiring_soon" ? "border-orange-300 bg-orange-50/30" :
                  status === "out" ? "border-red-200 bg-red-50/20" :
                  status === "low" ? "border-amber-200 bg-amber-50/20" :
                  "hover:border-primary";

                return (
                  <Card
                    key={item.id}
                    className={`relative group transition-all ${statusBorderColor} ${
                      selectedItems.has(item.id) ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      {/* Checkbox for selection - top left */}
                      <div className="absolute top-2 left-2 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelection(item.id);
                          }}
                          className="h-6 w-6 rounded border-2 border-muted-foreground/30 bg-background hover:border-primary transition-colors flex items-center justify-center"
                        >
                          {selectedItems.has(item.id) ? (
                            <CheckSquare className="h-5 w-5 text-primary" />
                          ) : (
                            <Square className="h-5 w-5 text-muted-foreground/50" />
                          )}
                        </button>
                      </div>

                      {/* Action buttons � top right, visible on hover */}
                      <div className="absolute top-1 right-1 flex gap-0.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          title={s.reduceTitle}
                          className="h-7 w-7 p-0 text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                          onClick={e => { e.stopPropagation(); openReduce(item); }}
                          disabled={item.quantity === 0}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title={s.deleteTitle}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                          onClick={e => { e.stopPropagation(); confirmDelete(item); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Card body - click to top up */}
                      <div
                        className="cursor-pointer"
                        onClick={() => openTopUp(item)}
                      >
                        {/* Card icon area */}
                        <div className={`aspect-square rounded-lg mb-2 flex flex-col items-center justify-center relative overflow-hidden
                          ${status === "expired" ? "bg-red-100" :
                            status === "expiring_soon" ? "bg-orange-100" :
                            status === "out" ? "bg-red-50" :
                            status === "low" ? "bg-amber-50" :
                            "bg-muted"}`}>
                          <Package2 className={`h-7 w-7 mb-1
                            ${status === "expired" || status === "out" ? "text-red-400" :
                              status === "expiring_soon" ? "text-orange-400" :
                              status === "low" ? "text-amber-500" :
                              "text-muted-foreground"}`} />
                          <span className={`text-lg font-bold leading-none
                            ${item.quantity === 0 ? "text-red-600" :
                              item.quantity <= LOW_STOCK_THRESHOLD ? "text-amber-600" :
                              "text-foreground"}`}>
                            {item.quantity}
                          </span>
                          <span className="text-xs text-muted-foreground">{item.unit}</span>
                          {/* Top-up hint overlay */}
                          <div className="absolute inset-0 bg-green-600/80 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="text-white text-center">
                              <Plus className="h-6 w-6 mx-auto mb-0.5" />
                              <span className="text-xs font-semibold">{s.topUp}</span>
                            </div>
                          </div>
                        </div>

                        {/* Product name */}
                        <h4 className="font-medium text-sm truncate" title={item.productName}>{item.productName}</h4>

                        {/* Category badge */}
                        <p className="text-xs text-muted-foreground truncate">{item.category}</p>

                        {/* Status badge */}
                        <div className="mt-1.5">
                          <StatusBadge status={status} labels={statusLabels} />
                        </div>

                        {/* Cost / value */}
                        {avgCost > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            RM {avgCost.toFixed(2)}/{item.unit}
                            {stockValue > 0 && <span className="text-primary font-semibold ml-1">= RM {stockValue.toFixed(2)}</span>}
                          </p>
                        )}

                        {/* Expiry */}
                        {item.expiryDate && (
                          <p className={`text-xs mt-0.5 ${status === "expired" ? "text-red-600" : status === "expiring_soon" ? "text-orange-600" : "text-muted-foreground"}`}>
                            {status === "expiring_soon" ? `${expDays}d left` :
                             status === "expired" ? `${Math.abs(expDays)}d ago` :
                             new Date(item.expiryDate).toLocaleDateString()}
                          </p>
                        )}

                        {/* Expense linked badge */}
                        {isExpenseLinked && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full mt-1">
                            <Link2 className="h-2.5 w-2.5" />{s.expenseLinked}
                          </span>
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
        </div>
      )}
      {/* -- HISTORY TAB ---------------------------------------------------- */}
      {activeTab === "history" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-muted-foreground" />Top-Up History
            </CardTitle>
            <CardDescription>
              {topUpHistory.length} top-up records (deleted stock entries are removed)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {topUpHistory.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No top-up history yet</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{s.colDateTime}</TableHead>
                        <TableHead>{s.colProduct}</TableHead>
                        <TableHead className="text-center">{s.colQtyChanged}</TableHead>
                        <TableHead className="text-center">{s.colBeforeAfter}</TableHead>
                        <TableHead>{s.colNotes}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(historyShowAll ? topUpHistory : topUpHistory.slice(0, HISTORY_LIMIT)).map(adj => (
                        <TableRow key={adj.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {new Date(adj.date).toLocaleDateString()}{" "}
                            <span className="text-muted-foreground text-xs">
                              {new Date(adj.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">{adj.productName}</TableCell>
                          <TableCell className="text-center">
                            <span className="font-mono font-semibold text-green-600">+{adj.quantity}</span>
                          </TableCell>
                          <TableCell className="text-center text-sm font-mono text-muted-foreground">
                            {adj.previousQty} <ArrowUpCircle className="h-3 w-3 inline text-green-500 mx-1" /> <strong className="text-foreground">{adj.newQty}</strong>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                            {adj.notes || "�"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {topUpHistory.length > HISTORY_LIMIT && (
                  <div className="flex justify-center py-3 border-t">
                    <Button variant="ghost" size="sm" onClick={() => setHistoryShowAll(v => !v)}>
                      {historyShowAll
                        ? <><ChevronUp className="h-4 w-4 mr-1" />{t.analytics.showLess}</>
                        : <><ChevronDown className="h-4 w-4 mr-1" />{t.analytics.showAll} ({topUpHistory.length})</>}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* -- REPORT TAB ------------------------------------------------------ */}
      {activeTab === "report" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" />Summary Report
              </CardTitle>
              <CardDescription>
                Active stock only � deleted items are excluded
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Summary totals */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="p-3 bg-muted/40 rounded-lg">
                  <p className="text-xs text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{stockItems.length}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Total Stock Value</p>
                  <p className="text-2xl font-bold text-green-700">RM {totalStockValue.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Low / Out of Stock</p>
                  <p className="text-2xl font-bold text-amber-700">{stats.low + stats.out}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Expiring / Expired</p>
                  <p className="text-2xl font-bold text-orange-700">{stats.expiringSoon + stats.expired}</p>
                </div>
              </div>

              {/* Per-item breakdown */}
              {stockItems.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Package2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No active stock to report</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{s.colProduct}</TableHead>
                        <TableHead>{s.colCategory}</TableHead>
                        <TableHead className="text-center">{s.colQty}</TableHead>
                        <TableHead className="text-right">{s.colAvgCost}</TableHead>
                        <TableHead className="text-right">{s.colStockValue}</TableHead>
                        <TableHead>{s.colExpiry}</TableHead>
                        <TableHead>{s.colStatus}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...stockItems]
                        .sort((a, b) => {
                          const order: Record<string, number> = { expired: 0, expiring_soon: 1, out: 2, low: 3, good: 4 };
                          return (order[getStockStatus(a)] ?? 5) - (order[getStockStatus(b)] ?? 5);
                        })
                        .map(item => {
                          const status = getStockStatus(item);
                          const avgCost = costMap.get(item.id)?.avgCost ?? 0;
                          const stockValue = item.quantity * avgCost;
                          const expDays = item.expiryDate ? daysUntilExpiry(item.expiryDate) : 0;
                          return (
                            <TableRow key={item.id} className={status === "expired" ? "bg-red-50/50" : status === "expiring_soon" ? "bg-orange-50/30" : ""}>
                              <TableCell className="font-medium">{item.productName}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{item.category}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`font-bold ${item.quantity === 0 ? "text-red-600" : item.quantity <= LOW_STOCK_THRESHOLD ? "text-amber-600" : "text-foreground"}`}>
                                  {item.quantity}
                                </span>
                                <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                              </TableCell>
                              <TableCell className="text-right">
                                {avgCost > 0 ? <span className="text-sm">RM {avgCost.toFixed(2)}</span> : <span className="text-xs text-muted-foreground">�</span>}
                              </TableCell>
                              <TableCell className="text-right">
                                {stockValue > 0 ? <span className="text-sm font-semibold text-primary">RM {stockValue.toFixed(2)}</span> : <span className="text-xs text-muted-foreground">�</span>}
                              </TableCell>
                              <TableCell>
                                {item.expiryDate ? (
                                  <div>
                                    <p className={`text-sm font-medium ${status === "expired" ? "text-red-600" : status === "expiring_soon" ? "text-orange-600" : "text-foreground"}`}>
                                      {new Date(item.expiryDate).toLocaleDateString()}
                                    </p>
                                    {status === "expiring_soon" && <p className="text-xs text-orange-500">{expDays}{s.dLeft}</p>}
                                    {status === "expired" && <p className="text-xs text-red-500">{Math.abs(expDays)}{s.dAgo}</p>}
                                  </div>
                                ) : <span className="text-xs text-muted-foreground">�</span>}
                              </TableCell>
                              <TableCell><StatusBadge status={status} labels={statusLabels} /></TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================== */}
      {/* DIALOGS                                                              */}
      {/* ================================================================== */}

      {/* Add Stock Dialog */}
      <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) { setAddFormError(""); setAddForm({ productName: "", category: "", quantity: "", unit: "unit", sellingPrice: "", costPerUnit: "", expiryDate: "", notes: "" }); } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary" />{s.addTitle}</DialogTitle>
            <DialogDescription>{s.addDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">{s.productName}</label>
                <Input placeholder={s.productNamePH} value={addForm.productName}
                  onChange={e => { setAddForm(f => ({ ...f, productName: e.target.value })); setAddFormError(""); }}
                  className={addFormError ? "border-red-400 focus:ring-red-200" : ""} />
                {addFormError && <p className="text-xs text-red-500">{addFormError}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{s.category}</label>
                <Input placeholder={s.categoryPH} value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{s.unitType}</label>
                <Select value={addForm.unit} onValueChange={v => setAddForm(f => ({ ...f, unit: v as UnitType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{s.initialQty}</label>
                <Input type="number" min="0" step="0.01" placeholder="0" value={addForm.quantity} onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{s.expiryDate} <span className="text-muted-foreground font-normal">({s.optional})</span></label>
                <Input type="date" value={addForm.expiryDate} onChange={e => setAddForm(f => ({ ...f, expiryDate: e.target.value }))} />
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">{s.pricing}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">{s.sellingPrice}</label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={addForm.sellingPrice} onChange={e => setAddForm(f => ({ ...f, sellingPrice: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">{s.costPerUnit}</label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={addForm.costPerUnit} onChange={e => setAddForm(f => ({ ...f, costPerUnit: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{s.notes} <span className="text-muted-foreground font-normal">({s.optional})</span></label>
              <Input placeholder={s.notesPH} value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleAddSubmit} disabled={!addForm.productName.trim() || !addForm.quantity || parseFloat(addForm.quantity) <= 0}>
              <Plus className="h-4 w-4 mr-2" />{s.addToStock}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Top-Up Dialog */}
      <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <RefreshCw className="h-5 w-5" />{s.topUpTitle}
            </DialogTitle>
            <DialogDescription>
              {s.topUpDesc} <strong>{topUpItem?.productName}</strong>
              <span className="block text-xs mt-0.5">{s.current} <strong>{topUpItem?.quantity} {topUpItem?.unit}</strong></span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">{s.qtyToAdd}</label>
              <Input type="number" min="0.01" step="0.01" placeholder="0" value={topUpQty} onChange={e => setTopUpQty(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Cost Per Unit (RM) <span className="text-muted-foreground font-normal">({s.optional})</span></label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={topUpCost} onChange={e => setTopUpCost(e.target.value)} />
              <p className="text-xs text-muted-foreground">If entered, this top-up will be recorded as an expense in Analytics.</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{s.notes} <span className="text-muted-foreground font-normal">({s.optional})</span></label>
              <Input placeholder={s.topUpNotesPH} value={topUpNotes} onChange={e => setTopUpNotes(e.target.value)} />
            </div>
            {topUpQty && parseFloat(topUpQty) > 0 && topUpItem && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm space-y-0.5">
                <p className="text-green-700">{s.afterTopUp} <strong>{(topUpItem.quantity + parseFloat(topUpQty)).toFixed(2)} {topUpItem.unit}</strong></p>
                {topUpCost && parseFloat(topUpCost) > 0 && (
                  <p className="text-green-700">Expense: <strong>RM {(parseFloat(topUpQty) * parseFloat(topUpCost)).toFixed(2)}</strong></p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopUpOpen(false)}>{t.common.cancel}</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleTopUpSubmit} disabled={!topUpQty || parseFloat(topUpQty) <= 0}>
              <Plus className="h-4 w-4 mr-2" />{s.topUp}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reduce Stock Dialog */}
      <Dialog open={reduceOpen} onOpenChange={setReduceOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Minus className="h-5 w-5" />{s.reduceTitle}
            </DialogTitle>
            <DialogDescription>
              {s.reduceDesc} <strong>{reduceItem?.productName}</strong>
              <span className="block text-xs mt-0.5">{s.available} <strong>{reduceItem?.quantity} {reduceItem?.unit}</strong></span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">{s.reason}</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {REDUCE_REASONS.map(r => (
                  <button key={r.value}
                    onClick={() => setReduceForm(f => ({ ...f, reason: r.value }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left ${
                      reduceForm.reason === r.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r.value === "sold"       && <ArrowDownCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                    {r.value === "expired"    && <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                    {r.value === "broken"     && <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />}
                    {r.value === "returned"   && <RefreshCw className="h-4 w-4 text-purple-500 flex-shrink-0" />}
                    {r.value === "adjustment" && <Package2 className="h-4 w-4 text-gray-500 flex-shrink-0" />}
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{s.qtyToReduce}</label>
              <div className="flex items-center gap-2">
                <Input type="number" min="0.01" step="0.01" placeholder="0" max={reduceItem?.quantity}
                  value={reduceForm.quantity} onChange={e => setReduceForm(f => ({ ...f, quantity: e.target.value }))} />
                <Button variant="outline" size="sm" className="whitespace-nowrap"
                  onClick={() => setReduceForm(f => ({ ...f, quantity: reduceItem?.quantity.toString() ?? "" }))}>
                  {s.all} ({reduceItem?.quantity})
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{s.notes} <span className="text-muted-foreground font-normal">({s.optional})</span></label>
              <Input placeholder={s.notesPH} value={reduceForm.notes} onChange={e => setReduceForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            {reduceForm.quantity && parseFloat(reduceForm.quantity) > 0 && reduceItem && (
              <div className={`p-3 rounded-lg border text-sm ${parseFloat(reduceForm.quantity) >= reduceItem.quantity ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"}`}>
                <p>{s.afterReduction} <strong>{Math.max(0, reduceItem.quantity - parseFloat(reduceForm.quantity)).toFixed(2)} {reduceItem.unit}</strong></p>
                {parseFloat(reduceForm.quantity) >= reduceItem.quantity && (
                  <p className="text-red-600 text-xs mt-1">{s.willEmpty}</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReduceOpen(false)}>{t.common.cancel}</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleReduceSubmit}
              disabled={!reduceForm.quantity || parseFloat(reduceForm.quantity) <= 0}>
              <Minus className="h-4 w-4 mr-2" />{s.reduceTitle}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />{s.deleteTitle}
            </DialogTitle>
            <DialogDescription>
              <strong>{itemToDelete?.productName}</strong> � {s.deleteDesc}
              <span className="block mt-1 text-xs text-amber-600">Top-up history for this item will also be removed.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setItemToDelete(null); }}>
              {t.common.cancel}
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (itemToDelete) { onDeleteStock(itemToDelete.id); }
                setDeleteConfirmOpen(false);
                setItemToDelete(null);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />{t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirm Dialog */}
      <Dialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />Delete Multiple Products
            </DialogTitle>
            <DialogDescription>
              You are about to delete <strong>{selectedItems.size} product{selectedItems.size !== 1 ? 's' : ''}</strong>.
              <span className="block mt-2 text-xs text-amber-600">
                ⚠️ This will also remove all top-up history for these items. This action cannot be undone.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[200px] overflow-y-auto border rounded-lg p-3 bg-muted/30">
            <ul className="space-y-1 text-sm">
              {Array.from(selectedItems).map(itemId => {
                const item = stockItems.find(s => s.id === itemId);
                return item ? (
                  <li key={itemId} className="flex items-center gap-2">
                    <Package2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium">{item.productName}</span>
                    <span className="text-xs text-muted-foreground">({item.quantity} {item.unit})</span>
                  </li>
                ) : null;
              })}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteConfirmOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />Delete {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
