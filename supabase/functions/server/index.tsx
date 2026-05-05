import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

app.use('*', logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "X-User-Token"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

const ADMIN_EMAIL = "leongweichong0748@gmail.com";

// ── Helper: get supabase admin client ─────────────────────────────────────────
function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// ── Helper: verify JWT and return user ────────────────────────────────────────
async function getAuthUser(c: any) {
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

// ── Helper: check if account is blocked ──────────────────────────────────────
async function isBlocked(userId: string): Promise<boolean> {
  const db = adminClient();
  const { data } = await db
    .from("kv_store_51f3fb75")
    .select("value")
    .eq("key", `user:${userId}:subscription`)
    .maybeSingle();
  return data?.value?.manualBlock === true;
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/make-server-51f3fb75/health", (c) => c.json({ status: "ok" }));

// ── SIGN UP ───────────────────────────────────────────────────────────────────
app.post("/make-server-51f3fb75/auth/signup", async (c) => {
  try {
    const { email, password, businessName, username } = await c.req.json();
    if (!email || !password || !businessName || !username)
      return c.json({ error: "All fields required" }, 400);

    const db = adminClient();
    const { data, error } = await db.auth.admin.createUser({
      email, password,
      user_metadata: { businessName, username },
      email_confirm: true,
    });
    if (error) return c.json({ error: `Signup failed: ${error.message}` }, 400);

    const userId = data.user.id;
    await db.from("user_profiles").upsert({
      user_id: userId,
      email,
      username,
      business_name: businessName,
      phone_number: "",
    });

    return c.json({ success: true, userId });
  } catch (err) {
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ── GET subscription ──────────────────────────────────────────────────────────
app.get("/make-server-51f3fb75/user/subscription", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const blocked = await isBlocked(user.id);
  const access = { status: blocked ? "blocked" : "active", daysLeft: 9999, graceDaysLeft: 0, expiresAt: "", gracePeriodEndsAt: "" };
  return c.json({ subscription: null, access });
});

// ── ACTIVATE subscription (legacy endpoint — kept so old clients don't break) ─
app.post("/make-server-51f3fb75/user/subscription/activate", async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ success: true, message: "App is free — full access granted.", access: { status: "active", daysLeft: 9999 } });
});

// ── GET user profile ──────────────────────────────────────────────────────────
app.get("/make-server-51f3fb75/user/profile", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const db = adminClient();
    const { data } = await db
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const profile = data ? {
      userId: data.user_id,
      email: data.email,
      username: data.username,
      businessName: data.business_name,
      phoneNumber: data.phone_number,
    } : {
      userId: user.id,
      email: user.email,
      username: user.user_metadata?.username || user.email?.split("@")[0] || "",
      businessName: user.user_metadata?.businessName || "My Business",
      phoneNumber: "",
    };

    return c.json({ profile });
  } catch (err) {
    return c.json({ error: `Error: ${err}` }, 500);
  }
});

// ── UPDATE user profile ───────────────────────────────────────────────────────
app.put("/make-server-51f3fb75/user/profile", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const updates = await c.req.json();
    const db = adminClient();
    await db.from("user_profiles").upsert({
      user_id: user.id,
      email: updates.email || user.email,
      username: updates.username || "",
      business_name: updates.businessName || "My Business",
      phone_number: updates.phoneNumber || "",
    });

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Error: ${err}` }, 500);
  }
});

// ── GET user business data ────────────────────────────────────────────────────
app.get("/make-server-51f3fb75/user/data", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const blocked = await isBlocked(user.id);
    if (blocked) return c.json({ error: "Account suspended.", blocked: true }, 403);

    const db = adminClient();
    const uid = user.id;

    const [
      { data: products },
      { data: orders },
      { data: orderItems },
      { data: expenses },
      { data: stockItems },
      { data: stockAdj },
    ] = await Promise.all([
      db.from("user_products").select("*").eq("user_id", uid),
      db.from("user_orders").select("*").eq("user_id", uid).order("order_date", { ascending: false }),
      db.from("user_order_items").select("*").eq("user_id", uid),
      db.from("user_expenses").select("*").eq("user_id", uid).order("expense_date", { ascending: false }),
      db.from("user_stock_items").select("*").eq("user_id", uid),
      db.from("user_stock_adjustments").select("*").eq("user_id", uid).order("adjustment_date", { ascending: false }),
    ]);

    // Map DB rows → app format
    const mappedProducts = (products || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: Number(p.price),
      cost: Number(p.cost),
      unit: p.unit,
      stock: p.stock,
      imageUrl: p.image_url || "",
      showInOrders: p.show_in_orders,
    }));

    // Group order items by order_id
    const itemsByOrder = new Map<string, any[]>();
    (orderItems || []).forEach((item: any) => {
      if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
      itemsByOrder.get(item.order_id)!.push({
        productId: item.product_id,
        productName: item.product_name,
        quantity: Number(item.quantity),
        unit: item.unit,
        price: Number(item.price),
        total: Number(item.total),
      });
    });

    const mappedOrders = (orders || []).map((o: any) => ({
      id: o.id,
      items: itemsByOrder.get(o.id) || [],
      subtotal: Number(o.subtotal),
      discountType: o.discount_type,
      discount: Number(o.discount),
      discountAmount: Number(o.discount_amount),
      total: Number(o.total),
      cashTendered: o.cash_tendered ? Number(o.cash_tendered) : undefined,
      paymentMethod: o.payment_method,
      status: o.status,
      date: o.order_date,
    }));

    const mappedExpenses = (expenses || []).map((e: any) => ({
      id: e.id,
      productId: e.product_id,
      productName: e.product_name,
      quantity: Number(e.quantity),
      unit: e.unit,
      costPerUnit: Number(e.cost_per_unit),
      totalCost: Number(e.total_cost),
      date: e.expense_date,
      expiryDate: e.expiry_date || undefined,
      notes: e.notes || undefined,
    }));

    const mappedStockItems = (stockItems || []).map((s: any) => ({
      id: s.id,
      productName: s.product_name,
      category: s.category,
      quantity: Number(s.quantity),
      unit: s.unit,
      sellingPrice: s.selling_price ? Number(s.selling_price) : undefined,
      costPerUnit: s.cost_per_unit ? Number(s.cost_per_unit) : undefined,
      expiryDate: s.expiry_date || undefined,
      addedDate: s.added_date,
      notes: s.notes || undefined,
    }));

    const mappedStockAdj = (stockAdj || []).map((a: any) => ({
      id: a.id,
      stockItemId: a.stock_item_id,
      productName: a.product_name,
      adjustmentType: a.adjustment_type,
      reason: a.reason,
      quantity: Number(a.quantity),
      previousQty: Number(a.previous_qty),
      newQty: Number(a.new_qty),
      date: a.adjustment_date,
      notes: a.notes || undefined,
    }));

    return c.json({
      products: mappedProducts.length > 0 ? mappedProducts : null,
      orders: mappedOrders,
      expenses: mappedExpenses,
      stockItems: mappedStockItems,
      stockAdjustments: mappedStockAdj,
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

    const blocked = await isBlocked(user.id);
    if (blocked) return c.json({ error: "Account suspended.", blocked: true }, 403);

    const { products, orders, expenses, stockItems, stockAdjustments } = await c.req.json();
    const db = adminClient();
    const uid = user.id;

    const saves: Promise<any>[] = [];

    // ── Products ──────────────────────────────────────────────────────────
    if (products !== undefined) {
      saves.push(
        db.from("user_products").delete().eq("user_id", uid).then(() =>
          products.length > 0
            ? db.from("user_products").insert(
                products.map((p: any) => ({
                  id: p.id,
                  user_id: uid,
                  name: p.name,
                  category: p.category,
                  price: p.price,
                  cost: p.cost,
                  unit: p.unit,
                  stock: p.stock,
                  image_url: p.imageUrl || null,
                  show_in_orders: p.showInOrders !== false,
                }))
              )
            : Promise.resolve()
        )
      );
    }

    // ── Orders + Order Items ──────────────────────────────────────────────
    if (orders !== undefined) {
      saves.push(
        db.from("user_orders").delete().eq("user_id", uid).then(async () => {
          if (orders.length === 0) return;
          await db.from("user_orders").insert(
            orders.map((o: any) => ({
              id: o.id,
              user_id: uid,
              subtotal: o.subtotal ?? o.total,
              discount_type: o.discountType ?? "percentage",
              discount: o.discount ?? 0,
              discount_amount: o.discountAmount ?? 0,
              total: o.total,
              cash_tendered: o.cashTendered ?? null,
              payment_method: o.paymentMethod ?? "cash",
              status: o.status ?? "completed",
              order_date: o.date,
            }))
          );
          // Insert all order items
          const allItems: any[] = [];
          orders.forEach((o: any) => {
            (o.items || []).forEach((item: any) => {
              allItems.push({
                order_id: o.id,
                user_id: uid,
                product_id: item.productId,
                product_name: item.productName,
                quantity: item.quantity,
                unit: item.unit,
                price: item.price,
                total: item.total,
              });
            });
          });
          if (allItems.length > 0) {
            await db.from("user_order_items").insert(allItems);
          }
        })
      );
    }

    // ── Expenses ──────────────────────────────────────────────────────────
    if (expenses !== undefined) {
      saves.push(
        db.from("user_expenses").delete().eq("user_id", uid).then(() =>
          expenses.length > 0
            ? db.from("user_expenses").insert(
                expenses.map((e: any) => ({
                  id: e.id,
                  user_id: uid,
                  product_id: e.productId,
                  product_name: e.productName,
                  quantity: e.quantity,
                  unit: e.unit,
                  cost_per_unit: e.costPerUnit,
                  total_cost: e.totalCost,
                  expense_date: e.date,
                  expiry_date: e.expiryDate || null,
                  notes: e.notes || null,
                }))
              )
            : Promise.resolve()
        )
      );
    }

    // ── Stock Items ───────────────────────────────────────────────────────
    if (stockItems !== undefined) {
      saves.push(
        db.from("user_stock_items").delete().eq("user_id", uid).then(() =>
          stockItems.length > 0
            ? db.from("user_stock_items").insert(
                stockItems.map((s: any) => ({
                  id: s.id,
                  user_id: uid,
                  product_name: s.productName,
                  category: s.category,
                  quantity: s.quantity,
                  unit: s.unit,
                  selling_price: s.sellingPrice ?? null,
                  cost_per_unit: s.costPerUnit ?? null,
                  expiry_date: s.expiryDate || null,
                  added_date: s.addedDate,
                  notes: s.notes || null,
                }))
              )
            : Promise.resolve()
        )
      );
    }

    // ── Stock Adjustments ─────────────────────────────────────────────────
    if (stockAdjustments !== undefined) {
      saves.push(
        db.from("user_stock_adjustments").delete().eq("user_id", uid).then(() =>
          stockAdjustments.length > 0
            ? db.from("user_stock_adjustments").insert(
                stockAdjustments.map((a: any) => ({
                  id: a.id,
                  user_id: uid,
                  stock_item_id: a.stockItemId,
                  product_name: a.productName,
                  adjustment_type: a.adjustmentType,
                  reason: a.reason,
                  quantity: a.quantity,
                  previous_qty: a.previousQty,
                  new_qty: a.newQty,
                  adjustment_date: a.date,
                  notes: a.notes || null,
                }))
              )
            : Promise.resolve()
        )
      );
    }

    await Promise.all(saves);
    return c.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err) {
    console.log("Save data error:", err);
    return c.json({ error: `Error saving data: ${err}` }, 500);
  }
});

// ── ADMIN: list all users ─────────────────────────────────────────────────────
app.get("/make-server-51f3fb75/admin/users", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    if (user.email !== ADMIN_EMAIL) return c.json({ error: "Forbidden" }, 403);

    const db = adminClient();
    const { data: { users }, error } = await db.auth.admin.listUsers({ perPage: 500 });
    if (error) return c.json({ error: error.message }, 500);

    const { data: profiles } = await db.from("user_profiles").select("*");
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    const result = users.map((u) => {
      const profile = profileMap.get(u.id);
      return {
        id: u.id,
        email: u.email,
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at,
        username: profile?.username || u.user_metadata?.username || "",
        businessName: profile?.business_name || u.user_metadata?.businessName || "",
        access: { status: "active", daysLeft: 9999 },
        manualBlock: false,
      };
    });

    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ users: result });
  } catch (err) {
    return c.json({ error: `Admin error: ${err}` }, 500);
  }
});

// ── ADMIN: block user ─────────────────────────────────────────────────────────
app.post("/make-server-51f3fb75/admin/users/:userId/block", async (c) => {
  try {
    const admin = await getAuthUser(c);
    if (!admin) return c.json({ error: "Unauthorized" }, 401);
    if (admin.email !== ADMIN_EMAIL) return c.json({ error: "Forbidden" }, 403);

    const { userId } = c.req.param();
    const { reason } = await c.req.json().catch(() => ({ reason: "" }));
    const db = adminClient();

    const existing = (await db.from("kv_store_51f3fb75").select("value").eq("key", `user:${userId}:subscription`).maybeSingle())?.data?.value || {};
    await db.from("kv_store_51f3fb75").upsert({
      key: `user:${userId}:subscription`,
      value: { ...existing, manualBlock: true, manualBlockReason: reason || "Blocked by admin", manualBlockAt: new Date().toISOString() },
    });

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Block error: ${err}` }, 500);
  }
});

// ── ADMIN: unblock user ───────────────────────────────────────────────────────
app.post("/make-server-51f3fb75/admin/users/:userId/unblock", async (c) => {
  try {
    const admin = await getAuthUser(c);
    if (!admin) return c.json({ error: "Unauthorized" }, 401);
    if (admin.email !== ADMIN_EMAIL) return c.json({ error: "Forbidden" }, 403);

    const { userId } = c.req.param();
    const db = adminClient();

    const existing = (await db.from("kv_store_51f3fb75").select("value").eq("key", `user:${userId}:subscription`).maybeSingle())?.data?.value || {};
    await db.from("kv_store_51f3fb75").upsert({
      key: `user:${userId}:subscription`,
      value: { ...existing, manualBlock: false, manualBlockReason: null, adminRestoredAt: new Date().toISOString() },
    });

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Unblock error: ${err}` }, 500);
  }
});

// ── ADMIN: set user password ──────────────────────────────────────────────────
app.post("/make-server-51f3fb75/admin/users/:userId/password", async (c) => {
  try {
    const admin = await getAuthUser(c);
    if (!admin) return c.json({ error: "Unauthorized" }, 401);
    if (admin.email !== ADMIN_EMAIL) return c.json({ error: "Forbidden" }, 403);

    const { userId } = c.req.param();
    const { password } = await c.req.json().catch(() => ({}));
    if (!password || password.length < 6) return c.json({ error: "Password must be at least 6 characters." }, 400);

    const db = adminClient();
    const { data, error } = await db.auth.admin.updateUserById(userId, { password });
    if (error) return c.json({ error: error.message }, 400);

    return c.json({ success: true, user: { id: data.user!.id, email: data.user!.email } });
  } catch (err) {
    return c.json({ error: `Password update error: ${err}` }, 500);
  }
});

app.notFound((c) => c.json({ error: "Not found", path: c.req.path }, 404));

Deno.serve(app.fetch);
