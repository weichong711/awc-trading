import { useState, useEffect, useRef } from "react";
import {
  CreditCard, CheckCircle2, XCircle, Clock, AlertTriangle,
  Shield, Zap, RefreshCw, Receipt, ExternalLink, Check,
  Building2, Smartphone, Info, ArrowRight, Lock, Eye, EyeOff,
  ChevronLeft, Wifi, Signal, Battery, AlertCircle, Key,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

// ─── Types ──────────────────────────────────────────────────────────────────
type SubscriptionStatus = "active" | "expired" | "grace_period" | "cancelled" | "trial";
type PaymentMethod = "fpx" | "duitnow";
type FpxStep = "select_bank" | "bank_portal" | "bank_login" | "bank_tac" | "bank_confirm" | "processing" | "success" | "failed";

interface BillingRecord {
  id: string;
  date: Date;
  amount: number;
  status: "paid" | "failed" | "pending";
  method: string;
  bank: string;
  reference: string;
}

interface SubscriptionData {
  status: SubscriptionStatus;
  planName: string;
  amount: number;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate: Date;
  mandateId: string | null;
  paymentMethod: PaymentMethod | null;
  bank: string | null;
  billingHistory: BillingRecord[];
}

// ─── Malaysian Banks ─────────────────────────────────────────────────────────
const FPX_BANKS = [
  { code: "MBB0227",  name: "Maybank",                  abbr: "M2U",  color: "#F5A623", textColor: "#fff", portalColor: "#f5a623", portalBg: "#fffbf0", accentColor: "#e6951a" },
  { code: "CIMB0219", name: "CIMB Clicks",              abbr: "CIMB", color: "#CC0001", textColor: "#fff", portalColor: "#CC0001", portalBg: "#fff5f5", accentColor: "#a30001" },
  { code: "RHB0218",  name: "RHB Bank",                 abbr: "RHB",  color: "#003D7C", textColor: "#fff", portalColor: "#003D7C", portalBg: "#f0f4ff", accentColor: "#002a5a" },
  { code: "HLB0224",  name: "Hong Leong Bank",          abbr: "HLB",  color: "#004A97", textColor: "#fff", portalColor: "#004A97", portalBg: "#f0f5ff", accentColor: "#003070" },
  { code: "PBB0233",  name: "Public Bank",              abbr: "PBB",  color: "#003087", textColor: "#fff", portalColor: "#003087", portalBg: "#f0f4ff", accentColor: "#00205c" },
  { code: "AMB0208",  name: "AmBank",                   abbr: "AMB",  color: "#FF6600", textColor: "#fff", portalColor: "#FF6600", portalBg: "#fff8f0", accentColor: "#cc5200" },
  { code: "BIMB0340", name: "Bank Islam",               abbr: "BIMB", color: "#009933", textColor: "#fff", portalColor: "#009933", portalBg: "#f0fff4", accentColor: "#007a28" },
  { code: "BSN0601",  name: "BSN",                      abbr: "BSN",  color: "#E30613", textColor: "#fff", portalColor: "#E30613", portalBg: "#fff5f5", accentColor: "#b5040f" },
  { code: "OCBC0229", name: "OCBC Bank",                abbr: "OCBC", color: "#DA291C", textColor: "#fff", portalColor: "#DA291C", portalBg: "#fff5f5", accentColor: "#ad200f" },
  { code: "UOB0226",  name: "UOB Bank",                 abbr: "UOB",  color: "#003087", textColor: "#fff", portalColor: "#003087", portalBg: "#f0f4ff", accentColor: "#00205c" },
  { code: "SCB0216",  name: "Standard Chartered",       abbr: "SCB",  color: "#00AEEF", textColor: "#fff", portalColor: "#00AEEF", portalBg: "#f0faff", accentColor: "#0090c5" },
  { code: "BMMB0342", name: "Bank Muamalat",            abbr: "BMM",  color: "#006B3F", textColor: "#fff", portalColor: "#006B3F", portalBg: "#f0fff8", accentColor: "#004d2d" },
];

type BankType = typeof FPX_BANKS[0];

const PLAN_FEATURES = [
  "Full POS Order Management",
  "Expense Tracking & Management",
  "Profit Analytics & Reports",
  "Product Image Management",
  "Receipt Printing",
  "Data Export & Import",
  "Cloud Sync (coming soon)",
  "Priority Support",
];

const STATUS_CONFIG = {
  active:       { labelKey: "statusActive",      color: "bg-green-100 text-green-700 border-green-200",   icon: CheckCircle2,  iconColor: "text-green-600",  bgColor: "bg-green-50 border-green-200" },
  expired:      { labelKey: "statusExpired",     color: "bg-red-100 text-red-700 border-red-200",         icon: XCircle,       iconColor: "text-red-600",    bgColor: "bg-red-50 border-red-200" },
  grace_period: { labelKey: "statusGracePeriod", color: "bg-yellow-100 text-yellow-700 border-yellow-200",icon: AlertTriangle, iconColor: "text-yellow-600", bgColor: "bg-yellow-50 border-yellow-200" },
  cancelled:    { labelKey: "statusCancelled",   color: "bg-gray-100 text-gray-700 border-gray-200",      icon: XCircle,       iconColor: "text-gray-600",   bgColor: "bg-gray-50 border-gray-200" },
  trial:        { labelKey: "statusTrial",       color: "bg-blue-100 text-blue-700 border-blue-200",      icon: Clock,         iconColor: "text-blue-600",   bgColor: "bg-blue-50 border-blue-200" },
};

const MOCK_SUBSCRIPTION: SubscriptionData = {
  status: "active",
  planName: "AWC Business Plan",
  amount: 59,
  currency: "MYR",
  currentPeriodStart: new Date("2026-03-01"),
  currentPeriodEnd:   new Date("2026-03-31"),
  nextBillingDate:    new Date("2026-04-01"),
  mandateId:   "CURLEC-MDT-2026030001",
  paymentMethod: "fpx",
  bank: "Maybank",
  billingHistory: [
    { id: "1", date: new Date("2026-03-01"), amount: 59, status: "paid",   method: "FPX Auto-Debit", bank: "Maybank", reference: "CRL-2026030001" },
    { id: "2", date: new Date("2026-02-01"), amount: 59, status: "paid",   method: "FPX Auto-Debit", bank: "Maybank", reference: "CRL-2026020001" },
    { id: "3", date: new Date("2026-01-01"), amount: 59, status: "paid",   method: "FPX Auto-Debit", bank: "Maybank", reference: "CRL-2026010001" },
  ],
};

// ─── Generate TAC ────────────────────────────────────────────────────────────
function generateTac() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateRef() {
  return "FPX" + Date.now().toString().slice(-10).toUpperCase();
}

// ════════════════════════════════════════════════════════════════════════════
// BANK PORTAL SIMULATOR  (looks like a real bank FPX page inside a "browser")
// ════════════════════════════════════════════════════════════════════════════
function BankPortalSimulator({
  bank,
  amount,
  onSuccess,
  onCancel,
}: {
  bank: BankType;
  amount: number;
  onSuccess: (ref: string) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<"login" | "tac" | "confirm" | "processing" | "success">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [tac, setTac] = useState("");
  const [tacGenerated] = useState(generateTac());
  const [ref]  = useState(generateRef());
  const [loginError, setLoginError] = useState("");
  const [tacError, setTacError] = useState("");
  const [progress, setProgress] = useState(0);
  const tacRef = useRef<HTMLInputElement>(null);
  const now = new Date();

  // Progress bar during processing
  useEffect(() => {
    if (step !== "processing") return;
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + 4;
      });
    }, 80);
    const timer = setTimeout(() => {
      setStep("success");
    }, 2500);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [step]);

  // Auto-focus TAC input
  useEffect(() => {
    if (step === "tac") tacRef.current?.focus();
  }, [step]);

  const handleLogin = () => {
    if (!username) { setLoginError("Please enter your Username ID."); return; }
    if (!password) { setLoginError("Please enter your Password."); return; }
    setLoginError("");
    setStep("tac");
  };

  const handleTac = () => {
    if (tac !== tacGenerated) { setTacError("Invalid TAC. Please try again."); return; }
    setTacError("");
    setStep("confirm");
  };

  const handleConfirm = () => {
    setStep("processing");
  };

  const handleDone = () => {
    onSuccess(ref);
  };

  const isMaybank = bank.code === "MBB0227";

  return (
    <div className="w-full flex flex-col" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>

      {/* ── Fake Browser Chrome ── */}
      <div className="rounded-t-xl overflow-hidden border border-gray-300 shadow-xl">

        {/* Browser top bar */}
        <div className="bg-gray-200 px-3 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-2 bg-white rounded px-3 py-1 flex items-center gap-2 text-xs text-gray-500 border">
            <Lock className="h-3 w-3 text-green-600 flex-shrink-0" />
            <span className="truncate">
              {isMaybank ? "www.maybank2u.com.my" : `www.${bank.name.toLowerCase().replace(/\s+/g, "")}.com.my`}/fpx/payment
            </span>
          </div>
          <Shield className="h-4 w-4 text-green-600 flex-shrink-0" />
        </div>

        {/* Bank Portal Content */}
        <div className="bg-white min-h-[420px]" style={{ backgroundColor: bank.portalBg }}>

          {/* Bank Header Bar */}
          <div className="px-6 py-3 flex items-center justify-between" style={{ backgroundColor: bank.portalColor }}>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-white rounded flex items-center justify-center">
                <span className="font-black text-xs" style={{ color: bank.portalColor }}>{bank.abbr}</span>
              </div>
              <div>
                <span className="text-white font-bold text-sm">{bank.name}</span>
                {isMaybank && <span className="text-white/80 text-xs block">Maybank2u</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 text-white/80 text-xs">
              <Lock className="h-3.5 w-3.5" />
              <span>Secure FPX</span>
            </div>
          </div>

          {/* FPX Info Bar */}
          <div className="px-4 py-2 flex items-center gap-2 border-b text-xs" style={{ backgroundColor: "#f9f9f9", borderColor: "#e0e0e0" }}>
            <div className="h-5 w-5 rounded bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold" style={{ fontSize: "8px" }}>FPX</span>
            </div>
            <span className="text-gray-600">Financial Process Exchange (FPX) · Secured by PayNet Malaysia</span>
          </div>

          <div className="p-5">
            {/* ── LOGIN STEP ── */}
            {step === "login" && (
              <div className="max-w-sm mx-auto">
                <h2 className="font-bold mb-1" style={{ color: bank.portalColor, fontSize: "15px" }}>
                  {isMaybank ? "Maybank2u Login" : `${bank.name} Online Banking`}
                </h2>
                <p className="text-gray-500 mb-4 text-xs">Please login to authorize FPX payment</p>

                {/* Payment summary box */}
                <div className="rounded-lg p-3 mb-4 border" style={{ backgroundColor: bank.portalBg, borderColor: bank.portalColor + "40" }}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Merchant</span>
                    <span className="font-medium">AWC Trading Sdn Bhd</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Description</span>
                    <span className="font-medium">Subscription – Apr 2026</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-bold text-sm" style={{ color: bank.portalColor }}>RM {amount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      {isMaybank ? "Username ID" : "User ID / Username"}
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={e => { setUsername(e.target.value); setLoginError(""); }}
                      placeholder={isMaybank ? "Enter Maybank2u Username" : "Enter your User ID"}
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none"
                      style={{ borderColor: loginError ? "#e53e3e" : "#ccc", focusBorderColor: bank.portalColor }}
                      onKeyDown={e => e.key === "Enter" && document.getElementById("fpx-pass")?.focus()}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Password</label>
                    <div className="relative">
                      <input
                        id="fpx-pass"
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setLoginError(""); }}
                        placeholder="Enter your password"
                        className="w-full border rounded px-3 py-2 text-sm pr-10 focus:outline-none"
                        style={{ borderColor: loginError ? "#e53e3e" : "#ccc" }}
                        onKeyDown={e => e.key === "Enter" && handleLogin()}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <div className="flex items-center gap-1.5 text-red-600 text-xs">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      {loginError}
                    </div>
                  )}

                  <button
                    onClick={handleLogin}
                    className="w-full py-2.5 rounded text-white font-semibold text-sm transition-opacity hover:opacity-90 mt-1"
                    style={{ backgroundColor: bank.portalColor }}
                  >
                    Login & Proceed
                  </button>

                  <div className="flex justify-between text-xs" style={{ color: bank.portalColor }}>
                    <button className="hover:underline">Forgot Password?</button>
                    <button className="hover:underline">Forgot Username?</button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400">
                  <span>🔒 256-bit SSL</span>
                  <span>PayNet Certified</span>
                  <button onClick={onCancel} className="text-red-500 hover:underline">Cancel</button>
                </div>
              </div>
            )}

            {/* ── TAC STEP ── */}
            {step === "tac" && (
              <div className="max-w-sm mx-auto">
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={() => setStep("login")} className="text-gray-400 hover:text-gray-600">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h2 className="font-bold" style={{ color: bank.portalColor, fontSize: "15px" }}>TAC Verification</h2>
                    <p className="text-gray-500 text-xs">Transaction Authorisation Code</p>
                  </div>
                </div>

                {/* SMS notification box */}
                <div className="rounded-xl border p-4 mb-4 bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">SMS</span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">TAC sent to: +60**-***-3821</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        A 6-digit TAC has been sent to your registered mobile number.
                      </p>
                      <div className="mt-2 px-3 py-2 bg-white border rounded-lg inline-block">
                        <p className="text-xs text-gray-500">Your TAC (for demo):</p>
                        <p className="font-mono font-bold text-lg tracking-widest" style={{ color: bank.portalColor }}>{tacGenerated}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment reminder */}
                <div className="rounded-lg p-3 mb-4 border text-xs" style={{ borderColor: bank.portalColor + "40", backgroundColor: bank.portalBg }}>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Merchant</span>
                    <span className="font-medium">AWC Trading Sdn Bhd</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-bold" style={{ color: bank.portalColor }}>RM {amount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Enter 6-digit TAC</label>
                    <input
                      ref={tacRef}
                      type="text"
                      maxLength={6}
                      value={tac}
                      onChange={e => { setTac(e.target.value.replace(/\D/g, "")); setTacError(""); }}
                      placeholder="_ _ _ _ _ _"
                      className="w-full border rounded px-3 py-3 text-xl font-mono text-center tracking-widest focus:outline-none"
                      style={{ borderColor: tacError ? "#e53e3e" : "#ccc", letterSpacing: "0.5em" }}
                      onKeyDown={e => e.key === "Enter" && handleTac()}
                    />
                  </div>

                  {tacError && (
                    <div className="flex items-center gap-1.5 text-red-600 text-xs">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      {tacError}
                    </div>
                  )}

                  <button
                    onClick={handleTac}
                    disabled={tac.length !== 6}
                    className="w-full py-2.5 rounded text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: bank.portalColor }}
                  >
                    Verify TAC
                  </button>

                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">TAC expires in: <span className="font-medium text-gray-600">04:59</span></span>
                    <button className="hover:underline" style={{ color: bank.portalColor }}>Resend TAC</button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end">
                  <button onClick={onCancel} className="text-xs text-red-500 hover:underline">Cancel Payment</button>
                </div>
              </div>
            )}

            {/* ── CONFIRM STEP ── */}
            {step === "confirm" && (
              <div className="max-w-sm mx-auto">
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={() => setStep("tac")} className="text-gray-400 hover:text-gray-600">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h2 className="font-bold" style={{ color: bank.portalColor, fontSize: "15px" }}>Confirm Payment</h2>
                    <p className="text-gray-500 text-xs">Please review before confirming</p>
                  </div>
                </div>

                <div className="rounded-xl border overflow-hidden mb-4">
                  <div className="px-4 py-2 text-xs font-semibold text-white" style={{ backgroundColor: bank.portalColor }}>
                    PAYMENT DETAILS
                  </div>
                  <div className="divide-y divide-gray-100">
                    {[
                      ["Date & Time",   `${now.toLocaleDateString("en-MY")} ${now.toLocaleTimeString("en-MY")}`],
                      ["Merchant",      "AWC Trading Sdn Bhd"],
                      ["Description",   "Monthly Subscription – April 2026"],
                      ["Reference No",  ref],
                      ["Bank",          bank.name],
                      ["Account",       "****-****-3821"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between px-4 py-2.5 text-xs">
                        <span className="text-gray-500">{label}</span>
                        <span className="font-medium text-gray-800 text-right max-w-[55%]">{value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between px-4 py-3 text-sm font-bold" style={{ backgroundColor: bank.portalBg }}>
                      <span style={{ color: bank.portalColor }}>TOTAL AMOUNT</span>
                      <span style={{ color: bank.portalColor }}>RM {amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4 text-xs text-yellow-800">
                  <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <span>Please confirm the payment details above are correct. This action cannot be undone once confirmed.</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={onCancel}
                    className="flex-1 py-2.5 rounded border font-semibold text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 py-2.5 rounded text-white font-semibold text-sm hover:opacity-90"
                    style={{ backgroundColor: bank.portalColor }}
                  >
                    Confirm Payment
                  </button>
                </div>
              </div>
            )}

            {/* ── PROCESSING ── */}
            {step === "processing" && (
              <div className="flex flex-col items-center justify-center py-10 gap-4">
                <div className="relative h-16 w-16">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                  <div
                    className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
                    style={{ borderColor: bank.portalColor, borderTopColor: "transparent" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-black text-xs" style={{ color: bank.portalColor }}>{bank.abbr}</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-700">Processing Payment...</p>
                  <p className="text-xs text-gray-500 mt-1">Please do not close or refresh this page</p>
                </div>
                <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-75"
                    style={{ width: `${progress}%`, backgroundColor: bank.portalColor }}
                  />
                </div>
                <p className="text-xs text-gray-400">Connecting to PayNet FPX Gateway...</p>
              </div>
            )}

            {/* ── SUCCESS ── */}
            {step === "success" && (
              <div className="max-w-sm mx-auto">
                <div className="text-center mb-4">
                  <div className="mx-auto h-14 w-14 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: bank.portalColor + "20" }}>
                    <CheckCircle2 className="h-8 w-8" style={{ color: bank.portalColor }} />
                  </div>
                  <h2 className="font-bold text-base text-gray-800">Payment Successful!</h2>
                  <p className="text-xs text-gray-500 mt-1">Your FPX payment has been processed</p>
                </div>

                <div className="rounded-xl border overflow-hidden mb-4">
                  <div className="px-4 py-2 text-xs font-semibold text-white" style={{ backgroundColor: bank.portalColor }}>
                    TRANSACTION RECEIPT
                  </div>
                  <div className="divide-y divide-gray-100">
                    {[
                      ["Transaction Status", "✅ Successful"],
                      ["Reference No",       ref],
                      ["Date & Time",        `${now.toLocaleDateString("en-MY")} ${now.toLocaleTimeString("en-MY")}`],
                      ["Merchant",           "AWC Trading Sdn Bhd"],
                      ["Bank",               bank.name],
                      ["Amount Paid",        `RM ${amount.toFixed(2)}`],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between px-4 py-2.5 text-xs">
                        <span className="text-gray-500">{label}</span>
                        <span className="font-medium text-gray-800">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleDone}
                  className="w-full py-2.5 rounded text-white font-semibold text-sm hover:opacity-90"
                  style={{ backgroundColor: bank.portalColor }}
                >
                  Return to AWC Trading
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-400">
            <span>© {bank.name} 2026</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Lock className="h-3 w-3" />SSL Secured</span>
              <span>PayNet FPX</span>
              <span>BNM Licensed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export function SubscriptionBilling() {
  const { t } = useLanguage();
  const b = t.billing;

  const [subscription, setSubscription] = useState<SubscriptionData>(MOCK_SUBSCRIPTION);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [fpxStep, setFpxStep] = useState<FpxStep>("select_bank");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("fpx");
  const [selectedBank, setSelectedBank] = useState<BankType | null>(null);
  const [completedRef, setCompletedRef] = useState("");

  const statusCfg = STATUS_CONFIG[subscription.status];
  const StatusIcon = statusCfg.icon;
  const statusLabel = b[statusCfg.labelKey as keyof typeof b] as string;

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });

  const formatShortDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });

  const getDaysRemaining = () => {
    const diff = new Date(subscription.currentPeriodEnd).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleOpenSetup = () => {
    setFpxStep("select_bank");
    setSelectedBank(null);
    setCompletedRef("");
    setSetupDialogOpen(true);
  };

  const handleFpxSuccess = (ref: string) => {
    setCompletedRef(ref);
    setFpxStep("success");
    // Update subscription data
    const newRecord: BillingRecord = {
      id: Date.now().toString(),
      date: new Date(),
      amount: subscription.amount,
      status: "paid",
      method: "FPX Auto-Debit",
      bank: selectedBank?.name || "",
      reference: ref,
    };
    setSubscription(prev => ({
      ...prev,
      mandateId: "CURLEC-MDT-" + Date.now().toString().slice(-10),
      paymentMethod: "fpx",
      bank: selectedBank?.name || prev.bank,
      billingHistory: [newRecord, ...prev.billingHistory],
    }));
  };

  const handleCloseSetup = () => {
    setSetupDialogOpen(false);
    setTimeout(() => {
      setFpxStep("select_bank");
      setSelectedBank(null);
    }, 300);
  };

  const proceedToBank = () => {
    if (selectedPaymentMethod === "fpx" && !selectedBank) return;
    setFpxStep("bank_portal");
  };

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Status Card ── */}
      <Card className={`border-2 ${statusCfg.bgColor}`}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
                subscription.status === "active" ? "bg-green-100" :
                subscription.status === "expired" ? "bg-red-100" : "bg-yellow-100"
              }`}>
                <StatusIcon className={`h-7 w-7 ${statusCfg.iconColor}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-base">{subscription.planName}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusCfg.color}`}>
                    {statusLabel}
                  </span>
                </div>
                <p className="text-2xl font-medium">
                  RM {subscription.amount}
                  <span className="text-sm text-muted-foreground font-normal">{b.perMonth}</span>
                </p>
                {subscription.status === "active" && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {getDaysRemaining()} {b.daysRemaining} {formatDate(subscription.nextBillingDate)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {subscription.status === "active" ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleOpenSetup}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    {b.changePayment}
                  </Button>
                  <button
                    onClick={() => setCancelDialogOpen(true)}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2"
                  >
                    {b.cancelSub}
                  </button>
                </>
              ) : (
                <Button onClick={handleOpenSetup}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  {b.subscribeNow}
                </Button>
              )}
            </div>
          </div>

          {subscription.status === "active" && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>{formatShortDate(subscription.currentPeriodStart)}</span>
                <span>{formatShortDate(subscription.currentPeriodEnd)}</span>
              </div>
              <div className="h-1.5 bg-green-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0,
                      ((Date.now() - new Date(subscription.currentPeriodStart).getTime()) /
                       (new Date(subscription.currentPeriodEnd).getTime() - new Date(subscription.currentPeriodStart).getTime())) * 100
                    ))}%`
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Current Mandate ── */}
      {subscription.mandateId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              {b.autoDebitMandate}
            </CardTitle>
            <CardDescription>{b.autoDebitDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                  {subscription.bank === "Maybank" ? "M2U" : subscription.bank?.substring(0, 3).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{subscription.bank}</p>
                  <p className="text-xs text-muted-foreground">{b.fpxAutoDebit}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{b.mandateId}</p>
                <p className="text-xs font-mono font-medium">{subscription.mandateId}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">{b.autoDebitInfo}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Features ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            {b.whatsIncluded}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-2">
            {b.features.map((feature, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Check className="h-2.5 w-2.5 text-primary" />
                </div>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Billing History ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            {b.billingHistory}
          </CardTitle>
          <CardDescription>{b.billingHistoryDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {subscription.billingHistory.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    record.status === "paid" ? "bg-green-100" :
                    record.status === "failed" ? "bg-red-100" : "bg-yellow-100"
                  }`}>
                    {record.status === "paid"
                      ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                      : record.status === "failed"
                      ? <XCircle className="h-4 w-4 text-red-600" />
                      : <Clock className="h-4 w-4 text-yellow-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{formatShortDate(record.date)}</p>
                    <p className="text-xs text-muted-foreground">{record.method} · {record.bank}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">RM {record.amount.toFixed(2)}</p>
                  <p className="text-xs font-mono text-muted-foreground">{record.reference}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-muted/40 rounded-lg flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">{b.paymentProcessedInfo}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
        <Lock className="h-3.5 w-3.5" />
        <span>{b.securedBy}</span>
        <span className="font-medium text-foreground">Curlec by Razorpay</span>
        <span>·</span>
        <span>{b.bnmLicensed}</span>
      </div>


      {/* ════════════════════════════════════════════════════
          MAIN PAYMENT DIALOG
      ════════════════════════════════════════════════════ */}
      <Dialog open={setupDialogOpen} onOpenChange={handleCloseSetup}>
        <DialogContent className={`${fpxStep === "bank_portal" ? "max-w-xl" : "max-w-md"} transition-all duration-300`}>

          {/* ── Select Bank Step ── */}
          {fpxStep === "select_bank" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  {b.setupFpx}
                </DialogTitle>
                <DialogDescription>{b.setupFpxDesc}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Plan summary */}
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">AWC Business Plan</p>
                    <p className="text-xs text-muted-foreground">{b.monthlyAutoDebit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-medium text-primary">RM 59</p>
                    <p className="text-xs text-muted-foreground">{b.perMonth}</p>
                  </div>
                </div>

                {/* Bank grid */}
                <div>
                  <Label className="text-sm mb-2 block">{b.selectBank}</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {FPX_BANKS.map((bank) => (
                      <button
                        key={bank.code}
                        onClick={() => setSelectedBank(bank)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all ${
                          selectedBank?.code === bank.code
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/40 hover:bg-muted/40"
                        }`}
                      >
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                          style={{ backgroundColor: bank.color, fontSize: "9px", fontWeight: "900" }}
                        >
                          {bank.abbr}
                        </div>
                        <span className="text-xs font-medium leading-tight">{bank.name}</span>
                        {selectedBank?.code === bank.code && (
                          <Check className="h-3.5 w-3.5 text-primary ml-auto flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* FPX badge */}
                <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="h-6 w-6 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-black" style={{ fontSize: "7px" }}>FPX</span>
                  </div>
                  <p className="text-xs text-blue-700">
                    {b.fpxRedirectInfo}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseSetup}>{t.common.cancel}</Button>
                <Button onClick={proceedToBank} disabled={!selectedBank}>
                  {b.proceedTo} {selectedBank?.name || "Bank"}
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── Bank Portal Step ── */}
          {fpxStep === "bank_portal" && selectedBank && (
            <>
              <DialogHeader className="pb-2">
                <DialogTitle className="text-sm flex items-center gap-2">
                  <div
                    className="h-5 w-5 rounded flex items-center justify-center text-white font-black"
                    style={{ backgroundColor: selectedBank.color, fontSize: "7px" }}
                  >
                    {selectedBank.abbr}
                  </div>
                  {selectedBank.name} Online Banking
                </DialogTitle>
              </DialogHeader>
              <div className="py-1">
                <BankPortalSimulator
                  bank={selectedBank}
                  amount={subscription.amount}
                  onSuccess={handleFpxSuccess}
                  onCancel={handleCloseSetup}
                />
              </div>
            </>
          )}

          {/* ── Final Success Step (back in our app) ── */}
          {fpxStep === "success" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  {b.paymentSuccess}
                </DialogTitle>
                <DialogDescription>{b.paymentSuccessDesc}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2.5">
                  {[
                    [b.plan,        "AWC Business Plan"],
                    [b.bank,        selectedBank?.name || ""],
                    [b.amountPaid,  `RM ${subscription.amount}.00`],
                    [b.referenceNo, completedRef],
                    [b.nextBilling, "1 May 2026"],
                    [b.mandateId,   subscription.mandateId || ""],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium font-mono">{val}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">{b.receiptSent}</p>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseSetup} className="w-full">
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  {b.done}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>


      {/* ── Cancel Dialog ── */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              {b.cancelSubTitle}
            </DialogTitle>
            <DialogDescription>{b.cancelSubDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <p className="text-sm font-medium text-red-700">{b.willLoseAccess}</p>
              <ul className="space-y-1">
                {b.features.slice(0, 5).map((f, i) => (
                  <li key={i} className="text-xs text-red-600 flex items-center gap-1.5">
                    <XCircle className="h-3 w-3 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              {b.accessRemainsUntil} <strong>{formatDate(subscription.currentPeriodEnd)}</strong>. {b.mandateCancelled}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>{b.keepSub}</Button>
            <Button variant="destructive" onClick={() => setCancelDialogOpen(false)}>{b.yesCancel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
