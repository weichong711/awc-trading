import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use('*', logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "X-User-Token"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

// ── Constants ─────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = "leongweichong0748@gmail.com"; // ← change this to YOUR email

// ── Helper: verify JWT and return user ───────────────────────────────────────
async function getAuthUser(c: { req: { header: (name: string) => string | undefined } }) {
  // Frontend sends the user's access_token in X-User-Token (so Supabase runtime
  // JWT check can use the publicAnonKey in Authorization without rejection).
  // Fall back to Authorization header for backward compatibility.
  const userToken = c.req.header("X-User-Token");
  const authHeader = c.req.header("Authorization");
  const token = userToken || authHeader?.split(" ")[1];
  if (!token) return null;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// ── Helper: access for a free app (no paid trial / expiry). Only admin manualBlock locks an account. ──
function computeAccessStatus(sub: any): {
  status: "trial" | "active" | "grace_period" | "blocked";
  daysLeft: number;
  graceDaysLeft: number;
  expiresAt: string;
  gracePeriodEndsAt: string;
} {
  const empty = { expiresAt: "", gracePeriodEndsAt: "" };
  if (!sub) {
    return { status: "active", daysLeft: 9999, graceDaysLeft: 0, ...empty };
  }
  if (sub.manualBlock) {
    return {
      status: "blocked",
      daysLeft: 0,
      graceDaysLeft: 0,
      expiresAt: sub.expiresAt || "",
      gracePeriodEndsAt: sub.gracePeriodEndsAt || "",
    };
  }
  return {
    status: "active",
    daysLeft: 9999,
    graceDaysLeft: 0,
    expiresAt: sub.expiresAt || "",
    gracePeriodEndsAt: sub.gracePeriodEndsAt || "",
  };
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

    const userId = data.user.id;
    const now    = new Date();

    await kv.set(`user:${userId}:profile`, {
      userId, email, username, businessName,
      createdAt: now.toISOString(),
    });

    console.log(`New user registered: ${email} (${userId})`);
    return c.json({ success: true, userId });
  } catch (err) {
    console.log("Signup exception:", err);
    return c.json({ error: `Server error during signup: ${err}` }, 500);
  }
});

// ── GET subscription status ───────────────────────────────────────────────────
app.get("/make-server-51f3fb75/user/subscription", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const sub = await kv.get(`user:${user.id}:subscription`);
    const access = computeAccessStatus(sub);
    return c.json({ subscription: sub, access });
  } catch (err) {
    console.log("Get subscription error:", err);
    return c.json({ error: `Error fetching subscription: ${err}` }, 500);
  }
});

// ── ACTIVATE / RENEW (legacy FPX hook — app is free; endpoint kept so old clients do not hard-fail) ──
app.post("/make-server-51f3fb75/user/subscription/activate", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const sub = await kv.get(`user:${user.id}:subscription`);
    return c.json({
      success: true,
      message: "Paid subscriptions are not used; accounts already have full access.",
      subscription: sub ?? null,
      access: computeAccessStatus(sub),
    });
  } catch (err) {
    console.log("Activate subscription error:", err);
    return c.json({ error: `Error: ${err}` }, 500);
  }
});

// ── ADMIN: list all users with subscription status ────────────────────────────
app.get("/make-server-51f3fb75/admin/users", async (c) => {
  try {
    const user = await getAuthUser(c);
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
    const admin = await getAuthUser(c);
    if (!admin) return c.json({ error: "Unauthorized" }, 401);
    if (admin.email !== ADMIN_EMAIL) return c.json({ error: "Forbidden: Admin only" }, 403);

    const { userId } = c.req.param();
    const { reason } = await c.req.json().catch(() => ({ reason: "" }));

    const existing = await kv.get(`user:${userId}:subscription`) || {};
    const now = new Date();

    const updated = {
      ...existing,
      manualBlock:       true,
      manualBlockReason: reason || "Manually blocked by admin",
      manualBlockAt:     now.toISOString(),
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
    const admin = await getAuthUser(c);
    if (!admin) return c.json({ error: "Unauthorized" }, 401);
    if (admin.email !== ADMIN_EMAIL) return c.json({ error: "Forbidden: Admin only" }, 403);

    const { userId } = c.req.param();

    const existing = await kv.get(`user:${userId}:subscription`) || {};
    const now      = new Date();

    const updated = {
      ...existing,
      manualBlock:       false,
      manualBlockReason: null,
      manualBlockAt:     null,
      adminRestoredAt:   now.toISOString(),
    };

    await kv.set(`user:${userId}:subscription`, updated);
    console.log(`Admin unblocked user ${userId}`);
    return c.json({ success: true, message: "User unblocked — full access restored." });
  } catch (err) {
    console.log("Admin unblock user error:", err);
    return c.json({ error: `Unblock error: ${err}` }, 500);
  }
});

// ── ADMIN: set user password (Supabase Auth Admin API) ───────────────────────
app.post("/make-server-51f3fb75/admin/users/:userId/password", async (c) => {
  try {
    const admin = await getAuthUser(c);
    if (!admin) return c.json({ error: "Unauthorized" }, 401);
    if (admin.email !== ADMIN_EMAIL) return c.json({ error: "Forbidden: Admin only" }, 403);

    const { userId } = c.req.param();
    const body = await c.req.json().catch(() => ({}));
    const password =
      typeof body.password === "string" ? body.password : "";

    if (!password || password.length < 6) {
      return c.json(
        { error: "Password must be at least 6 characters." },
        400,
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password },
    );
    if (error) {
      console.log("Admin updateUserById error:", error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({
      success: true,
      message: "Password updated.",
      user: { id: data.user!.id, email: data.user!.email },
    });
  } catch (err) {
    console.log("Admin password update error:", err);
    return c.json({ error: `Password update error: ${err}` }, 500);
  }
});

// ── GET user profile ──────────────────────────────────────────────────────────
app.get("/make-server-51f3fb75/user/profile", async (c) => {
  try {
    const user = await getAuthUser(c);
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
    const user = await getAuthUser(c);
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
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const sub    = await kv.get(`user:${user.id}:subscription`);
    const access = computeAccessStatus(sub);
    if (access.status === "blocked") {
      return c.json({ error: "This account has been suspended. Contact support if you need help.", blocked: true }, 403);
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
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const sub    = await kv.get(`user:${user.id}:subscription`);
    const access = computeAccessStatus(sub);
    if (access.status === "blocked") {
      return c.json({ error: "This account has been suspended. Saving is disabled.", blocked: true }, 403);
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

// Return JSON for unknown routes (default Hono 404 is plain "404 Not Found" — breaks fetch().json())
app.notFound((c) =>
  c.json(
    {
      error: "Not found",
      path: c.req.path,
      method: c.req.method,
    },
    404,
  ),
);

Deno.serve(app.fetch);
