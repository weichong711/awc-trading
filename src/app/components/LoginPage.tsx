import { useState } from "react";
import { supabase, SERVER, publicAnonKey } from "../../lib/supabase";
import {
  Eye, EyeOff, ShoppingCart, Lock, Mail, User, Building2,
  CheckCircle2, AlertCircle, Loader2, ArrowRight, Shield,
  BarChart3, Receipt, Package, Zap, KeyRound,
} from "lucide-react";

const FEATURES = [
  { icon: ShoppingCart, label: "POS Order Management",      color: "text-blue-400" },
  { icon: Receipt,      label: "Receipt & Printing",        color: "text-green-400" },
  { icon: BarChart3,    label: "Profit Analytics",          color: "text-purple-400" },
  { icon: Package,      label: "Product Management",        color: "text-orange-400" },
  { icon: Shield,       label: "Secure Cloud Data",         color: "text-teal-400" },
  { icon: Zap,          label: "Real-time Dashboard",       color: "text-yellow-400" },
];

export function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Form fields
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [confirmPass, setConfirmPass]   = useState("");
  const [username, setUsername]         = useState("");
  const [businessName, setBusinessName] = useState("");

  const clearMessages = () => { setError(""); setSuccess(""); };

  // ── SIGN IN ──────────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(`Login failed: ${authError.message}`);
        return;
      }
      if (data.session) {
        onLogin({
          accessToken: data.session.access_token,
          user: { id: data.user!.id, email: data.user!.email! },
        });
      }
    } catch (err) {
      setError(`Unexpected error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // ── SIGN UP ──────────────────────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email || !password || !username || !businessName) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPass) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ email, password, username, businessName }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || "Signup failed. Please try again.");
        return;
      }

      // Auto sign in after successful signup
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setSuccess("Account created! Please sign in.");
        setMode("signin");
        return;
      }
      if (data.session) {
        onLogin({
          accessToken: data.session.access_token,
          user: { id: data.user!.id, email: data.user!.email! },
        });
      }
    } catch (err) {
      setError(`Server error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // ── FORGOT PASSWORD ──────────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email) { setError("Please enter your email address."); return; }
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      });
      if (resetError) {
        setError(`Failed to send reset email: ${resetError.message}`);
      } else {
        setSuccess("Password reset email sent! Check your inbox and follow the link to set a new password.");
      }
    } catch (err) {
      setError(`Unexpected error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL — Branding ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex-col justify-between p-12 relative overflow-hidden">

        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute top-1/2 -right-24 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
            <ShoppingCart className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">AWC TRADING</h1>
            <p className="text-slate-400 text-sm">Business Management System</p>
          </div>
        </div>

        {/* Main tagline */}
        <div className="relative">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Manage Your Business<br />
            <span className="text-primary">Smarter & Faster</span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed mb-8">
            A complete POS system for Malaysian businesses. Track orders, expenses,
            profits — all in one place. Your data is securely stored in the cloud.
          </p>

          {/* Feature list */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <span className="text-slate-300 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom info */}
        <div className="relative">
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Powered by Supabase Cloud</p>
              <p className="text-slate-400 text-xs">Your data is encrypted & backed up daily</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs font-medium">Live</span>
            </div>
          </div>
          <p className="text-slate-600 text-xs mt-4 text-center">
            Cancel anytime · No contract
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Form ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold">AWC TRADING</h1>
              <p className="text-xs text-muted-foreground">Business Management System</p>
            </div>
          </div>

          {/* Tab switcher */}
          {mode !== "forgot" && (
          <div className="flex bg-muted rounded-xl p-1 mb-8">
            <button
              onClick={() => { setMode("signin"); clearMessages(); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === "signin"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode("signup"); clearMessages(); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === "signup"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create Account
            </button>
          </div>
          )}

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              {mode === "signin" ? "Welcome back 👋" : mode === "forgot" ? "Reset password 🔑" : "Create your account 🚀"}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {mode === "signin"
                ? "Sign in to access your business dashboard"
                : mode === "forgot"
                ? "Enter your email and we'll send you a reset link"
                : "Create your account — no credit card required"}
            </p>
          </div>

          {/* Error / Success messages */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl mb-5 text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2.5 p-3.5 bg-green-50 border border-green-200 rounded-xl mb-5 text-green-700">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{success}</p>
            </div>
          )}

          {/* ── SIGN IN FORM ── */}
          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearMessages(); }}
                    placeholder="you@example.com"
                    className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearMessages(); }}
                    placeholder="Your password"
                    className="w-full border rounded-xl pl-10 pr-11 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    required
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Signing in...</>
                ) : (
                  <>Sign In <ArrowRight className="h-4 w-4" /></>
                )}
              </button>

              <div className="text-center space-y-1">
                <button type="button" onClick={() => { setMode("forgot"); clearMessages(); }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Forgot your password?
                </button>
                <p className="text-xs text-muted-foreground">
                  Don't have an account?{" "}
                  <button type="button" onClick={() => { setMode("signup"); clearMessages(); }}
                    className="text-primary font-medium hover:underline">
                    Create one free
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ── FORGOT PASSWORD FORM ── */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearMessages(); }}
                    placeholder="you@example.com"
                    className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Sending...</>
                ) : (
                  <><KeyRound className="h-4 w-4" />Send Reset Link</>
                )}
              </button>

              <div className="text-center">
                <button type="button" onClick={() => { setMode("signin"); clearMessages(); }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  ← Back to sign in
                </button>
              </div>
            </form>
          )}

          {/* ── SIGN UP FORM ── */}
          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1.5">Username</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={username}
                      onChange={e => { setUsername(e.target.value); clearMessages(); }}
                      placeholder="john_doe"
                      className="w-full border rounded-xl pl-10 pr-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Business Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={businessName}
                      onChange={e => { setBusinessName(e.target.value); clearMessages(); }}
                      placeholder="My Cafe"
                      className="w-full border rounded-xl pl-10 pr-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearMessages(); }}
                    placeholder="you@example.com"
                    className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearMessages(); }}
                    placeholder="Min. 6 characters"
                    className="w-full border rounded-xl pl-10 pr-11 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    required
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPass}
                    onChange={e => { setConfirmPass(e.target.value); clearMessages(); }}
                    placeholder="Re-enter password"
                    className={`w-full border rounded-xl pl-10 pr-11 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 transition-all ${
                      confirmPass && confirmPass !== password
                        ? "border-red-400 focus:ring-red-200"
                        : "focus:ring-primary/30 focus:border-primary"
                    }`}
                    required
                  />
                  <button type="button" onClick={() => setShowConfirmPass(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPass && confirmPass !== password && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              {/* Pricing info */}
            
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Creating account...</>
                ) : (
                  <>Create Account <ArrowRight className="h-4 w-4" /></>
                )}
              </button>

              <p className="text-xs text-muted-foreground text-center">
                Already have an account?{" "}
                <button type="button" onClick={() => { setMode("signin"); clearMessages(); }}
                  className="text-primary font-medium hover:underline">
                  Sign in here
                </button>
              </p>
            </form>
          )}

          <div className="mt-8 pt-6 border-t flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>256-bit SSL · Supabase Cloud · BNM-aligned</span>
          </div>
        </div>
      </div>
    </div>
  );
}
