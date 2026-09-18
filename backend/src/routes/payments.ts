// ============================================================================
// LEDGERFLOW - Payment Routes (Midtrans Integration)
// ============================================================================
// File ini handle semua route yang berhubungan sama pembayaran & subscription:
//   - GET  /plans          → Ambil daftar semua plan yang tersedia
//   - GET  /is-sandbox     → Cek apakah lagi jalan di mode sandbox/test
//   - GET  /subscription   → Ambil data subscription user yang login
//   - POST /subscribe      → Buat transaksi pembayaran
//   - POST /test-complete  → Force-complete pembayaran (sandbox only)
//   - GET  /history        → Ambil riwayat pembayaran user
//   - POST /cancel         → Cancel subscription
//   - GET  /check-access   → Cek apakah user bisa akses fitur tertentu
//   - POST /webhook        → Midtrans webhook handler
// ============================================================================

import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { dbErrorResponse } from "../lib/errors.js";
import { authMiddleware } from "../middleware/auth.js";
import { premiumFeatureRateLimit } from "../middleware/rateLimit.js";
import { featureAccessLogger } from "../middleware/accessLogger.js";
import {
  snap,
  coreApi,
  generateOrderId,
  verifySignature,
  getPlanPrice,
  type PlanName,
  type BillingCycle,
} from "../lib/midtrans.js";
import { createNotification } from "../lib/notify.js";

const payments = new Hono();

// ════════════════════════════════════════════════════════════════════════
// GET /plans — Ambil daftar semua plan yang tersedia
// ════════════════════════════════════════════════════════════════════════
// Dipake frontend buat nampilin pricing page (card Free, Pro, Enterprise)
// ════════════════════════════════════════════════════════════════════════
payments.get("/plans", async (c) => {
  // Query ke tabel "plans" di Supabase:
  //   - select("*")        → ambil semua kolom
  //   - eq("is_active", true) → cuma plan yang aktif (yang gak aktif gak ditampilin)
  //   - order("price_monthly", { ascending: true }) → urutin dari termurah ke termahal
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("price_monthly", { ascending: true });

  // Kalau query gagal, return error 500 (Internal Server Error)
  if (error) return dbErrorResponse(c, error);

  // Kalau sukses, return data plans (array of plan objects)
  return c.json(data);
});

// ════════════════════════════════════════════════════════════════════════
// GET /is-sandbox — Cek apakah lagi jalan di mode sandbox/test
// ════════════════════════════════════════════════════════════════════════
// Frontend manggil ini buat nentuin:
//   - Apakah harus auto-complete payment pas onPending
//   - Apakah tombol "Simulasi Bayar Berhasil" harus ditampilin
//   - Apakah lagi development atau udah production
// ═══════════════════════════════════════════════════════════════════════
payments.get("/is-sandbox", async (c) => {
  const isProduction = process.env.NODE_ENV === "production";
  const midtrxProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const explicitAllow = process.env.ALLOW_SANDBOX_IN_PROD === "true";

  const isSandbox = !(isProduction && midtrxProduction) && !(isProduction && !explicitAllow)
    ? process.env.MIDTRANS_IS_PRODUCTION !== "true"
    : false;

  return c.json({ is_sandbox: isSandbox });
});

// ════════════════════════════════════════════════════════════════════════
// GET /subscription — Ambil data subscription user yang login
// ════════════════════════════════════════════════════════════════════════
// Dipake frontend buat:
//   - Nampilin badge plan di navbar (Free / Pro / Enterprise)
//   - Nampilin trial banner & sisa hari trial
//   - Nentuin apakah user bisa akses fitur tertentu
//   - Nampilin info subscription di halaman settings
// ════════════════════════════════════════════════════════════════════════
payments.get("/subscription", authMiddleware, async (c) => {
  // User ID diambil dari JWT terverifikasi, bukan header yang bisa dipalsukan
  const userId = c.get("user").sub;

  // Query ke tabel "subscriptions" + join tabel "plans" buat dapet detail plan:
  //   - eq("user_id", userId) → cuma subscription milik user ini
  //   - maybeSingle()         → return 1 record atau null (gak error kalau kosong)
  //     (beda sama .single() yang bakal error kalau record gak ditemukan)
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      `
      *,
      plans (
        id, name, display_name, price_monthly, price_yearly,
        max_companies, max_journals, features
      )
    `,
    )
    .eq("user_id", userId)
    .maybeSingle();

  // Kalau query gagal, return error 500
  if (error) return dbErrorResponse(c, error);

  // ─── Kalau user belum punya subscription, auto-create yang free ─────
  // Ini terjadi kalau user baru daftar tapi belum pernah bikin subscription
  // Kita auto-create subscription free + 15 hari trial
  if (!data) {
    console.log("[Payments] No subscription found, creating default...");

    // Cari plan "free" di database buat dapet ID-nya
    const { data: freePlan } = await supabase
      .from("plans")
      .select("id")
      .eq("name", "free")
      .single();

    // Kalau plan free gak ada di DB, berarti ada masalah di seeding → error
    if (!freePlan) return c.json({ error: "Free plan not found" }, 500);

    // Hitung tanggal sekarang & 15 hari ke depan buat trial period
    const now = new Date(); // Tanggal hari ini
    const trialEnd = new Date(now.getTime() + 15 * 86400000); // 15 hari ke depan (86400000ms = 1 hari)

    // Insert subscription baru buat user ini:
    //   - plan_id      → ID plan free
    //   - status       → "trialing" (masa trial 15 hari)
    //   - trial_start  → kapan trial mulai
    //   - trial_end    → kapan trial selesai
    //   - current_period_start/end → periode berlangganan saat ini
    const { data: newSub, error: insertErr } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_id: freePlan.id,
        status: "trialing",
        trial_start: now.toISOString(),
        trial_end: trialEnd.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: trialEnd.toISOString(),
      })
      .select(
        `
        *,
        plans (
          id, name, display_name, price_monthly, price_yearly,
          max_companies, max_journals, features
        )
      `
      )
      .single();

    if (insertErr) return dbErrorResponse(c, insertErr);

    return c.json(newSub);
  }

  // Kalau sukses, return data subscription + plan detail
  return c.json(data);
});

// ════════════════════════════════════════════════════════════════════════
// POST /subscribe — Buat transaksi pembayaran & dapet Midtrans Snap token
// ════════════════════════════════════════════════════════════════════════
// Dipake: PricingPage.tsx pas user klik "Upgrade Sekarang"
//
// Backend: POST /api/payments/subscribe
//   Body: { plan_name: "pro", billing_cycle: "monthly" }
//   Return: { snap_token, redirect_url, order_id }
//   Setelah dapet snap_token, frontend manggil openSnapPayment()
//   buat buka popup pembayaran Midtrans.
// ════════════════════════════════════════════════════════════════════════
payments.post("/subscribe", authMiddleware, async (c) => {
  // User ID dari JWT terverifikasi
  const userId = c.get("user").sub;

  // Ambil body request
  const { plan_name, billing_cycle } = await c.req.json();

  // Validasi plan_name harus "pro" atau "enterprise" (free tidak perlu subscribe)
  if (!["pro", "enterprise"].includes(plan_name)) {
    return c.json({ error: "Plan tidak valid. Pilih 'pro' atau 'enterprise'." }, 400);
  }
  const billingCycle: BillingCycle = billing_cycle ?? "monthly";

  // Ambil harga plan dari database (bukan hardcode)
  const { data: plan } = await supabase
    .from("plans")
    .select("id, name, display_name, price_monthly, price_yearly")
    .eq("name", plan_name)
    .single();

  if (!plan) {
    return c.json({ error: "Plan tidak ditemukan" }, 404);
  }

  const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;

  // Generate order ID unik
  const orderId = generateOrderId(userId);

  // Buat transaksi di Midtrans Snap API
  const snapRes = await snap.createTransaction({
    transaction_details: {
      order_id: orderId,
      gross_amount: price,
    },
    customer_details: {
      email: c.get("user").email,
      first_name: c.get("user").name,
    },
    item_details: [
      {
        id: plan.name,
        price,
        quantity: 1,
        name: plan.display_name + " (" + billingCycle + ")",
      },
    ],
    callbacks: {
      finish: `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment/success?order_id=${orderId}`,
      error: `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment/failed?order_id=${orderId}`,
      pending: `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment/pending?order_id=${orderId}`,
    },
  });

  // Simpan payment record (status pending)
  await supabase.from("payments").insert({
    user_id: userId,
    subscription_id: null, // diisi setelah webhook
    order_id: orderId,
    amount: price,
    status: "pending",
    payment_type: null,
    midtrans_response: snapRes,
  });

  // Return snap token ke frontend
  return c.json({
    snap_token: snapRes.token,
    redirect_url: snapRes.redirect_url,
    order_id: orderId,
  });
});

// ════════════════════════════════════════════════════════════════════════
// POST /test-complete — Force-complete pembayaran pending (sandbox only)
// ═══════════════════════════════════════════════════════════════════════
// ⚠️ SANDBOX ONLY — endpoint ini gak bisa dipake di production!
//
// KENAPA DIBUTUHKAN:
//   Di Midtrans Sandbox, pembayaran via Virtual Account / Bank Transfer
//   statusnya tetap "pending" selamanya (webhook settlement gak pernah fire).
//   Fungsi ini simulasi pembayaran berhasil biar bisa test full flow upgrade.
//
// Dipake:
//   - PricingPage.tsx → auto-call pas onPending (sandbox mode)
//   - PaymentResultPage.tsx → tombol "Simulasi Bayar Berhasil" (sandbox mode)
//
// Backend: POST /api/payments/test-complete
//   Body: { order_id: "LF-xxx-xxx" }
//   Return: { status: "ok", message: "...", subscription_status: "active", plan_id: "..." }
// ═══════════════════════════════════════════════════════════════════════
payments.post("/test-complete", authMiddleware, async (c) => {
  // Pastikan sandbox mode
  if (process.env.MIDTRANS_IS_PRODUCTION === "true") {
    return c.json(
      { error: "Endpoint ini hanya untuk sandbox mode" },
      403,
    );
  }

  const { order_id } = await c.req.json();

  if (!order_id) {
    return c.json({ error: "order_id wajib diisi" }, 400);
  }

  // Cari payment record berdasarkan order_id
  const { data: payment, error: paymentErr } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", order_id)
    .maybeSingle();

  if (paymentErr) return dbErrorResponse(c, paymentErr);
  if (!payment) return c.json({ error: "Payment tidak ditemukan" }, 404);

  // Cek apakah payment sudah completed
  if (payment.status === "paid") {
    return c.json({
      status: "ok",
      message: "Pembayaran sudah selesai",
      subscription_status: "active",
    });
  }

  // Update payment status → paid
  const now = new Date();
  await supabase
    .from("payments")
    .update({ status: "paid", paid_at: now.toISOString() })
    .eq("id", payment.id);

  // Cek apakah subscription sudah ada
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", payment.user_id)
    .maybeSingle();

  let planName = "pro";
  if (sub) {
    // Update subscription existing
    const { data: plan } = await supabase
      .from("plans")
      .select("name")
      .eq("id", sub.plan_id)
      .single();
    planName = plan?.name ?? "pro";

    await supabase
      .from("subscriptions")
      .update({
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      })
      .eq("id", sub.id);
  } else {
    // Auto-create subscription baru
    const { data: plan } = await supabase
      .from("plans")
      .select("id, name")
      .eq("name", "pro")
      .single();

    if (!plan) {
      return c.json({ error: "Pro plan tidak ditemukan" }, 500);
    }

    planName = plan.name;

    await supabase.from("subscriptions").insert({
      user_id: payment.user_id,
      plan_id: plan.id,
      status: "active",
      billing_cycle: "monthly",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
  }

  // Update subscription_id di payment record
  await supabase
    .from("payments")
    .update({ subscription_id: sub?.id ?? null })
    .eq("id", payment.id);

  return c.json({
    status: "ok",
    message: "Pembayaran simulasi berhasil",
    subscription_status: "active",
    plan_id: planName,
  });
});

// ════════════════════════════════════════════════════════════════════════
// GET /check-access — Cek apakah user bisa akses fitur tertentu
// ════════════════════════════════════════════════════════════════════════
// Dipake frontend buat FeatureGate / Paywall component
// Contoh: user coba buka halaman "Laporan Laba Rugi"
//   → Frontend panggil /check-access?feature=income_statement
//   → Backend cek: user free plan, fitur butuh pro → return has_access: false
//   → Frontend tampilin Paywall "Upgrade ke Pro buat akses fitur ini"
// ════════════════════════════════════════════════════════════════════════
payments.get("/check-access", authMiddleware, premiumFeatureRateLimit, featureAccessLogger, async (c) => {
  // User ID dari JWT terverifikasi
  const userId = c.get("user").sub;

  // Ambil nama fitur dari query parameter
  // Contoh: /check-access?feature=export_pdf
  const feature = c.req.query("feature");

  // Query subscription + data plan dari database
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*, plans(*)") // Ambil subscription + join plan
    .eq("user_id", userId)
    .maybeSingle(); // Bisa null kalau user belum punya subscription

  // Kalau user belum punya subscription → gak bisa akses apapun
  if (!sub) {
    return c.json({ has_access: false, reason: "no_subscription" });
  }

  // Cek apakah subscription masih aktif (trial atau berbayar)
  const now = new Date();
  // Trial aktif = status "trialing" DAN trial_end belum lewat
  const isTrialActive =
    sub.status === "trialing" && sub.trial_end && new Date(sub.trial_end) > now;
  // Subscription aktif = status "active" DAN period_end belum lewat
  const isSubActive =
    sub.status === "active" &&
    sub.current_period_end &&
    new Date(sub.current_period_end) > now;

  // Kalau keduanya gak aktif → subscription expired
  if (!isTrialActive && !isSubActive) {
    return c.json({
      has_access: false, // Gak bisa akses
      reason: "subscription_expired", // Alasan: subscription habis
      plan: sub.plans?.name, // Plan sekarang (buat info)
    });
  }

  // Kalau tidak ada feature parameter, return info subscription secara umum
  if (!feature) {
    return c.json({
      has_access: true,
      plan: sub.plans?.name,
      is_trial: isTrialActive,
      trial_days_left: isTrialActive
        ? Math.ceil(
            (new Date(sub.trial_end).getTime() - now.getTime()) / 86400000,
          )
        : 0,
    });
  }

  // Ambil nama plan user sekarang
  const planName = sub.plans?.name;

  // Ambil features dari plan (JSONB array)
  const planFeatures: string[] = sub.plans?.features ?? [];

  // Trial aktif = akses 4 fitur inti: income_statement, balance_sheet, cash_flow, export_pdf
  const trialCoreFeatures = ["income_statement", "balance_sheet", "cash_flow", "export_pdf"];
  const trialGrantsAccess = isTrialActive && trialCoreFeatures.includes(feature);

  // Cek akses: trial core features ATAU feature ada di plan features
  let hasAccess = false;
  if (feature) {
    hasAccess = trialGrantsAccess || planFeatures.includes(feature);
  }

  // Dibaca oleh featureAccessLogger setelah handler selesai.
  c.set("featureGranted", hasAccess);

  // Tentukan required_plan untuk response
  let requiredPlan: string | null = null;
  if (feature && !hasAccess) {
    // Cari plan minimum yang punya feature ini
    if (["income_statement", "balance_sheet", "cash_flow", "export_pdf"].includes(feature)) {
      requiredPlan = "free"; // trial bisa akses
    } else {
      // Cari plan minimum yang punya feature ini
      const { data: plans } = await supabase
        .from("plans")
        .select("name")
        .contains("features", [feature])
        .order("price_monthly", { ascending: true })
        .limit(1);
      requiredPlan = plans?.[0]?.name ?? "pro";
    }
  }

  return c.json({
    has_access: hasAccess, // Apakah bisa akses
    plan: planName, // Plan user sekarang
    is_trial: isTrialActive, // Apakah lagi trial
    trial_days_left: isTrialActive // Sisa hari trial (kalau trial)
      ? Math.ceil(
          (new Date(sub.trial_end).getTime() - now.getTime()) / 86400000,
        )
      : 0,
    required_plan: hasAccess ? null : requiredPlan, // Plan minimal yang dibutuhkan (kalau gak bisa akses)
  });
});

export default payments;