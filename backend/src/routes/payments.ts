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

// Mode Midtrans — SATU sumber kebenaran (harus identik dengan lib/midtrans.ts).
// Semua keputusan sandbox/production di file ini mengacu ke sini.
const isMidtransProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

// Normalisasi array features plan: DB lama pernah berisi label manusia
// ("Laporan Laba Rugi") bukan machine key ("income_statement"). Petakan
// balik agar pencocokan canAccess() selalu konsisten, apa pun isi DB.
const FEATURE_LABEL_TO_KEY: Record<string, string> = {
  "laporan laba rugi": "income_statement",
  "neraca": "balance_sheet",
  "laporan arus kas": "cash_flow",
  "export pdf": "export_pdf",
  "export csv": "export_csv",
  "multi-perusahaan": "multi_company",
  "multi-pengguna & role": "multi_user",
  "asisten ai cfo": "ai_cfo",
  "ai cfo": "ai_cfo",
  "akses api": "api_access",
  "laporan kustom": "custom_reports",
  "audit trail": "audit_trail",
  "multi-user & roles": "multi_user",
};
function normalizeFeatures(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f) => {
    if (typeof f !== "string") return "";
    const key = f.trim().toLowerCase().replace(/\\s+/g, "_");
    if (key.includes(" ") || key.includes("/")) return FEATURE_LABEL_TO_KEY[f.trim().toLowerCase()] ?? f;
    return f;
  });
}

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
  // Satu sumber kebenaran — sama dengan yang dipakai lib midtrans.ts.
  // Logika lama (kombinasi NODE_ENV + explicitAllow) menghasilkan jawaban
  // SALAH di konfigurasi umum: frontend meload snap.js dari host yang
  // berbeda dengan token yang dibuat → popup "couldn't find your transaction".
  const isSandbox = process.env.MIDTRANS_IS_PRODUCTION !== "true";
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

  // Normalisasi features plan ke machine keys (jaga-jaga DB lama berisi label
  // manusia seperti "Laporan Laba Rugi" — bisa bikin Pro ke-paywall)
  if (data?.plans?.features) {
    (data.plans as Record<string, unknown>).features = normalizeFeatures(
      data.plans.features,
    );
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

  // Cegah checkout duplikat: plan+siklus yang persis sama dengan langganan
  // aktif tidak boleh dibayar lagi (Pro bulanan tetap boleh pindah ke tahunan).
  const { data: activeSub } = await supabase
    .from("subscriptions")
    .select("id, status, current_period_end, billing_cycle, plans(name)")
    .eq("user_id", userId)
    .maybeSingle();
  // Join PostgREST berupa array — tangani kedua bentuk (array/object)
  const subPlan = Array.isArray(activeSub?.plans)
    ? ((activeSub!.plans as any)[0]?.name ?? null)
    : ((activeSub?.plans as any)?.name ?? null);
  const subActive =
    activeSub?.status === "active" &&
    !!activeSub?.current_period_end &&
    new Date(activeSub.current_period_end) > new Date();
  if (subActive && subPlan === plan_name && billingCycle === (activeSub?.billing_cycle ?? "monthly")) {
    return c.json(
      {
        error: "Kamu sudah berlangganan plan & siklus ini. Pilih siklus lain atau tunggu periode berakhir.",
        reason: "already_subscribed",
      },
      409,
    );
  }

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

  // Simpan payment record (status pending).
  // subscription_id diisi null dulu — di-update setelah pembayaran sukses
  // (webhook / test-complete). Error insert WAJIB dicek: kalau gagal dan
  // dibiarkan, order_id tidak pernah tersimpan → webhook 404 → upgrade
  // tidak pernah aktif padahal user sudah bayar.
  const planName = plan.name as PlanName;
  const { error: paymentInsertErr } = await supabase.from("payments").insert({
    user_id: userId,
    subscription_id: null, // diisi setelah webhook
    order_id: orderId,
    plan_name: planName,
    billing_cycle: billingCycle,
    amount: price,
    status: "pending",
    payment_type: null,
    snap_token: snapRes.token,
    snap_redirect_url: snapRes.redirect_url,
    midtrans_response: snapRes,
  });
  if (paymentInsertErr) {
    console.error("[Payments] Gagal menyimpan payment record:", paymentInsertErr.message);
    return c.json(
      { error: "Gagal mencatat transaksi. Coba lagi beberapa saat." },
      500,
    );
  }

  // Return snap token + client key yang SESUAI mode backend ke frontend.
  // Client key wajib dari env yang sama dengan server key — kalau frontend
  // pakai key sandbox untuk token production (atau sebaliknya), Snap popup
  // error "couldn't find your transaction".
  return c.json({
    snap_token: snapRes.token,
    redirect_url: snapRes.redirect_url,
    order_id: orderId,
    client_key: process.env.MIDTRANS_CLIENT_KEY || "",
    is_production: isMidtransProduction,
  });
});

// ════════════════════════════════════════════════════════════════════════
// Helper — Aktivasi subscription dari pembayaran yang sukses
// ════════════════════════════════════════════════════════════════════════
// Dipakai webhook Midtrans (sumber kebenaran production) dan test-complete
// (sandbox). Selalu pakai plan_name + billing_cycle dari PAYMENT RECORD
// (yang dibayar), bukan plan lama user.
async function activateSubscription(payment: {
  id: string;
  user_id: string;
  plan_name: string | null;
  billing_cycle: string | null;
}): Promise<{ planName: string }> {
  const planName = payment.plan_name ?? "pro";
  const cycle: BillingCycle = payment.billing_cycle === "yearly" ? "yearly" : "monthly";

  // Cari plan yang DIBAYAR
  const { data: plan, error: planErr } = await supabase
    .from("plans")
    .select("id, name")
    .eq("name", planName)
    .single();
  if (planErr || !plan) {
    throw new Error(`Plan "${planName}" tidak ditemukan di database`);
  }

  const now = new Date();
  const periodDays = cycle === "yearly" ? 365 : 30;
  const periodEnd = new Date(Date.now() + periodDays * 86400000);

  // Upsert subscription user
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", payment.user_id)
    .maybeSingle();

  let subscriptionId: string;
  if (existing) {
    const { error: updErr } = await supabase
      .from("subscriptions")
      .update({
        plan_id: plan.id,
        status: "active",
        billing_cycle: cycle,
        trial_start: null,
        trial_end: null,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .eq("id", existing.id);
    if (updErr) throw new Error(`Gagal update subscription: ${updErr.message}`);
    subscriptionId = existing.id;
  } else {
    const { data: created, error: insErr } = await supabase
      .from("subscriptions")
      .insert({
        user_id: payment.user_id,
        plan_id: plan.id,
        status: "active",
        billing_cycle: cycle,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .select("id")
      .single();
    if (insErr || !created) throw new Error(`Gagal membuat subscription: ${insErr?.message}`);
    subscriptionId = created.id;
  }

  // Tandai payment paid + tautkan subscription
  const { error: payErr } = await supabase
    .from("payments")
    .update({
      status: "paid",
      paid_at: now.toISOString(),
      subscription_id: subscriptionId,
    })
    .eq("id", payment.id);
  if (payErr) throw new Error(`Gagal update payment: ${payErr.message}`);

  return { planName: plan.name };
}

// ════════════════════════════════════════════════════════════════════════
// POST /webhook — Midtrans HTTP Notification (sumber kebenaran pembayaran)
// ════════════════════════════════════════════════════════════════════════
// Konfigurasi di Midtrans Dashboard → Settings → Configuration:
//   Payment Notification URL: https://<backend>/api/payments/webhook
// Verifikasi signature: sha512(order_id + status_code + gross_amount + serverKey)
// ════════════════════════════════════════════════════════════════════════
payments.post("/webhook", async (c) => {
  try {
    const body = await c.req.json();
    const orderId: string = body.order_id;
    const statusCode: string = String(body.status_code ?? "");
    const grossAmount: string = String(body.gross_amount ?? "");
    const signatureKey: string = String(body.signature_key ?? "");
    const transactionStatus: string = String(body.transaction_status ?? "");
    const fraudStatus: string = String(body.fraud_status ?? "clean");
    const paymentType: string | null = body.payment_type ?? null;
    const transactionId: string | null = body.transaction_id ?? null;

    if (!orderId) return c.json({ error: "order_id wajib ada" }, 400);

    // Verifikasi signature — tolak notifikasi palsu
    if (!verifySignature(
      orderId,
      statusCode,
      grossAmount,
      process.env.MIDTRANS_SERVER_KEY || "",
      signatureKey,
    )) {
      console.error("[Webhook] Invalid signature untuk order:", orderId);
      return c.json({ error: "Invalid signature" }, 403);
    }

    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .select("id, user_id, status, plan_name, billing_cycle, amount")
      .eq("order_id", orderId)
      .maybeSingle();
    if (payErr) return dbErrorResponse(c, payErr);
    if (!payment) {
      // Record tak ada: sebelumnya ini terjadi karena insert subscribe gagal
      // (schema lama). Jangan balas 404 biar Midtrans tak retry selamanya.
      console.error("[Webhook] Payment record tidak ditemukan:", orderId);
      return c.json({ received: true, warning: "payment record not found" }, 200);
    }

    // Idempoten: webhook bisa dikirim Midtrans lebih dari sekali
    if (payment.status === "paid" || payment.status === "refunded") {
      return c.json({ received: true, note: "already processed" });
    }

    const isSuccess =
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" && fraudStatus === "accept");

    if (isSuccess) {
      const { planName } = await activateSubscription(payment);

      // Notifikasi (fire-and-forget, jangan blokir respon webhook)
      createNotification({
        userId: payment.user_id,
        title: "Pembayaran Berhasil",
        message: `Langganan ${planName.toUpperCase()} (${payment.billing_cycle}) kamu sudah aktif. Selamat bertransaksi!`,
        type: "payment_success",
      }).catch(console.error);
    } else if (transactionStatus === "expire") {
      await supabase.from("payments").update({ status: "expired" }).eq("id", payment.id);
    } else if (transactionStatus === "cancel" || transactionStatus === "deny") {
      await supabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
    }

    return c.json({ received: true });
  } catch (err: any) {
    console.error("[Webhook] Error:", err?.message ?? err);
    return c.json({ error: "Internal error" }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════
// POST /sync-status — Sinkronkan status pembayaran langsung ke Midtrans
// ════════════════════════════════════════════════════════════════════════
// Failsafe bila webhook belum terkonfigurasi / terlewat: frontend panggil
// ini saat halaman result dibuka. Backend cek status transaksi ke Midtrans
// (snap.status) dan mengaktifkan subscription bila ternyata sudah dibayar.
// Aman: hanya pemilik order (auth) & hanya mengaktifkan payment miliknya.
// ════════════════════════════════════════════════════════════════════════
payments.post("/sync-status", authMiddleware, async (c) => {
  const userId = c.get("user").sub;
  const { order_id } = await c.req.json();
  if (!order_id) return c.json({ error: "order_id wajib diisi" }, 400);

  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .select("id, user_id, status, plan_name, billing_cycle, snap_token")
    .eq("order_id", order_id)
    .maybeSingle();
  if (payErr) return dbErrorResponse(c, payErr);

  // 404 generik: jangan bocorkan keberadaan order milik user lain
  if (!payment || payment.user_id !== userId) {
    return c.json({ error: "Payment tidak ditemukan" }, 404);
  }

  if (payment.status === "paid") {
    return c.json({ synced: true, payment_status: "paid", activated: false });
  }

  // Tanya status terkini ke Midtrans (butuh token yang disimpan saat checkout)
  if (!payment.snap_token) {
    return c.json({ synced: false, payment_status: payment.status, activated: false });
  }
  let trx: any = null;
  try {
    trx = await snap.transaction.status(payment.snap_token);
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    // Token tidak dikenal Midtrans → kemungkinan besar mismatch environment
    // (token dibuat di mode berbeda dengan yang ditanya). Lapor jelas.
    if (/404|not found|not found/i.test(msg)) {
      return c.json(
        {
          synced: false,
          payment_status: payment.status,
          activated: false,
          midtrans_known: false,
        },
        200,
      );
    }
    return c.json(
      { error: "Gagal mengecek status ke Midtrans: " + msg },
      502,
    );
  }

  const transactionStatus = String(trx?.transaction_status ?? "");
  const fraudStatus = String(trx?.fraud_status ?? "clean");
  const isSuccess =
    transactionStatus === "settlement" ||
    (transactionStatus === "capture" && fraudStatus === "accept");

  if (!isSuccess) {
    return c.json({
      synced: true,
      payment_status: transactionStatus || payment.status,
      activated: false,
    });
  }

  // Sudah dibayar di Midtrans → aktivasi sekarang (idempoten via status check)
  try {
    const { planName } = await activateSubscription(payment);
    createNotification({
      userId: payment.user_id,
      title: "Pembayaran Berhasil",
      message: `Langganan ${planName.toUpperCase()} (${payment.billing_cycle}) kamu sudah aktif. Selamat bertransaksi!`,
      type: "payment_success",
    }).catch(console.error);
    return c.json({
      synced: true,
      payment_status: "paid",
      activated: true,
      plan: planName,
    });
  } catch (err: any) {
    console.error("[sync-status] Aktivasi gagal:", err?.message);
    return c.json({ error: err?.message ?? "Gagal aktivasi subscription" }, 500);
  }
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

  // Cari payment record berdasarkan order_id (serta plan & cycle yang dibayar)
  const { data: payment, error: paymentErr } = await supabase
    .from("payments")
    .select("id, user_id, status, plan_name, billing_cycle")
    .eq("order_id", order_id)
    .maybeSingle();

  if (paymentErr) return dbErrorResponse(c, paymentErr);
  if (!payment) {
    return c.json(
      { error: "Payment tidak ditemukan. Coba checkout ulang — transaksi lama gagal tercatat di server." },
      404,
    );
  }

  // Cek apakah payment sudah completed
  if (payment.status === "paid") {
    return c.json({
      status: "ok",
      message: "Pembayaran sudah selesai",
      subscription_status: "active",
    });
  }

  // Aktivasi subscription sesuai plan & billing cycle yang DIBAYAR
  // (pro monthly = 30 hari, pro yearly = 365 hari, dst.)
  let activatedPlan: string;
  try {
    activatedPlan = (await activateSubscription(payment)).planName;
  } catch (err: any) {
    console.error("[test-complete] Aktivasi gagal:", err?.message);
    return c.json({ error: err?.message ?? "Gagal aktivasi subscription" }, 500);
  }

  return c.json({
    status: "ok",
    message: "Pembayaran simulasi berhasil",
    subscription_status: "active",
    plan_id: activatedPlan,
    billing_cycle: payment.billing_cycle ?? "monthly",
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
  const planFeatures: string[] = normalizeFeatures(sub.plans?.features);

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
  // Map kanonik plan-minimum per fitur (satu sumber kebenaran, sinkron dengan seed plans).
  // Trial aktif memberi akses 4 fitur inti laporan via trialCoreFeatures di
  // atas — peta ini hanya dipakai saat akses DITOLAK, jadi isinya plan
  // berbayar yang sebenarnya dibutuhkan (pro untuk laporan & export PDF).
  const FEATURE_MIN_PLAN: Record<string, string> = {
    income_statement: "pro",
    balance_sheet: "pro",
    cash_flow: "pro",
    export_pdf: "pro",
    multi_company: "pro",
    ai_cfo: "pro",
    priority_support: "pro",
    export_csv: "enterprise",
    multi_user: "enterprise",
    api_access: "enterprise",
    custom_reports: "enterprise",
    dedicated_support: "enterprise",
    audit_trail: "enterprise",
  };
  let requiredPlan: string | null = null;
  if (feature && !hasAccess) {
    requiredPlan = FEATURE_MIN_PLAN[feature] ?? "pro";
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