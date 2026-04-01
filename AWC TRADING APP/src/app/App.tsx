import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { supabase, SERVER } from "../lib/supabase";
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
  SubscriptionWall,
  GraceBanner,
} from "./components/SubscriptionWall";
import {
  Product,
  Order,
  Expense,
  StockItem,
  StockAdjustment,
} from "./types/business";
import { Toaster } from "./components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";
import {
  LanguageProvider,
  useLanguage,
} from "./contexts/LanguageContext";

const LOCAL_KEY = "awc_local_data";

// ── Sample products for new users ─────────────────────────────────────────────
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
}
interface SubscriptionAccess {
  status: "trial" | "active" | "grace_period" | "blocked";
  daysLeft: number;
  graceDaysLeft: number;
  expiresAt: string;
  gracePeriodEndsAt: string;
}
type SyncStatus =
  | "idle"
  | "saving"
  | "saved"
  | "error"
  | "loading";

// ── FPX Banks for renewal dialog ──────────────────────────────────────────────
const FPX_BANKS_SIMPLE = [
  {
    code: "MBB0227",
    name: "Maybank",
    abbr: "M2U",
    color: "#F5A623",
  },
  {
    code: "CIMB0219",
    name: "CIMB Clicks",
    abbr: "CIMB",
    color: "#CC0001",
  },
  {
    code: "RHB0218",
    name: "RHB Bank",
    abbr: "RHB",
    color: "#003D7C",
  },
  {
    code: "HLB0224",
    name: "Hong Leong",
    abbr: "HLB",
    color: "#004A97",
  },
  {
    code: "PBB0233",
    name: "Public Bank",
    abbr: "PBB",
    color: "#003087",
  },
  {
    code: "BIMB0340",
    name: "Bank Islam",
    abbr: "BIMB",
    color: "#009933",
  },
];

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
  const [userProfile, setUserProfile] = useState<UserProfile>({
    username: "",
    email: "",
    businessName: "AWC TRADING",
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
  const [subAccess, setSubAccess] =
    useState<SubscriptionAccess | null>(null);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewBank, setRenewBank] = useState<
    (typeof FPX_BANKS_SIMPLE)[0] | null
  >(null);
  const [renewStep, setRenewStep] = useState<
    "select" | "processing" | "done"
  >("select");
  const [renewRef, setRenewRef] = useState("");

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
        setSubAccess(null);
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
      // 1. Load subscription status first
      const subRes = await fetch(
        `${SERVER}/user/subscription`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (subRes.ok) {
        const { access } = await subRes.json();
        setSubAccess(access);

        // If blocked, stop here — don't load data
        if (access?.status === "blocked") {
          setSyncStatus("idle");
          setDataLoaded(true);
          return;
        }
      }

      // 2. Load profile
      const profileRes = await fetch(`${SERVER}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
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
          });
        }
      }

      // 3. Load business data
      const dataRes = await fetch(`${SERVER}/user/data`, {
        headers: { Authorization: `Bearer ${token}` },
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
    if (subAccess?.status === "blocked") return; // don't try to save if blocked
    setSyncStatus("saving");
    if (saveTimerRef.current)
      clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${SERVER}/user/data`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authSession.accessToken}`,
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
    subAccess,
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
    setSubAccess(null);
  };

  const handlePlaceOrder = (order: Omit<Order, "id">) =>
    setOrders((prev) => [
      { ...order, id: Date.now().toString() },
      ...prev,
    ]);
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
  const handleAddProduct = (p: Omit<Product, "id">) =>
    setProducts((prev) => [
      ...prev,
      { ...p, id: Date.now().toString() },
    ]);
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
        return { ...item, quantity: newQty };
      }),
    );
  };

  const handleDeleteStock = (itemId: string) => {
    setStockItems((prev) =>
      prev.filter((s) => s.id !== itemId),
    );
  };

  const handleUpdateUser = async (userData: UserProfile) => {
    setUserProfile(userData);
    if (authSession) {
      fetch(`${SERVER}/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession.accessToken}`,
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

  // ── Handle successful FPX renewal payment ─────────────────────────────────
  const handleRenewalPayment = async (
    ref: string,
    bank: string,
  ) => {
    if (!authSession) return;
    try {
      const res = await fetch(
        `${SERVER}/user/subscription/activate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authSession.accessToken}`,
          },
          body: JSON.stringify({
            paymentRef: ref,
            bank,
            amount: 59,
          }),
        },
      );
      if (res.ok) {
        const { access } = await res.json();
        setSubAccess(access);
      }
    } catch (err) {
      console.error("Renewal activate error:", err);
    }
    setRenewOpen(false);
    setRenewStep("select");
    setRenewBank(null);
  };

  // ── Renewal from SubscriptionWall (blocked) ────────────────────────────────
  const handleWallPayment = async (
    ref: string,
    bank: string,
  ) => {
    await handleRenewalPayment(ref, bank);
    // Reload data after unblocking
    setDataLoaded(false);
  };

  // ── Quick in-app renew (from banner) ──────────��────────────────────────���──
  const handleQuickRenew = async () => {
    if (!renewBank) return;
    setRenewStep("processing");
    const ref =
      "FPX" + Date.now().toString().slice(-10).toUpperCase();
    await new Promise((r) => setTimeout(r, 2500));
    setRenewRef(ref);
    setRenewStep("done");
    await handleRenewalPayment(ref, renewBank.name);
    setRenewStep("done");
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

  // ── Subscription status badge for header ───────────────────────────────────
  const SubBadge = () => {
    if (!subAccess) return null;
    const cfg = {
      trial: {
        label: `Trial: ${subAccess.daysLeft}d left`,
        className: "bg-blue-100 text-blue-700 border-blue-200",
      },
      active: {
        label: `Active: ${subAccess.daysLeft}d left`,
        className:
          "bg-green-100 text-green-700 border-green-200",
      },
      grace_period: {
        label: `Grace: ${subAccess.graceDaysLeft}d left`,
        className: "bg-red-100 text-red-700 border-red-200",
      },
      blocked: {
        label: "Suspended",
        className: "bg-red-600 text-white border-red-700",
      },
    }[subAccess.status];
    return (
      <span
        className={`hidden sm:inline text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.className}`}
      >
        {cfg.label}
      </span>
    );
  };

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
  if (!authSession)
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster />
      </>
    );
  if (!dataLoaded)
    return <LoadingScreen msg="Loading your dashboard..." />;

  // ── BLOCKED: show full-screen subscription wall ────────────────────────────
  if (subAccess?.status === "blocked") {
    const gracePeriodEnd = subAccess.gracePeriodEndsAt
      ? new Date(subAccess.gracePeriodEndsAt)
      : new Date();
    const daysOverdue = Math.max(
      0,
      Math.ceil(
        (Date.now() - gracePeriodEnd.getTime()) / 86400000,
      ),
    );
    return (
      <>
        <SubscriptionWall
          userEmail={authSession.user.email}
          businessName={userProfile.businessName}
          daysOverdue={daysOverdue}
          onPaymentSuccess={handleWallPayment}
          onLogout={handleLogout}
        />
        <Toaster />
      </>
    );
  }

  // ── MAIN APP ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Grace period / expiry warning banner */}
      {subAccess &&
        (subAccess.status === "grace_period" ||
          (subAccess.status === "trial" &&
            subAccess.daysLeft <= 7) ||
          (subAccess.status === "active" &&
            subAccess.daysLeft <= 7)) && (
          <GraceBanner
            status={subAccess.status as any}
            daysLeft={
              subAccess.status === "grace_period"
                ? subAccess.graceDaysLeft
                : subAccess.daysLeft
            }
            onRenewClick={() => {
              setRenewStep("select");
              setRenewBank(null);
              setRenewOpen(true);
            }}
          />
        )}

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
                  <SubBadge />
                </div>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  {t.common.businessSystem}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <SyncBadge />

              {/* Renew button if in grace or close to expiry */}
              {subAccess &&
                (subAccess.status === "grace_period" ||
                  subAccess.daysLeft <= 3) && (
                  <button
                    onClick={() => {
                      setRenewStep("select");
                      setRenewBank(null);
                      setRenewOpen(true);
                    }}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-all"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    {t.common.renewNow}
                  </button>
                )}

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
              <span className="hidden sm:inline">Stock</span>
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
              onUpdateUser={handleUpdateUser}
              onLogout={handleLogout}
              onExportData={handleExportData}
              onImportData={handleImportData}
              accessToken={authSession.accessToken}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Quick Renew Dialog (from banner / header button) ── */}
      <Dialog
        open={renewOpen}
        onOpenChange={(v) => {
          if (!v) {
            setRenewOpen(false);
            setRenewStep("select");
            setRenewBank(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Renew Subscription
            </DialogTitle>
            <DialogDescription>
              Pay RM59 via FPX to renew for 30 days
            </DialogDescription>
          </DialogHeader>

          {renewStep === "select" && (
            <div className="space-y-4">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">
                    AWC Business Plan
                  </p>
                  <p className="text-xs text-muted-foreground">
                    30-day renewal
                  </p>
                </div>
                <p className="text-xl font-bold text-primary">
                  RM 59
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {FPX_BANKS_SIMPLE.map((bank) => (
                  <button
                    key={bank.code}
                    onClick={() => setRenewBank(bank)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${
                      renewBank?.code === bank.code
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-white font-black flex-shrink-0"
                      style={{
                        backgroundColor: bank.color,
                        fontSize: "7px",
                      }}
                    >
                      {bank.abbr}
                    </div>
                    <span className="text-xs font-medium">
                      {bank.name}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setRenewOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border text-sm text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickRenew}
                  disabled={!renewBank}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 hover:bg-primary/90"
                >
                  Pay Now
                </button>
              </div>
            </div>
          )}

          {renewStep === "processing" && (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                <div className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin border-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold">
                  Processing FPX Payment...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Connecting to {renewBank?.name} via PayNet
                </p>
              </div>
            </div>
          )}

          {renewStep === "done" && (
            <div className="flex flex-col items-center py-6 gap-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <Cloud className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-bold text-lg text-green-700">
                  Payment Successful!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ref:{" "}
                  <span className="font-mono">{renewRef}</span>
                </p>
                <p className="text-sm mt-2">
                  Your subscription is now active for{" "}
                  <strong>30 days</strong>.
                </p>
              </div>
              <button
                onClick={() => {
                  setRenewOpen(false);
                  setRenewStep("select");
                }}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
              >
                Done
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}