import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { supabase, SERVER, publicAnonKey } from "../lib/supabase";
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Settings,
  LogOut,
  Cloud,
  CloudOff,
  Loader2,
  User,
  CreditCard,
  Package2,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./components/ui/tabs";
import { OrderSummary } from "./components/OrderSummary";
import { ExpenseManagement } from "./components/ExpenseManagement";
import { ProfitAnalytics } from "./components/ProfitAnalytics";
import { UserSettings } from "./components/UserSettings";
import { StockManagement } from "./components/StockManagement";
import { LoginPage } from "./components/LoginPage";
import {
  Product,
  Order,
  Expense,
  StockItem,
  StockAdjustment,
} from "./types/business";
import { Toaster } from "./components/ui/sonner";
import {
  LanguageProvider,
  useLanguage,
} from "./contexts/LanguageContext";

const LOCAL_KEY = "awc_local_data";

// ── Set New Password Screen (shown after clicking reset email link) ───────────
function SetNewPasswordScreen({ email, onDone }: { email: string; onDone: () => void }) {
  const [pw, setPw]         = useState("");
  const [pw2, setPw2]       = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]       = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) { setMsg({ type: "error", text: "Password must be at least 6 characters." }); return; }
    if (pw !== pw2)    { setMsg({ type: "error", text: "Passwords do not match." }); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      setMsg({ type: "error", text: error.message });
    } else {
      setMsg({ type: "success", text: "Password updated! Redirecting to login..." });
      await supabase.auth.signOut();
      setTimeout(onDone, 1800);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShoppingCart className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Set new password</h1>
          <p className="text-sm text-muted-foreground mt-1">for {email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">New Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={pw}
                onChange={e => { setPw(e.target.value); setMsg(null); }}
                placeholder="Min. 6 characters"
                className="w-full border rounded-xl px-4 pr-11 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                required
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw
                  ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Confirm New Password</label>
            <input
              type="password"
              value={pw2}
              onChange={e => { setPw2(e.target.value); setMsg(null); }}
              placeholder="Re-enter new password"
              className={`w-full border rounded-xl px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 transition-all ${
                pw2 && pw2 !== pw ? "border-red-400 focus:ring-red-200" : "focus:ring-primary/30 focus:border-primary"
              }`}
              required
            />
            {pw2 && pw2 !== pw && <p className="text-xs text-red-500">Passwords do not match</p>}
          </div>

          {msg && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              msg.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}>
              {msg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" />Updating...</>
              : "Set New Password"
            }
          </button>
        </form>
      </div>
    </div>
  );
}
const sampleProducts: Product[] = [
  {
    id: "1",
    name: "Boba Milk Tea",
    category: "Beverages",
    price: 5.99,
    cost: 2.5,
    unit: "unit",
    stock: 100,
  },
  {
    id: "2",
    name: "Matcha Latte",
    category: "Beverages",
    price: 6.49,
    cost: 2.8,
    unit: "unit",
    stock: 80,
  },
  {
    id: "3",
    name: "Brown Sugar Boba",
    category: "Beverages",
    price: 6.99,
    cost: 3.0,
    unit: "unit",
    stock: 90,
  },
  {
    id: "4",
    name: "Taro Milk Tea",
    category: "Beverages",
    price: 5.99,
    cost: 2.6,
    unit: "unit",
    stock: 75,
  },
  {
    id: "5",
    name: "Fresh Fruit Tea",
    category: "Beverages",
    price: 7.49,
    cost: 3.5,
    unit: "unit",
    stock: 60,
  },
  {
    id: "6",
    name: "Coffee Latte",
    category: "Coffee",
    price: 4.99,
    cost: 1.8,
    unit: "unit",
    stock: 120,
  },
  {
    id: "7",
    name: "Cappuccino",
    category: "Coffee",
    price: 4.49,
    cost: 1.6,
    unit: "unit",
    stock: 110,
  },
  {
    id: "8",
    name: "Espresso",
    category: "Coffee",
    price: 3.49,
    cost: 1.2,
    unit: "unit",
    stock: 150,
  },
  {
    id: "9",
    name: "Croissant",
    category: "Bakery",
    price: 3.99,
    cost: 1.5,
    unit: "piece",
    stock: 40,
  },
  {
    id: "10",
    name: "Muffin",
    category: "Bakery",
    price: 3.49,
    cost: 1.3,
    unit: "piece",
    stock: 45,
  },
];

// ── Types ────────────────────────────────────────────────────────────────────
interface AuthSession {
  accessToken: string;
  user: { id: string; email: string };
}
interface UserProfile {
  username: string;
  email: string;
  businessName: string;
  phoneNumber: string;
}
type SyncStatus =
  | "idle"
  | "saving"
  | "saved"
  | "error"
  | "loading";

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

function AppContent() {
  const { t } = useLanguage();
  const [authSession, setAuthSession] =
    useState<AuthSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    username: "",
    email: "",
    businessName: "AWC TRADING",
    phoneNumber: "",
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockAdjustments, setStockAdjustments] = useState<
    StockAdjustment[]
  >([]);
  const [activeTab, setActiveTab] = useState("orders");
  const [syncStatus, setSyncStatus] =
    useState<SyncStatus>("idle");
  const [dataLoaded, setDataLoaded] = useState(false);

  const saveTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  // ── Session check on mount ─────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthSession({
          accessToken: session.access_token,
          user: {
            id: session.user.id,
            email: session.user.email!,
          },
        });
      }
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (_e === "PASSWORD_RECOVERY") {
        // User clicked the reset link — show set-new-password screen
        setIsRecoverySession(true);
        setAuthSession(session ? {
          accessToken: session.access_token,
          user: { id: session.user.id, email: session.user.email! },
        } : null);
        setAuthLoading(false);
        return;
      }
      if (session) {
        setAuthSession({
          accessToken: session.access_token,
          user: {
            id: session.user.id,
            email: session.user.email!,
          },
        });
      } else {
        setAuthSession(null);
        setDataLoaded(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load data + subscription after login ───────────────────────────────────
  useEffect(() => {
    if (!authSession || dataLoaded) return;
    loadEverything(authSession.accessToken);
  }, [authSession, dataLoaded]);

  const loadEverything = async (token: string) => {
    setSyncStatus("loading");
    try {
      // 1. Load profile
      const profileRes = await fetch(`${SERVER}/user/profile`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "X-User-Token": token,
        },
      });
      if (profileRes.ok) {
        const { profile } = await profileRes.json();
        if (profile) {
          setUserProfile({
            username:
              profile.username ||
              authSession?.user.email?.split("@")[0] ||
              "",
            email:
              profile.email || authSession?.user.email || "",
            businessName: profile.businessName || "AWC TRADING",
            phoneNumber: profile.phoneNumber || "",
          });
        }
      }

      // 2. Load business data
      const dataRes = await fetch(`${SERVER}/user/data`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "X-User-Token": token,
        },
      });
      if (dataRes.ok) {
        const {
          products: sp,
          orders: so,
          expenses: se,
          stockItems: ss,
          stockAdjustments: sa,
        } = await dataRes.json();
        setProducts(sp || sampleProducts);
        setOrders(
          (so || []).map((o: Order) => ({
            ...o,
            date: new Date(o.date),
            subtotal: o.subtotal ?? o.total,
            discountType: o.discountType ?? "percentage",
            discount: o.discount ?? 0,
            discountAmount: o.discountAmount ?? 0,
          })),
        );
        setExpenses(
          (se || []).map((e: Expense) => ({
            ...e,
            date: new Date(e.date),
          })),
        );
        setStockItems(
          (ss || []).map((s: StockItem) => ({
            ...s,
            addedDate: new Date(s.addedDate),
          })),
        );
        setStockAdjustments(
          (sa || []).map((a: StockAdjustment) => ({
            ...a,
            date: new Date(a.date),
          })),
        );
      } else {
        const errText = await dataRes.text();
        throw new Error(`Server returned ${dataRes.status}: ${errText}`);
      }

      setSyncStatus("idle");
    } catch (err) {
      console.error("Load error:", err);
      // Fallback to local cache
      const local = localStorage.getItem(
        `${LOCAL_KEY}_${authSession?.user.id}`,
      );
      if (local) {
        try {
          const {
            products: lp,
            orders: lo,
            expenses: le,
            profile: lprof,
            stockItems: ls,
            stockAdjustments: la,
          } = JSON.parse(local);
          if (lp) setProducts(lp);
          if (lo)
            setOrders(
              lo.map((o: Order) => ({
                ...o,
                date: new Date(o.date),
              })),
            );
          if (le)
            setExpenses(
              le.map((e: Expense) => ({
                ...e,
                date: new Date(e.date),
              })),
            );
          if (ls)
            setStockItems(
              ls.map((s: StockItem) => ({
                ...s,
                addedDate: new Date(s.addedDate),
              })),
            );
          if (la)
            setStockAdjustments(
              la.map((a: StockAdjustment) => ({
                ...a,
                date: new Date(a.date),
              })),
            );
          if (lprof) setUserProfile(lprof);
        } catch (_) {}
      } else {
        setProducts(sampleProducts);
      }
      setSyncStatus("error");
    }
    setDataLoaded(true);
  };

  // ── Auto-save (debounced 2s) ───────────────────────────────────────────────
  const scheduleSave = useCallback(() => {
    if (!authSession || !dataLoaded) return;
    setSyncStatus("saving");
    if (saveTimerRef.current)
      clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${SERVER}/user/data`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
            "X-User-Token": authSession.accessToken,
          },
          body: JSON.stringify({
            products,
            orders,
            expenses,
            stockItems,
            stockAdjustments,
          }),
        });
        if (res.ok) {
          setSyncStatus("saved");
          localStorage.setItem(
            `${LOCAL_KEY}_${authSession.user.id}`,
            JSON.stringify({
              products,
              orders,
              expenses,
              stockItems,
              stockAdjustments,
              profile: userProfile,
            }),
          );
          setTimeout(() => setSyncStatus("idle"), 2000);
        } else {
          setSyncStatus("error");
        }
      } catch {
        setSyncStatus("error");
      }
    }, 2000);
  }, [
    authSession,
    dataLoaded,
    products,
    orders,
    expenses,
    userProfile,
    stockItems,
    stockAdjustments,
  ]);

  useEffect(() => {
    scheduleSave();
  }, [
    products,
    orders,
    expenses,
    stockItems,
    stockAdjustments,
  ]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLogin = (session: AuthSession) => {
    setAuthSession(session);
    setDataLoaded(false);
  };

  const handleLogout = async () => {
    if (saveTimerRef.current)
      clearTimeout(saveTimerRef.current);
    await supabase.auth.signOut();
    setAuthSession(null);
    setProducts([]);
    setOrders([]);
    setExpenses([]);
    setStockItems([]);
    setStockAdjustments([]);
    setDataLoaded(false);
    setSyncStatus("idle");
  };

  const handlePlaceOrder = (order: Omit<Order, "id">) => {
    const orderId = Date.now().toString();
    setOrders((prev) => [{ ...order, id: orderId }, ...prev]);

    // ── Auto-reduce stock for each ordered item ─────────────────────────────
    order.items.forEach((item) => {
      setStockItems((prev) => {
        const existing = prev.find(
          (s) => s.productName.toLowerCase() === item.productName.toLowerCase(),
        );
        if (!existing || existing.quantity <= 0) return prev;

        const reduceQty = Math.min(item.quantity, existing.quantity);
        const newQty = existing.quantity - reduceQty;

        const adj: StockAdjustment = {
          id: Date.now().toString() + "_" + item.productId + "_adj",
          stockItemId: existing.id,
          productName: existing.productName,
          adjustmentType: "reduce",
          reason: "sold",
          quantity: reduceQty,
          previousQty: existing.quantity,
          newQty,
          date: new Date(),
          notes: `Order #${orderId}`,
        };
        setStockAdjustments((prevAdj) => [adj, ...prevAdj]);

        return prev.map((s) =>
          s.id === existing.id ? { ...s, quantity: newQty } : s,
        );
      });
    });
  };
  const handleAddExpense = (expense: Omit<Expense, "id">) => {
    const newExpense = {
      ...expense,
      id: Date.now().toString(),
    };
    setExpenses((prev) => [...prev, newExpense]);

    // ── Auto-update stock when expense is recorded ──────────────────────────
    setStockItems((prev) => {
      const existing = prev.find(
        (s) =>
          s.productName.toLowerCase() ===
          expense.productName.toLowerCase(),
      );
      if (existing) {
        // increase quantity of existing stock item, update expiryDate if provided
        const adj: StockAdjustment = {
          id: Date.now().toString() + "_adj",
          stockItemId: existing.id,
          productName: existing.productName,
          adjustmentType: "add",
          reason: "received",
          quantity: expense.quantity,
          previousQty: existing.quantity,
          newQty: existing.quantity + expense.quantity,
          date: new Date(),
          notes: `From expense record${expense.notes ? ": " + expense.notes : ""}`,
        };
        setStockAdjustments((prevAdj) => [adj, ...prevAdj]);
        return prev.map((s) =>
          s.id === existing.id
            ? {
                ...s,
                quantity: s.quantity + expense.quantity,
                // update expiryDate if a newer one is provided
                ...(expense.expiryDate
                  ? { expiryDate: expense.expiryDate }
                  : {}),
              }
            : s,
        );
      } else {
        // create a new stock item automatically
        const newId = Date.now().toString() + "_stock";
        const adj: StockAdjustment = {
          id: Date.now().toString() + "_adj",
          stockItemId: newId,
          productName: expense.productName,
          adjustmentType: "add",
          reason: "received",
          quantity: expense.quantity,
          previousQty: 0,
          newQty: expense.quantity,
          date: new Date(),
          notes: `Auto-created from expense record${expense.notes ? ": " + expense.notes : ""}`,
        };
        setStockAdjustments((prevAdj) => [adj, ...prevAdj]);
        return [
          {
            id: newId,
            productName: expense.productName,
            category: "Expense-linked",
            quantity: expense.quantity,
            unit: expense.unit,
            expiryDate: expense.expiryDate,
            addedDate: new Date(),
            notes: "Auto-created from expense",
          },
          ...prev,
        ];
      }
    });
  };
  const handleDeleteExpense = (id: string) =>
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  const handleVoidOrder = (id: string) =>
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? { ...o, status: "cancelled" as const }
          : o,
      ),
    );
  const handleAddProduct = (p: Omit<Product, "id">) => {
    const newId = Date.now().toString();
    setProducts((prev) => [...prev, { ...p, id: newId }]);

    // ── Also create a stock item so it appears in Stock section ────────────
    setStockItems((prev) => {
      const exists = prev.some(
        (s) => s.productName.toLowerCase() === p.name.toLowerCase(),
      );
      if (exists) return prev;
      return [
        {
          id: newId + "_stock",
          productName: p.name,
          category: p.category || "General",
          quantity: p.stock ?? 0,
          unit: p.unit,
          costPerUnit: p.cost > 0 ? p.cost : undefined,
          sellingPrice: p.price > 0 ? p.price : undefined,
          addedDate: new Date(),
          notes: "Auto-created from product",
        },
        ...prev,
      ];
    });

    // ── Auto-create expense if initial stock + cost are provided ───────────
    if ((p.stock ?? 0) > 0 && p.cost > 0) {
      const expenseId = newId + "_init_exp";
      const newExpense: Expense = {
        id: expenseId,
        productId: newId,
        productName: p.name,
        quantity: p.stock!,
        unit: p.unit,
        costPerUnit: p.cost,
        totalCost: p.cost * p.stock!,
        date: new Date(),
        notes: "Initial stock entry from new product",
      };
      setExpenses((prev) => [newExpense, ...prev]);
    }
  };
  const handleUpdateProduct = (
    id: string,
    p: Omit<Product, "id">,
  ) =>
    setProducts((prev) =>
      prev.map((x) => (x.id === id ? { ...p, id } : x)),
    );
  const handleDeleteProduct = (id: string) =>
    setProducts((prev) => prev.filter((p) => p.id !== id));

  const handleAddStock = (
    item: Omit<StockItem, "id" | "addedDate">,
    qty: number,
  ) => {
    const id = Date.now().toString();
    const newItem: StockItem = {
      ...item,
      id,
      addedDate: new Date(),
    };
    setStockItems((prev) => [newItem, ...prev]);
    const adj: StockAdjustment = {
      id: Date.now().toString() + "_adj",
      stockItemId: id,
      productName: item.productName,
      adjustmentType: "add",
      reason: "initial",
      quantity: qty,
      previousQty: 0,
      newQty: qty,
      date: new Date(),
    };
    setStockAdjustments((prev) => [adj, ...prev]);

    // ── Auto-create expense record if costPerUnit is provided ───────────────
    if (item.costPerUnit && item.costPerUnit > 0) {
      const expenseId = Date.now().toString() + "_stock_exp";
      const newExpense: Expense = {
        id: expenseId,
        productId: id,
        productName: item.productName,
        quantity: qty,
        unit: item.unit,
        costPerUnit: item.costPerUnit,
        totalCost: item.costPerUnit * qty,
        date: new Date(),
        notes: `Initial stock entry${item.notes ? ": " + item.notes : ""}`,
      };
      setExpenses((prev) => [newExpense, ...prev]);
    }

    // ── Auto-create a product in Expenses if not already there ──────────────
    setProducts((prev) => {
      const exists = prev.some(
        (p) =>
          p.name.toLowerCase() ===
          item.productName.toLowerCase(),
      );
      if (exists) return prev;
      return [
        ...prev,
        {
          id: Date.now().toString() + "_prod",
          name: item.productName,
          category: item.category || "General",
          price: item.sellingPrice ?? 0,
          cost: item.costPerUnit ?? 0,
          unit: item.unit,
          stock: qty,
          imageUrl: "",
          showInOrders: false, // hidden by default — user can toggle in Expenses tab
        },
      ];
    });
  };

  const handleReduceStock = (
    itemId: string,
    qty: number,
    reason: string,
    notes: string,
    costPerUnit?: number,
  ) => {
    // Negative qty = top-up (add), positive = reduce
    setStockItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const isTopUp = qty < 0;
        const absQty = Math.abs(qty);
        const previousQty = item.quantity;
        const newQty = isTopUp
          ? previousQty + absQty
          : Math.max(0, previousQty - absQty);
        const adj: StockAdjustment = {
          id: Date.now().toString() + "_adj",
          stockItemId: itemId,
          productName: item.productName,
          adjustmentType: isTopUp ? "add" : "reduce",
          reason: (isTopUp
            ? "received"
            : reason) as StockAdjustment["reason"],
          quantity: absQty,
          previousQty,
          newQty,
          date: new Date(),
          notes: notes || undefined,
        };
        setStockAdjustments((prevAdj) => [adj, ...prevAdj]);

        // ── Auto-create expense when topping up with a cost ─────────────────
        if (isTopUp && costPerUnit && costPerUnit > 0) {
          const expenseId = Date.now().toString() + "_topup_exp";
          const newExpense: Expense = {
            id: expenseId,
            productId: itemId,
            productName: item.productName,
            quantity: absQty,
            unit: item.unit,
            costPerUnit,
            totalCost: costPerUnit * absQty,
            date: new Date(),
            notes: `Stock top-up${notes ? ": " + notes : ""}`,
          };
          setExpenses((prevExp) => [newExpense, ...prevExp]);
        }

        return { ...item, quantity: newQty };
      }),
    );
  };

  const handleDeleteStock = (itemId: string) => {
    // Find the stock item before deleting so we can clean up linked expenses
    const stockItem = stockItems.find((s) => s.id === itemId);
    setStockItems((prev) => prev.filter((s) => s.id !== itemId));
    setStockAdjustments((prev) => prev.filter((a) => a.stockItemId !== itemId));

    // Remove expenses that were auto-created from this stock item
    if (stockItem) {
      setExpenses((prev) =>
        prev.filter(
          (e) =>
            !(
              e.productName.toLowerCase() === stockItem.productName.toLowerCase() &&
              (e.notes?.startsWith("Initial stock entry") ||
                e.notes?.startsWith("Stock top-up"))
            ),
        ),
      );
    }
  };

  const handleUpdateUser = async (userData: UserProfile) => {
    setUserProfile(userData);
    if (authSession) {
      fetch(`${SERVER}/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
          "X-User-Token": authSession.accessToken,
        },
        body: JSON.stringify(userData),
      }).catch(console.error);
    }
  };

  const handleExportData = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              products,
              orders,
              expenses,
              stockItems,
              stockAdjustments,
              user: userProfile,
              exportDate: new Date().toISOString(),
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    Object.assign(document.createElement("a"), {
      href: url,
      download: `awc-data-${new Date().toISOString().split("T")[0]}.json`,
    }).click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (json: string) => {
    const data = JSON.parse(json);
    if (data.products) setProducts(data.products);
    if (data.orders)
      setOrders(
        data.orders.map((o: Order) => ({
          ...o,
          date: new Date(o.date),
        })),
      );
    if (data.expenses)
      setExpenses(
        data.expenses.map((e: Expense) => ({
          ...e,
          date: new Date(e.date),
        })),
      );
    if (data.stockItems)
      setStockItems(
        data.stockItems.map((s: StockItem) => ({
          ...s,
          addedDate: new Date(s.addedDate),
        })),
      );
    if (data.stockAdjustments)
      setStockAdjustments(
        data.stockAdjustments.map((a: StockAdjustment) => ({
          ...a,
          date: new Date(a.date),
        })),
      );
    if (data.user) setUserProfile(data.user);
  };

  // ── Sync badge ─────────────────────────────────────────────────────────────
  const SyncBadge = () => (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {syncStatus === "loading" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="hidden sm:inline">
            {t.common.loading}
          </span>
        </>
      )}
      {syncStatus === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
          <span className="hidden sm:inline text-blue-500">
            {t.common.saving}
          </span>
        </>
      )}
      {syncStatus === "saved" && (
        <>
          <Cloud className="h-3 w-3 text-green-500" />
          <span className="hidden sm:inline text-green-500">
            {t.common.saved}
          </span>
        </>
      )}
      {syncStatus === "error" && (
        <>
          <CloudOff className="h-3 w-3 text-red-500" />
          <span className="hidden sm:inline text-red-500">
            {t.common.offline}
          </span>
        </>
      )}
      {syncStatus === "idle" && (
        <>
          <Cloud className="h-3 w-3 text-muted-foreground/40" />
          <span className="hidden sm:inline">
            {t.common.cloudSync}
          </span>
        </>
      )}
    </div>
  );

  // ── Loading screens ────────────────────────────────────────────────────────
  const LoadingScreen = ({ msg }: { msg: string }) => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <ShoppingCart className="h-8 w-8 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-bold text-xl">AWC TRADING</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {msg}
          </p>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
      </div>
    </div>
  );

  if (authLoading)
    return <LoadingScreen msg="Checking your session..." />;
  if (isRecoverySession && authSession)
    return (
      <>
        <SetNewPasswordScreen
          email={authSession.user.email}
          onDone={() => {
            setIsRecoverySession(false);
            setAuthSession(null);
          }}
        />
        <Toaster />
      </>
    );
  if (!authSession)
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster />
      </>
    );
  if (!dataLoaded)
    return <LoadingScreen msg="Loading your dashboard..." />;

  // ── MAIN APP ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-medium">
                    {userProfile.businessName}
                  </h1>
                </div>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  {t.common.businessSystem}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <SyncBadge />

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium leading-none">
                    {userProfile.username ||
                      authSession.user.email.split("@")[0]}
                  </p>
                  <p className="text-xs text-muted-foreground leading-none mt-0.5">
                    {authSession.user.email}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition-all"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {t.common.signOut}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-6 flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl grid-cols-5 mb-8">
            <TabsTrigger
              value="orders"
              className="flex items-center gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t.nav.orders}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="expenses"
              className="flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t.nav.expenses}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t.nav.analytics}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="stock"
              className="flex items-center gap-2"
            >
              <Package2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t.nav.stock}</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t.nav.settings}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-0">
            <OrderSummary
              products={products}
              onPlaceOrder={handlePlaceOrder}
              businessProfile={userProfile}
            />
          </TabsContent>
          <TabsContent value="expenses" className="mt-0">
            <ExpenseManagement
              products={products}
              expenses={expenses}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          </TabsContent>
          <TabsContent value="analytics" className="mt-0">
            <ProfitAnalytics
              orders={orders}
              expenses={expenses}
              onVoidOrder={handleVoidOrder}
              onDeleteExpense={handleDeleteExpense}
              businessProfile={userProfile}
            />
          </TabsContent>
          <TabsContent value="stock" className="mt-0">
            <StockManagement
              stockItems={stockItems}
              stockAdjustments={stockAdjustments}
              expenses={expenses}
              onAddStock={handleAddStock}
              onReduceStock={handleReduceStock}
              onDeleteStock={handleDeleteStock}
            />
          </TabsContent>
          <TabsContent value="settings" className="mt-0">
            <UserSettings
              currentUser={userProfile}
              onUpdateUser={(u) =>
                void handleUpdateUser({
                  ...u,
                  phoneNumber:
                    // Support older shape + newer phoneNumber field
                    (u as any).phoneNumber ?? userProfile.phoneNumber,
                })
              }
              onLogout={handleLogout}
              onExportData={handleExportData}
              onImportData={handleImportData}
              accessToken={authSession.accessToken}
            />
          </TabsContent>
        </Tabs>
      </main>

      <Toaster />
    </div>
  );
}
