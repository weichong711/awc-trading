import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import {
  Users, Shield, Ban, CheckCircle2, Clock, RefreshCw,
  AlertTriangle, Search, ChevronDown, X, Lock, Unlock,
  Calendar, Mail, Building2, Loader2, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "./ui/dialog";

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-51f3fb75`;

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdminUser {
  id: string;
  email: string;
  createdAt: string;
  lastSignIn: string | null;
  username: string;
  businessName: string;
  manualBlock: boolean;
  subscription: {
    plan: string;
    expiresAt: string;
    gracePeriodEndsAt: string;
    lastPaymentDate: string | null;
    manualBlockReason?: string;
    paymentHistory?: { ref: string; bank: string; amount: number; paidAt: string }[];
  } | null;
  access: {
    status: "trial" | "active" | "grace_period" | "blocked";
    daysLeft: number;
    graceDaysLeft: number;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDatetime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-MY", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function timeAgo(iso: string | null | undefined) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (d > 0)  return `${d}d ago`;
  if (h > 0)  return `${h}h ago`;
  if (m > 0)  return `${m}m ago`;
  return "just now";
}

const STATUS_CFG = {
  trial:        { label: "Trial",        bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-200",   icon: Clock },
  active:       { label: "Active",       bg: "bg-green-100",  text: "text-green-700",  border: "border-green-200",  icon: CheckCircle2 },
  grace_period: { label: "Grace Period", bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", icon: AlertTriangle },
  blocked:      { label: "Blocked",      bg: "bg-red-100",    text: "text-red-700",    border: "border-red-200",    icon: Ban },
};

// ════════════════════════════════════════════════════════════════════════════
// ADMIN PANEL COMPONENT
// ════════════════════════════════════════════════════════════════════════════
interface AdminPanelProps {
  accessToken: string;
}

export function AdminPanel({ accessToken }: AdminPanelProps) {
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilter]   = useState<string>("all");
  const [actionUser, setActionUser] = useState<AdminUser | null>(null);
  const [actionType, setActionType] = useState<"block" | "unblock" | "detail" | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [grantDays, setGrantDays]   = useState("30");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg]   = useState("");

  const fetchUsers = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${SERVER}/admin/users`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load users");
      setUsers(data.users);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total:   users.length,
    trial:   users.filter(u => u.access.status === "trial").length,
    active:  users.filter(u => u.access.status === "active").length,
    grace:   users.filter(u => u.access.status === "grace_period").length,
    blocked: users.filter(u => u.access.status === "blocked").length,
  };

  // ── Filter + search ───────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.businessName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || u.access.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── Block action ──────────────────────────────────────────────────────────
  const handleBlock = async () => {
    if (!actionUser) return;
    setActionLoading(true); setActionMsg("");
    try {
      const res = await fetch(`${SERVER}/admin/users/${actionUser.id}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ reason: blockReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMsg("✅ User blocked successfully.");
      await fetchUsers();
      setTimeout(() => { setActionUser(null); setActionType(null); setBlockReason(""); setActionMsg(""); }, 1200);
    } catch (err: any) {
      setActionMsg("❌ " + (err.message || "Failed to block user"));
    }
    setActionLoading(false);
  };

  // ── Unblock action ────────────────────────────────────────────────────────
  const handleUnblock = async () => {
    if (!actionUser) return;
    setActionLoading(true); setActionMsg("");
    try {
      const res = await fetch(`${SERVER}/admin/users/${actionUser.id}/unblock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ days: Number(grantDays) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMsg(`✅ ${data.message}`);
      await fetchUsers();
      setTimeout(() => { setActionUser(null); setActionType(null); setGrantDays("30"); setActionMsg(""); }, 1200);
    } catch (err: any) {
      setActionMsg("❌ " + (err.message || "Failed to unblock user"));
    }
    setActionLoading(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-red-600 rounded-xl flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Admin Panel</h2>
            <p className="text-xs text-muted-foreground">Manage all registered users & subscriptions</p>
          </div>
        </div>
        <Button onClick={fetchUsers} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Users", value: stats.total,   color: "bg-slate-100 text-slate-700" },
          { label: "Trial",       value: stats.trial,   color: "bg-blue-100 text-blue-700" },
          { label: "Active",      value: stats.active,  color: "bg-green-100 text-green-700" },
          { label: "Grace Period",value: stats.grace,   color: "bg-orange-100 text-orange-700" },
          { label: "Blocked",     value: stats.blocked, color: "bg-red-100 text-red-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl p-3 text-center ${color}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by email, business name, username..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "trial", "active", "grace_period", "blocked"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filterStatus === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"
              }`}>
              {s === "all" ? "All" : s === "grace_period" ? "Grace" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Users table */}
      {!loading && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Users ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                No users found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Business</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Expires</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Last Login</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((user, i) => {
                      const cfg = STATUS_CFG[user.access.status];
                      const StatusIcon = cfg.icon;
                      const isBlocked = user.access.status === "blocked";
                      return (
                        <tr key={user.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isBlocked ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"}`}>
                                {user.email.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-xs leading-tight truncate max-w-[140px]">{user.email}</p>
                                <p className="text-xs text-muted-foreground">{user.username || "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <p className="text-xs">{user.businessName || "—"}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                              <StatusIcon className="h-3 w-3" />
                              {cfg.label}
                              {user.access.status === "trial"  && user.access.daysLeft > 0  && <span className="opacity-60">·{user.access.daysLeft}d</span>}
                              {user.access.status === "active" && user.access.daysLeft > 0  && <span className="opacity-60">·{user.access.daysLeft}d</span>}
                              {user.access.status === "grace_period"                        && <span className="opacity-60">·{user.access.graceDaysLeft}d</span>}
                            </span>
                            {user.manualBlock && (
                              <p className="text-xs text-red-500 mt-0.5 flex items-center gap-0.5">
                                <Lock className="h-2.5 w-2.5" />Manual
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-xs text-muted-foreground">{fmtDate(user.subscription?.expiresAt)}</p>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <p className="text-xs text-muted-foreground">{timeAgo(user.lastSignIn)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Detail button */}
                              <button onClick={() => { setActionUser(user); setActionType("detail"); }}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="View details">
                                <Info className="h-4 w-4" />
                              </button>
                              {/* Block / Unblock */}
                              {isBlocked ? (
                                <button onClick={() => { setActionUser(user); setActionType("unblock"); setGrantDays("30"); setActionMsg(""); }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-100 text-green-700 border border-green-200 text-xs font-medium hover:bg-green-200 transition-colors">
                                  <Unlock className="h-3.5 w-3.5" />Unblock
                                </button>
                              ) : (
                                <button onClick={() => { setActionUser(user); setActionType("block"); setBlockReason(""); setActionMsg(""); }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-medium hover:bg-red-100 transition-colors">
                                  <Ban className="h-3.5 w-3.5" />Block
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── BLOCK DIALOG ── */}
      <Dialog open={actionType === "block"} onOpenChange={v => !v && setActionType(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="h-5 w-5" />Block User Access
            </DialogTitle>
            <DialogDescription>
              This will immediately lock the user out. They will see a "Subscription Suspended" screen.
            </DialogDescription>
          </DialogHeader>
          {actionUser && (
            <div className="space-y-4">
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl">
                <p className="font-medium text-sm">{actionUser.email}</p>
                <p className="text-xs text-muted-foreground">{actionUser.businessName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Current status: <span className="font-medium capitalize">{actionUser.access.status.replace("_", " ")}</span>
                </p>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5">Reason (shown in logs)</label>
                <Input
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  placeholder="e.g. Non-payment, Policy violation..."
                />
              </div>
              {actionMsg && <p className="text-sm text-center font-medium">{actionMsg}</p>}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setActionType(null)} className="flex-1" disabled={actionLoading}>Cancel</Button>
                <Button variant="destructive" onClick={handleBlock} className="flex-1" disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Ban className="h-4 w-4 mr-1.5" />Block Now</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── UNBLOCK DIALOG ── */}
      <Dialog open={actionType === "unblock"} onOpenChange={v => !v && setActionType(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Unlock className="h-5 w-5" />Restore User Access
            </DialogTitle>
            <DialogDescription>
              This will unlock the user and grant them a new active period.
            </DialogDescription>
          </DialogHeader>
          {actionUser && (
            <div className="space-y-4">
              <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl">
                <p className="font-medium text-sm">{actionUser.email}</p>
                <p className="text-xs text-muted-foreground">{actionUser.businessName}</p>
                {actionUser.subscription?.manualBlockReason && (
                  <p className="text-xs text-red-600 mt-1">Blocked reason: {actionUser.subscription.manualBlockReason}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5">Grant access for (days)</label>
                <div className="flex gap-2">
                  {["7", "14", "30", "60", "90"].map(d => (
                    <button key={d} onClick={() => setGrantDays(d)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        grantDays === d ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"
                      }`}>{d}d</button>
                  ))}
                </div>
              </div>
              {actionMsg && <p className="text-sm text-center font-medium">{actionMsg}</p>}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setActionType(null)} className="flex-1" disabled={actionLoading}>Cancel</Button>
                <Button onClick={handleUnblock} className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Unlock className="h-4 w-4 mr-1.5" />Restore Access</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DETAIL DIALOG ── */}
      <Dialog open={actionType === "detail"} onOpenChange={v => !v && setActionType(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />User Details
            </DialogTitle>
          </DialogHeader>
          {actionUser && (() => {
            const cfg = STATUS_CFG[actionUser.access.status];
            const StatusIcon = cfg.icon;
            return (
              <div className="space-y-4 text-sm">
                {/* Status badge */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border">
                  <div>
                    <p className="font-semibold">{actionUser.email}</p>
                    <p className="text-xs text-muted-foreground">{actionUser.businessName}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                    <StatusIcon className="h-3.5 w-3.5" />{cfg.label}
                  </span>
                </div>

                {/* Details grid */}
                {[
                  { label: "User ID",      value: actionUser.id.slice(0, 16) + "..." },
                  { label: "Username",     value: actionUser.username || "—" },
                  { label: "Registered",   value: fmtDatetime(actionUser.createdAt) },
                  { label: "Last Login",   value: fmtDatetime(actionUser.lastSignIn) },
                  { label: "Plan",         value: (actionUser.subscription?.plan || "—").toUpperCase() },
                  { label: "Expires",      value: fmtDate(actionUser.subscription?.expiresAt) },
                  { label: "Grace End",    value: fmtDate(actionUser.subscription?.gracePeriodEndsAt) },
                  { label: "Last Payment", value: fmtDate(actionUser.subscription?.lastPaymentDate) },
                  { label: "Manual Block", value: actionUser.manualBlock ? "YES" : "No" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-1 border-b border-dashed last:border-0">
                    <span className="text-muted-foreground text-xs">{label}</span>
                    <span className={`font-medium text-xs ${label === "Manual Block" && value === "YES" ? "text-red-600" : ""}`}>{value}</span>
                  </div>
                ))}

                {/* Block reason */}
                {actionUser.subscription?.manualBlockReason && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-xs text-red-700">
                    <p className="font-medium mb-0.5">Block reason:</p>
                    <p>{actionUser.subscription.manualBlockReason}</p>
                  </div>
                )}

                {/* Payment history */}
                {actionUser.subscription?.paymentHistory && actionUser.subscription.paymentHistory.length > 0 && (
                  <div>
                    <p className="font-medium text-xs mb-2">Payment History</p>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {actionUser.subscription.paymentHistory.map((p, i) => (
                        <div key={i} className="flex justify-between text-xs p-2 bg-muted/40 rounded-lg">
                          <span className="text-muted-foreground">{fmtDate(p.paidAt)}</span>
                          <span className="font-mono text-muted-foreground">{p.ref}</span>
                          <span className="font-semibold text-green-700">RM{p.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick actions */}
                <div className="flex gap-2 pt-1">
                  {actionUser.access.status === "blocked" ? (
                    <Button onClick={() => setActionType("unblock")} className="flex-1 bg-green-600 hover:bg-green-700 text-white" size="sm">
                      <Unlock className="h-4 w-4 mr-1.5" />Restore Access
                    </Button>
                  ) : (
                    <Button onClick={() => setActionType("block")} variant="destructive" className="flex-1" size="sm">
                      <Ban className="h-4 w-4 mr-1.5" />Block User
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setActionType(null)} size="sm">Close</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
