import { useState } from "react";
import {
  Lock, ShoppingCart, AlertTriangle, CreditCard, LogOut,
  CheckCircle2, Clock, Eye, EyeOff, ArrowRight, Shield,
  ChevronLeft, Loader2, AlertCircle, Phone, Mail,
} from "lucide-react";

// ── FPX Banks (same as SubscriptionBilling) ──────────────────────────────────
const FPX_BANKS = [
  { code: "MBB0227",  name: "Maybank",          abbr: "M2U",  color: "#F5A623", portalColor: "#f5a623", portalBg: "#fffbf0" },
  { code: "CIMB0219", name: "CIMB Clicks",       abbr: "CIMB", color: "#CC0001", portalColor: "#CC0001", portalBg: "#fff5f5" },
  { code: "RHB0218",  name: "RHB Bank",          abbr: "RHB",  color: "#003D7C", portalColor: "#003D7C", portalBg: "#f0f4ff" },
  { code: "HLB0224",  name: "Hong Leong Bank",   abbr: "HLB",  color: "#004A97", portalColor: "#004A97", portalBg: "#f0f5ff" },
  { code: "PBB0233",  name: "Public Bank",       abbr: "PBB",  color: "#003087", portalColor: "#003087", portalBg: "#f0f4ff" },
  { code: "AMB0208",  name: "AmBank",            abbr: "AMB",  color: "#FF6600", portalColor: "#FF6600", portalBg: "#fff8f0" },
  { code: "BIMB0340", name: "Bank Islam",        abbr: "BIMB", color: "#009933", portalColor: "#009933", portalBg: "#f0fff4" },
  { code: "BSN0601",  name: "BSN",               abbr: "BSN",  color: "#E30613", portalColor: "#E30613", portalBg: "#fff5f5" },
];

type BankType = typeof FPX_BANKS[0];

function generateTac() { return Math.floor(100000 + Math.random() * 900000).toString(); }
function generateRef()  { return "FPX" + Date.now().toString().slice(-10).toUpperCase(); }

// ── Mini bank portal (same feel as SubscriptionBilling) ──────────────────────
function MiniBank({ bank, amount, onSuccess, onBack }: {
  bank: BankType; amount: number;
  onSuccess: (ref: string) => void; onBack: () => void;
}) {
  const [step, setStep] = useState<"login" | "tac" | "processing" | "done">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [tac, setTac]           = useState("");
  const [tacCode]  = useState(generateTac());
  const [ref]      = useState(generateRef());
  const [loginErr, setLoginErr] = useState("");
  const [tacErr, setTacErr]     = useState("");
  const [progress, setProgress] = useState(0);

  const handleLogin = () => {
    if (!username || !password) { setLoginErr("Please enter username and password."); return; }
    setLoginErr(""); setStep("tac");
  };

  const handleTac = () => {
    if (tac !== tacCode) { setTacErr("Invalid TAC. Please try again."); return; }
    setTacErr(""); setStep("processing");
    let p = 0;
    const iv = setInterval(() => {
      p += 5; setProgress(p);
      if (p >= 100) { clearInterval(iv); setTimeout(() => { setStep("done"); }, 300); }
    }, 80);
  };

  return (
    <div className="w-full">
      {/* Fake browser */}
      <div className="rounded-xl overflow-hidden border border-gray-300 shadow-lg">
        {/* Browser chrome */}
        <div className="bg-gray-200 px-3 py-1.5 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-2 bg-white rounded px-2 py-0.5 flex items-center gap-1.5 text-xs text-gray-500 border">
            <Lock className="h-2.5 w-2.5 text-green-600 flex-shrink-0" />
            <span className="truncate">www.{bank.name.toLowerCase().replace(/\s+/g,"")}.com.my/fpx</span>
          </div>
        </div>

        {/* Bank header */}
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: bank.portalColor }}>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-white rounded flex items-center justify-center">
              <span className="font-black" style={{ color: bank.portalColor, fontSize: "8px" }}>{bank.abbr}</span>
            </div>
            <span className="text-white font-bold text-sm">{bank.name}</span>
          </div>
          <div className="flex items-center gap-1 text-white/80 text-xs">
            <Lock className="h-3 w-3" /><span>FPX Secure</span>
          </div>
        </div>

        <div className="bg-white p-4" style={{ backgroundColor: bank.portalBg }}>
          {/* Payment summary always shown */}
          <div className="rounded-lg border p-2.5 mb-3 text-xs" style={{ borderColor: bank.portalColor + "40", backgroundColor: "white" }}>
            <div className="flex justify-between mb-1"><span className="text-gray-500">Merchant</span><span className="font-medium">AWC Trading Sdn Bhd</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-bold" style={{ color: bank.portalColor }}>RM {amount.toFixed(2)}</span></div>
          </div>

          {step === "login" && (
            <div className="space-y-2.5">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Username / User ID</label>
                <input type="text" value={username} onChange={e => { setUsername(e.target.value); setLoginErr(""); }}
                  placeholder="Enter username" className="w-full border rounded px-3 py-2 text-sm focus:outline-none" style={{ borderColor: loginErr ? "#e53e3e" : "#ccc" }} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Password</label>
                <div className="relative">
                  <input type={showPass ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); setLoginErr(""); }}
                    placeholder="Enter password" className="w-full border rounded px-3 py-2 text-sm pr-9 focus:outline-none" style={{ borderColor: loginErr ? "#e53e3e" : "#ccc" }} />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              {loginErr && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{loginErr}</p>}
              <button onClick={handleLogin} className="w-full py-2 rounded text-white text-sm font-semibold hover:opacity-90" style={{ backgroundColor: bank.portalColor }}>
                Login & Pay
              </button>
              <div className="flex justify-end"><button onClick={onBack} className="text-xs text-red-500 hover:underline">Cancel</button></div>
            </div>
          )}

          {step === "tac" && (
            <div className="space-y-2.5">
              <div className="p-3 bg-gray-50 rounded-lg border text-xs">
                <p className="text-gray-600 mb-1">TAC sent to: <strong>+60**-***-3821</strong></p>
                <p className="text-gray-500">Demo TAC: <span className="font-mono font-bold text-base tracking-widest" style={{ color: bank.portalColor }}>{tacCode}</span></p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Enter 6-digit TAC</label>
                <input type="text" maxLength={6} value={tac} onChange={e => { setTac(e.target.value.replace(/\D/g,"")); setTacErr(""); }}
                  placeholder="_ _ _ _ _ _" className="w-full border rounded px-3 py-2 text-lg font-mono text-center tracking-widest focus:outline-none" style={{ borderColor: tacErr ? "#e53e3e" : "#ccc" }} />
              </div>
              {tacErr && <p className="text-xs text-red-600">{tacErr}</p>}
              <button onClick={handleTac} disabled={tac.length !== 6} className="w-full py-2 rounded text-white text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: bank.portalColor }}>
                Verify TAC
              </button>
              <div className="flex justify-between text-xs">
                <button onClick={() => setStep("login")} className="text-gray-500 hover:underline flex items-center gap-1"><ChevronLeft className="h-3 w-3" />Back</button>
                <button onClick={onBack} className="text-red-500 hover:underline">Cancel</button>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="relative h-12 w-12">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                <div className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: bank.portalColor, borderTopColor: "transparent" }} />
              </div>
              <p className="text-sm font-medium text-gray-700">Processing payment...</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-75" style={{ width: `${progress}%`, backgroundColor: bank.portalColor }} />
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-3 space-y-3">
              <CheckCircle2 className="h-10 w-10 mx-auto" style={{ color: bank.portalColor }} />
              <p className="font-semibold text-gray-800">Payment Successful!</p>
              <p className="text-xs text-gray-500">Ref: <span className="font-mono">{ref}</span></p>
              <button onClick={() => onSuccess(ref)} className="w-full py-2 rounded text-white text-sm font-semibold" style={{ backgroundColor: bank.portalColor }}>
                Return to AWC Trading
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION WALL — full-screen blocker
// ════════════════════════════════════════════════════════════════════════════
interface SubscriptionWallProps {
  userEmail: string;
  businessName: string;
  daysOverdue: number;         // how many days past grace period
  onPaymentSuccess: (ref: string, bank: string) => void;
  onLogout: () => void;
}

export function SubscriptionWall({ userEmail, businessName, daysOverdue, onPaymentSuccess, onLogout }: SubscriptionWallProps) {
  const [screen, setScreen] = useState<"wall" | "select_bank" | "bank_portal">("wall");
  const [selectedBank, setSelectedBank] = useState<BankType | null>(null);

  const handleSuccess = (ref: string) => {
    onPaymentSuccess(ref, selectedBank?.name || "");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950/30 to-slate-900 flex flex-col items-center justify-center p-4">

      {/* ── WALL SCREEN ── */}
      {screen === "wall" && (
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <ShoppingCart className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="text-white">
              <h1 className="font-bold text-lg">AWC TRADING</h1>
              <p className="text-white/60 text-xs">Business Management System</p>
            </div>
          </div>

          {/* Lock icon + warning */}
          <div className="text-center mb-6">
            <div className="mx-auto h-20 w-20 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center mb-4">
              <Lock className="h-10 w-10 text-red-400" />
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">Account Suspended</h2>
            <p className="text-white/70 text-sm">
              Your subscription has expired
              {daysOverdue > 0 ? ` ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} ago` : ""}.
              Renew now to restore full access.
            </p>
          </div>

          {/* Info card */}
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-5 mb-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Account</span>
              <span className="text-white font-medium">{userEmail}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Business</span>
              <span className="text-white font-medium">{businessName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Status</span>
              <span className="text-red-400 font-semibold">⛔ Suspended</span>
            </div>
            <div className="border-t border-white/10 pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Renewal Amount</span>
                <span className="text-white font-bold text-lg">RM 59.00 / month</span>
              </div>
            </div>
          </div>

          {/* Your data is safe note */}
          <div className="flex items-start gap-2.5 p-3.5 bg-blue-500/20 border border-blue-400/30 rounded-xl mb-5">
            <Shield className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-300 text-xs">
              <strong>Your data is safe.</strong> All your products, orders, and sales history are securely stored and will be fully restored the moment you renew.
            </p>
          </div>

          {/* Pay button */}
          <button
            onClick={() => setScreen("select_bank")}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-base hover:bg-primary/90 transition-all flex items-center justify-center gap-2 mb-3 shadow-lg"
          >
            <CreditCard className="h-5 w-5" />
            Renew via FPX Online Banking
            <ArrowRight className="h-5 w-5" />
          </button>

          {/* Contact + logout */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-4 text-xs text-white/50">
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" />+60 11-1234 5678</span>
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" />support@awctrading.com</span>
            </div>
            <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
              <LogOut className="h-3.5 w-3.5" />
              Sign out & use a different account
            </button>
          </div>
        </div>
      )}

      {/* ── SELECT BANK SCREEN ── */}
      {screen === "select_bank" && (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-primary px-5 py-4 flex items-center gap-3">
            <button onClick={() => setScreen("wall")} className="text-white/70 hover:text-white">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-white font-bold">FPX Online Banking</h2>
              <p className="text-white/70 text-xs">Select your bank to pay RM59.00</p>
            </div>
          </div>

          <div className="p-5">
            {/* Summary */}
            <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl flex justify-between items-center mb-5">
              <div>
                <p className="font-medium text-sm">AWC Business Plan</p>
                <p className="text-xs text-muted-foreground">1 month subscription renewal</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-primary">RM 59</p>
                <p className="text-xs text-muted-foreground">/month</p>
              </div>
            </div>

            <p className="text-sm font-medium mb-3">Select Your Bank</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {FPX_BANKS.map(bank => (
                <button key={bank.code} onClick={() => setSelectedBank(bank)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all ${
                    selectedBank?.code === bank.code ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}>
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 font-black"
                    style={{ backgroundColor: bank.color, fontSize: "8px" }}>{bank.abbr}</div>
                  <span className="text-xs font-medium leading-tight">{bank.name}</span>
                  {selectedBank?.code === bank.code && <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto" />}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setScreen("wall")} className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted">
                Back
              </button>
              <button onClick={() => selectedBank && setScreen("bank_portal")} disabled={!selectedBank}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 hover:bg-primary/90">
                Proceed →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BANK PORTAL SCREEN ── */}
      {screen === "bank_portal" && selectedBank && (
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setScreen("select_bank")} className="text-white/60 hover:text-white flex items-center gap-1 text-sm">
              <ChevronLeft className="h-4 w-4" /> Back to bank selection
            </button>
          </div>
          <MiniBank bank={selectedBank} amount={59} onSuccess={handleSuccess} onBack={() => setScreen("select_bank")} />
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// GRACE PERIOD BANNER — shown inside app when trial/sub is about to expire
// ════════════════════════════════════════════════════════════════════════════
interface GraceBannerProps {
  status: "trial" | "active" | "grace_period";
  daysLeft: number;       // days until expiry (trial/active) OR days left in grace (grace_period)
  onRenewClick: () => void;
}

export function GraceBanner({ status, daysLeft, onRenewClick }: GraceBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  // Only show banner when close to expiry or in grace
  if (status === "active" && daysLeft > 7) return null;
  if (status === "trial"  && daysLeft > 7) return null;

  const isGrace  = status === "grace_period";
  const isCritical = daysLeft <= 2;

  const bgColor    = isGrace   ? "bg-red-600"    : isCritical ? "bg-orange-500"    : "bg-yellow-500";
  const borderColor = isGrace  ? "border-red-700" : isCritical ? "border-orange-600" : "border-yellow-600";
  const icon       = isGrace   ? <Lock className="h-4 w-4 flex-shrink-0" />
                   : isCritical ? <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                   :             <Clock className="h-4 w-4 flex-shrink-0" />;

  const message = isGrace
    ? `⛔ Your subscription has expired! ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left before your account is locked.`
    : status === "trial"
    ? `🎁 Free trial ending in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Subscribe to keep your data & access.`
    : `⚠️ Subscription expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Renew to avoid interruption.`;

  return (
    <div className={`${bgColor} border-b ${borderColor} text-white px-4 py-2.5 flex items-center justify-between gap-3`}>
      <div className="flex items-center gap-2 text-sm font-medium flex-1 min-w-0">
        {icon}
        <span className="truncate">{message}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={onRenewClick}
          className="bg-white text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-white/90 transition-colors whitespace-nowrap flex items-center gap-1">
          <CreditCard className="h-3.5 w-3.5" />
          {isGrace ? "Renew Now" : "Subscribe"}
        </button>
        {!isGrace && (
          <button onClick={() => setDismissed(true)} className="text-white/70 hover:text-white text-xs px-1">✕</button>
        )}
      </div>
    </div>
  );
}
