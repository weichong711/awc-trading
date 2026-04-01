import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use('*', logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

// ── Constants ─────────────────────────────────────────────────────────────────
const TRIAL_DAYS    = 14;
const GRACE_DAYS    = 3;
const PLAN_AMOUNT   = 59;
const PLAN_DAYS     = 30;
const ADMIN_EMAIL   = "admin@awctrading.com"; // ← change this to YOUR email

// ── Helper: verify JWT and return user ───────────────────────────────────────
async function getAuthUser(authHeader: string | null) {
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  if (!token) return null;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// ── Helper: compute subscription access status from stored data ───────────────
function computeAccessStatus(sub: any): {
  status: "trial" | "active" | "grace_period" | "blocked";
  daysLeft: number;
  graceDaysLeft: number;
  expiresAt: string;
  gracePeriodEndsAt: string;
} {
  const now = Date.now();

  if (!sub) {
    // Should not happen (signup always creates sub), treat as blocked
    return { status: "blocked", daysLeft: 0, graceDaysLeft: 0, expiresAt: "", gracePeriodEndsAt: "" };
  }

  const expiresAt        = new Date(sub.expiresAt).getTime();
  const gracePeriodEndsAt = new Date(sub.gracePeriodEndsAt).getTime();

  const msLeft       = expiresAt - now;
  const graceMsLeft  = gracePeriodEndsAt - now;
  const daysLeft     = Math.max(0, Math.ceil(msLeft / 86400000));
  const graceDaysLeft = Math.max(0, Math.ceil(graceMsLeft / 86400000));

  let status: "trial" | "active" | "grace_period" | "blocked";
  if (now < expiresAt) {
    status = sub.plan === "trial" ? "trial" : "active";
  } else if (now < gracePeriodEndsAt) {
    status = "grace_period";
  } else {
    status = "blocked";
  }

  return { status, daysLeft, graceDaysLeft, expiresAt: sub.expiresAt, gracePeriodEndsAt: sub.gracePeriodEndsAt };
}

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/make-server-51f3fb75/health", (c) => c.json({ status: "ok" }));

// ── SIGN UP ───────────────────────────────────────────────────────────────────
app.post("/make-server-51f3fb75/auth/signup", async (c) => {
  try {
    const { email, password, businessName, username } = await c.req.json();
    if (!email || !password || !businessName || !username) {
      return c.json({ error: "All fields are required: email, password, businessName, username" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { businessName, username },
      email_confirm: true,
    });

    if (error) {
      console.log("Signup error:", error);
      return c.json({ error: `Signup failed: ${error.message}` }, 400);
    }

    const userId   = data.user.id;
    const now      = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 86400000);
    const graceEnd = new Date(trialEnd.getTime() + GRACE_DAYS * 86400000);

    // Store profile
    await kv.set(`user:${userId}:profile`, {
      userId, email, username, businessName,
      createdAt: now.toISOString(),
    });

    // Create free trial subscription automatically
    await kv.set(`user:${userId}:subscription`, {
      plan:              "trial",
      status:            "trial",
      expiresAt:         trialEnd.toISOString(),
      gracePeriodEndsAt: graceEnd.toISOString(),
      trialStartedAt:    now.toISOString(),
      trialEndsAt:       trialEnd.toISOString(),
      lastPaymentDate:   null,
      lastPaymentRef:    null,
      paymentHistory:    [],
    });

    console.log(`New user registered: ${email} (${userId}) — trial until ${trialEnd.toISOString()}`);
    return c.json({ success: true, userId, trialEndsAt: trialEnd.toISOString() });
  } catch (err) {
    console.log("Signup exception:", err);
    return c.json({ error: `Server error during signup: ${err}` }, 500);
  }
});

// ── GET subscription status ─────────────────────────────────────────────��─────
app.get("/make-server-51f3fb75/user/subscription", async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    let sub = await kv.get(`user:${user.id}:subscription`);

    // If no subscription record exists (old account), create a trial
    if (!sub) {
      const now      = new Date();
      const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 86400000);
      const graceEnd = new Date(trialEnd.getTime() + GRACE_DAYS * 86400000);
      sub = {
        plan: "trial", status: "trial",
        expiresAt: trialEnd.toISOString(),
        gracePeriodEndsAt: graceEnd.toISOString(),
        trialStartedAt: now.toISOString(),
        trialEndsAt: trialEnd.toISOString(),
        lastPaymentDate: null, lastPaymentRef: null, paymentHistory: [],
      };
      await kv.set(`user:${user.id}:subscription`, sub);
    }

    const access = computeAccessStatus(sub);
    return c.json({ subscription: sub, access });
  } catch (err) {
    console.log("Get subscription error:", err);
    return c.json({ error: `Error fetching subscription: ${err}` }, 500);
  }
});

// ── ACTIVATE / RENEW subscription (called after successful FPX payment) ───────
app.post("/make-server-51f3fb75/user/subscription/activate", async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { paymentRef, bank, amount } = await c.req.json();
    if (!paymentRef) return c.json({ error: "paymentRef is required" }, 400);

    const existing = await kv.get(`user:${user.id}:subscription`) || {};
    const now      = new Date();

    // If currently active, extend from current expiry; otherwise start fresh from now
    const currentExpiry = existing.expiresAt ? new Date(existing.expiresAt) : now;
    const startFrom     = currentExpiry > now ? currentExpiry : now;
    const newExpiry     = new Date(startFrom.getTime() + PLAN_DAYS * 86400000);
    const newGraceEnd   = new Date(newExpiry.getTime() + GRACE_DAYS * 86400000);

    const paymentRecord = {
      ref:    paymentRef,
      bank:   bank || "Unknown",
      amount: amount || PLAN_AMOUNT,
      paidAt: now.toISOString(),
    };

    const updated = {
      ...existing,
      plan:              "business",
      status:            "active",
      expiresAt:         newExpiry.toISOString(),
      gracePeriodEndsAt: newGraceEnd.toISOString(),
      lastPaymentDate:   now.toISOString(),
      lastPaymentRef:    paymentRef,
      paymentHistory:    [paymentRecord, ...(existing.paymentHistory || [])],
    };

    await kv.set(`user:${user.id}:subscription`, updated);
    const access = computeAccessStatus(updated);

    console.log(`Subscription activated for user ${user.id}: expires ${newExpiry.toISOString()}`);
    return c.json({ success: true, subscription: updated, access });
  } catch (err) {
    console.log("Activate subscription error:", err);
    return c.json({ error: `Error activating subscription: ${err}` }, 500);
  }
});

// ── ADMIN: list all users with subscription status ────────────────────────────
app.get("/make-server-51f3fb75/admin/users", async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    if (user.email !== ADMIN_EMAIL) return c.json({ error: "Forbidden: Admin only" }, 403);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get all users from Supabase Auth
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 });
    if (error) return c.json({ error: `Failed to list users: ${error.message}` }, 500);

    // For each user, fetch their profile + subscription from KV
    const result = await Promise.all(users.map(async (u) => {
      const profile = await kv.get(`user:${u.id}:profile`);
      const sub     = await kv.get(`user:${u.id}:subscription`);
      const access  = computeAccessStatus(sub);
      return {
        id:           u.id,
        email:        u.email,
        createdAt:    u.created_at,
        lastSignIn:   u.last_sign_in_at,
        username:     profile?.username     || u.user_metadata?.username || "",
        businessName: profile?.businessName || u.user_metadata?.businessName || "",
        subscription: sub || null,
        access,
        manualBlock:  sub?.manualBlock || false,
      };
    }));

    // Sort: newest first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ users: result });
  } catch (err) {
    console.log("Admin list users error:", err);
    return c.json({ error: `Admin error: ${err}` }, 500);
  }
});

// ── ADMIN: block a specific user ──────────────────────────────────────────────
app.post("/make-server-51f3fb75/admin/users/:userId/block", async (c) => {
  try {
    const admin = await getAuthUser(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);
    if (admin.email !== ADMIN_EMAIL) return c.json({ error: "Forbidden: Admin only" }, 403);

    const { userId } = c.req.param();
    const { reason } = await c.req.json().catch(() => ({ reason: "" }));

    const existing = await kv.get(`user:${userId}:subscription`) || {};
    const now = new Date();

    // Set expiry to past so computeAccessStatus returns "blocked"
    const pastDate = new Date(now.getTime() - 86400000); // yesterday
    const updated = {
      ...existing,
      manualBlock:        true,
      manualBlockReason:  reason || "Manually blocked by admin",
      manualBlockAt:      now.toISOString(),
      expiresAt:          pastDate.toISOString(),
      gracePeriodEndsAt:  pastDate.toISOString(),
    };

    await kv.set(`user:${userId}:subscription`, updated);
    console.log(`Admin blocked user ${userId} at ${now.toISOString()}. Reason: ${reason}`);
    return c.json({ success: true, message: "User blocked successfully" });
  } catch (err) {
    console.log("Admin block user error:", err);
    return c.json({ error: `Block error: ${err}` }, 500);
  }
});

// ── ADMIN: unblock / restore a specific user ──────────────────────────────────
app.post("/make-server-51f3fb75/admin/users/:userId/unblock", async (c) => {
  try {
    const admin = await getAuthUser(c.req.header("Authorization"));
    if (!admin) return c.json({ error: "Unauthorized" }, 401);
    if (admin.email !== ADMIN_EMAIL) return c.json({ error: "Forbidden: Admin only" }, 403);

    const { userId } = c.req.param();
    const { days } = await c.req.json().catch(() => ({ days: 30 }));
    const grantDays = Number(days) || 30;

    const existing = await kv.get(`user:${userId}:subscription`) || {};
    const now      = new Date();
    const newExpiry = new Date(now.getTime() + grantDays * 86400000);
    const newGrace  = new Date(newExpiry.getTime() + GRACE_DAYS * 86400000);

    const updated = {
      ...existing,
      plan:              existing.plan === "trial" ? "trial" : "business",
      manualBlock:       false,
      manualBlockReason: null,
      expiresAt:         newExpiry.toISOString(),
      gracePeriodEndsAt: newGrace.toISOString(),
      adminRestoredAt:   now.toISOString(),
    };

    await kv.set(`user:${userId}:subscription`, updated);
    console.log(`Admin unblocked user ${userId}, granted ${grantDays} days.`);
    return c.json({ success: true, message: `User unblocked — access granted for ${grantDays} days` });
  } catch (err) {
    console.log("Admin unblock user error:", err);
    return c.json({ error: `Unblock error: ${err}` }, 500);
  }
});

// ── GET user profile ──────────────────────────────────────────────────────────
app.get("/make-server-51f3fb75/user/profile", async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const profile = await kv.get(`user:${user.id}:profile`);
    return c.json({ profile: profile || {
      userId: user.id,
      email: user.email,
      username: user.user_metadata?.username || user.email?.split("@")[0],
      businessName: user.user_metadata?.businessName || "My Business",
    }});
  } catch (err) {
    console.log("Get profile error:", err);
    return c.json({ error: `Error fetching profile: ${err}` }, 500);
  }
});

// ── UPDATE user profile ───────────────────────────────────────────────────────
app.put("/make-server-51f3fb75/user/profile", async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const updates = await c.req.json();
    const existing = await kv.get(`user:${user.id}:profile`) || {};
    await kv.set(`user:${user.id}:profile`, { ...existing, ...updates, updatedAt: new Date().toISOString() });
    return c.json({ success: true });
  } catch (err) {
    console.log("Update profile error:", err);
    return c.json({ error: `Error updating profile: ${err}` }, 500);
  }
});

// ── GET user business data ────────────────────────────────────────────────────
app.get("/make-server-51f3fb75/user/data", async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    // Check subscription — blocked users cannot read data
    const sub    = await kv.get(`user:${user.id}:subscription`);
    const access = computeAccessStatus(sub);
    if (access.status === "blocked") {
      return c.json({ error: "Subscription expired. Please renew to access your data.", blocked: true }, 403);
    }

    const products = await kv.get(`user:${user.id}:products`);
    const orders   = await kv.get(`user:${user.id}:orders`);
    const expenses = await kv.get(`user:${user.id}:expenses`);
    const stockItems = await kv.get(`user:${user.id}:stockItems`);
    const stockAdjustments = await kv.get(`user:${user.id}:stockAdjustments`);

    return c.json({ 
      products: products || null, 
      orders: orders || [], 
      expenses: expenses || [],
      stockItems: stockItems || [],
      stockAdjustments: stockAdjustments || []
    });
  } catch (err) {
    console.log("Get data error:", err);
    return c.json({ error: `Error fetching data: ${err}` }, 500);
  }
});

// ── SAVE user business data ───────────────────────────────────────────────────
app.post("/make-server-51f3fb75/user/data", async (c) => {
  try {
    const user = await getAuthUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    // Check subscription — blocked users cannot save data
    const sub    = await kv.get(`user:${user.id}:subscription`);
    const access = computeAccessStatus(sub);
    if (access.status === "blocked") {
      return c.json({ error: "Subscription expired. Please renew to save data.", blocked: true }, 403);
    }

    const { products, orders, expenses, stockItems, stockAdjustments } = await c.req.json();
    const saves: Promise<void>[] = [];
    if (products !== undefined) saves.push(kv.set(`user:${user.id}:products`, products));
    if (orders   !== undefined) saves.push(kv.set(`user:${user.id}:orders`,   orders));
    if (expenses !== undefined) saves.push(kv.set(`user:${user.id}:expenses`, expenses));
    if (stockItems !== undefined) saves.push(kv.set(`user:${user.id}:stockItems`, stockItems));
    if (stockAdjustments !== undefined) saves.push(kv.set(`user:${user.id}:stockAdjustments`, stockAdjustments));
    await Promise.all(saves);

    return c.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err) {
    console.log("Save data error:", err);
    return c.json({ error: `Error saving data: ${err}` }, 500);
  }
});

Deno.serve(app.fetch);