// ============================================================================
// LEDGERFLOW - Payment Routes (Midtrans Integration)
// ============================================================================
// File ini handle semua route yang berhubungan sama pembayaran & subscription:
//   - GET  /plans          → Ambil daftar semua plan yang tersedia
//   - GET  /is-sandbox     → Cek apakah lagi jalan di mode sandbox/test
//   - GET  /subscription   → Ambil data subscription user yang login
//   - POST /subscribe      → Buat transaksi pembayaran & dapet Snap token
//   - POST /test-complete  → Force-complete pembayaran pending (sandbox only)
//   - POST /webhook        → Terima notifikasi pembayaran dari Midtrans
//   - GET  /history        → Ambil riwayat pembayaran user
//   - POST /cancel         → Cancel subscription user
//   - GET  /check-access   → Cek apakah user bisa akses fitur tertentu
// ============================================================================

import { Hono } from "hono"; // Framework web ringan buat bikin API routes
import { supabase } from "../lib/supabase.js"; // Client Supabase buat akses database
import {
  snap, // Midtrans Snap API — buat bikin transaksi payment popup
  coreApi, // Midtrans Core API — buat approve/cancel transaksi langsung
  generateOrderId, // Helper buat bikin order ID unik (format: LF-{userId}-{timestamp}-{random})
  verifySignature, // Helper buat verifikasi signature webhook dari Midtrans (pencegahan fraud)
  getPlanPrice, // Helper buat ambil harga plan berdasarkan nama & billing cycle
  type PlanName, // Type: "free" | "pro" | "enterprise"
  type BillingCycle, // Type: "monthly" | "yearly"
} from "../lib/midtrans.js";

// Inisialisasi router Hono buat prefix /api/payments
const payments = new Hono();

// ═══════════════════════════════════════════════════════════════════════
// GET /plans — Ambil daftar semua plan yang tersedia
// ═══════════════════════════════════════════════════════════════════════
// Dipake frontend buat nampilin pricing page (card Free, Pro, Enterprise)
// ═══════════════════════════════════════════════════════════════════════
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
  if (error) return c.json({ error: error.message }, 500);

  // Kalau sukses, return data plans (array of plan objects)
  return c.json(data);
});

// ═══════════════════════════════════════════════════════════════════════
// GET /is-sandbox — Cek apakah lagi jalan di mode sandbox/test
// ═══════════════════════════════════════════════════════════════════════
// Frontend manggil ini buat nentuin:
//   - Apakah harus auto-complete payment pas onPending
//   - Apakah tombol "Simulasi Bayar Berhasil" harus ditampilin
//   - Apakah lagi development atau udah production
// ═══════════════════════════════════════════════════════════════════════
payments.get("/is-sandbox", async (c) => {
  // Cek env var: kalau MIDTRANS_IS_PRODUCTION BUKAN "true", berarti lagi sandbox
  // Default-nya sandbox (karena env var biasanya belum diset pas development)
  const isSandbox = process.env.MIDTRANS_IS_PRODUCTION !== "true";

  // Return boolean ke frontend
  return c.json({ is_sandbox: isSandbox });
});

// ═══════════════════════════════════════════════════════════════════════
// GET /subscription — Ambil data subscription user yang login
// ═══════════════════════════════════════════════════════════════════════
// Dipake frontend buat:
//   - Nampilin badge plan di navbar (Free / Pro / Enterprise)
//   - Nampilin trial banner & sisa hari trial
//   - Nentuin apakah user bisa akses fitur tertentu
//   - Nampilin info subscription di halaman settings
// ═══════════════════════════════════════════════════════════════════════
payments.get("/subscription", async (c) => {
  // Ambil user ID dari header (dikirim oleh middleware auth di frontend)
  // Format: x-user-id: "uuid-user-dari-supabase-auth"
  const userId = c.req.header("x-user-id");

  // Kalau gak ada user ID, berarti user belum login → return 401 Unauthorized
  if (!userId) return c.json({ error: "User ID required" }, 401);

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

  // Kalau query gagal (error database), log & return 500
  if (error) {
    console.error("[Payments] Subscription fetch error:", error);
    return c.json({ error: error.message }, 500);
  }

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
      `,
      )
      .single();

    // Kalau gagal insert, log error & return 500
    if (insertErr) {
      console.error("[Payments] Auto-create subscription error:", insertErr);
      return c.json({ error: insertErr.message }, 500);
    }

    // Return subscription baru + info tambahan:
    //   - is_active: true       → subscription aktif (lagi trial)
    //   - trial_days_left: 15   → sisa 15 hari trial
    //   - is_trial: true        → ini subscription trial, bukan berbayar
    return c.json({
      ...newSub,
      is_active: true,
      trial_days_left: 15,
      is_trial: true,
    });
  }

  // ─── Kalau user udah punya subscription, hitung info tambahan ──────

  // Hitung sisa hari trial (kalau masih trial)
  const now = new Date(); // Tanggal sekarang
  const trialEnd = data.trial_end ? new Date(data.trial_end) : null; // Tanggal trial berakhir
  const trialDaysLeft = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000)) // Selisih dalam hari, minimal 0
    : 0; // Kalau gak ada trial_end, berarti 0 hari

  // Cek apakah subscription masih aktif:
  // Aktif kalau:
  //   1. Status "trialing" DAN trial belum expired, ATAU
  //   2. Status "active" DAN periode berlangganan belum habis
  const isActive =
    (data.status === "trialing" && trialEnd && trialEnd > now) ||
    (data.status === "active" &&
      data.current_period_end &&
      new Date(data.current_period_end) > now);

  // Return data subscription + info tambahan
  return c.json({
    ...data,
    is_active: isActive, // Apakah subscription masih berlaku
    trial_days_left: trialDaysLeft, // Sisa hari trial
    is_trial: data.status === "trialing", // Apakah lagi masa trial
  });
});

// ═══════════════════════════════════════════════════════════════════════
// POST /subscribe — Buat transaksi pembayaran & dapet Midtrans Snap token
// ═══════════════════════════════════════════════════════════════════════
// Ini endpoint utama yang dipanggil pas user klik "Upgrade Sekarang"
// Alurnya:
//   1. Validasi input (plan & billing cycle)
//   2. Ambil data user dari DB
//   3. Ambil data plan dari DB
//   4. Generate order ID unik
//   5. Buat transaksi di Midtrans → dapet Snap token
//   6. Get/create subscription record
//   7. Simpan payment record ke DB (status: pending)
//   8. Return Snap token ke frontend → frontend buka popup Snap
// ═══════════════════════════════════════════════════════════════════════
payments.post("/subscribe", async (c) => {
  // Ambil user ID dari header auth
  const userId = c.req.header("x-user-id");
  if (!userId) return c.json({ error: "User ID required" }, 401);

  // Parse body request dari frontend
  // Contoh body: { "plan_name": "pro", "billing_cycle": "monthly" }
  const body = await c.req.json();
  const { plan_name, billing_cycle = "monthly" } = body as {
    plan_name: PlanName;
    billing_cycle?: BillingCycle;
  };

  // Validasi: cuma plan "pro" dan "enterprise" yang bisa di-subscribe
  // (plan "free" gak perlu bayar, jadi gak boleh masuk sini)
  if (!["pro", "enterprise"].includes(plan_name)) {
    return c.json({ error: "Invalid plan. Choose 'pro' or 'enterprise'" }, 400);
  }

  // Ambil harga plan dari konfigurasi di midtrans.ts
  // Contoh: getPlanPrice("pro", "monthly") → 99000
  const amount = getPlanPrice(plan_name, billing_cycle);

  // Validasi: harga harus lebih dari 0 (kalau 0 berarti kombinasi plan/cycle gak valid)
  if (amount <= 0) {
    return c.json({ error: "Invalid plan/billing combination" }, 400);
  }

  try {
    // ─── STEP 1: Ambil data user dari database ────────────────────────
    // Butuh nama & email buat ditampilin di halaman pembayaran Midtrans
    const { data: userData } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", userId)
      .single();

    // Kalau user gak ditemukan di DB, return 404
    if (!userData) {
      return c.json({ error: "User not found" }, 404);
    }

    // ─── STEP 2: Ambil data plan dari database ────────────────────────
    // Butuh plan ID & display name buat Midtrans & payment record
    const { data: plan } = await supabase
      .from("plans")
      .select("id, display_name")
      .eq("name", plan_name)
      .single();

    // Kalau plan gak ditemukan di DB, return 404
    if (!plan) return c.json({ error: "Plan not found" }, 404);

    // ─── STEP 3: Generate order ID unik ───────────────────────────────
    // Format: LF-{userId 8 char}-{timestamp}-{random 6 char}
    // Contoh: LF-a1b2c3d4-1703123456789-x9k2m1
    // Ini penting biar setiap transaksi punya ID unik (Midtrans butuh ini)
    const orderId = generateOrderId(userId);

    // ─── STEP 4: Buat transaksi di Midtrans Snap ──────────────────────
    // Label buat ditampilin di halaman pembayaran Midtrans
    // "Bulanan" kalau monthly, "Tahunan" kalau yearly
    const cycleLabel = billing_cycle === "yearly" ? "Tahunan" : "Bulanan";

    // Parameter yang dikirim ke Midtrans Snap API
    // Ini yang nentuin apa yang muncul di popup pembayaran
    const snapParameter = {
      // Detail transaksi — WAJIB ada di setiap transaksi Midtrans
      transaction_details: {
        order_id: orderId, // ID unik transaksi (harus unik per transaksi)
        gross_amount: amount, // Total jumlah yang harus dibayar (dalam IDR, tanpa desimal)
      },
      // Detail item — nampilin di halaman pembayaran Midtrans
      // User bisa lihat "Ah mau bayar LedgerFlow Pro - Bulanan seharga Rp99.000"
      item_details: [
        {
          id: plan_name, // ID item (nama plan)
          price: amount, // Harga per item
          quantity: 1, // Jumlah item (selalu 1 karena subscription)
          name: `LedgerFlow ${plan.display_name} - ${cycleLabel}`, // Nama yang ditampilin
          category: "subscription", // Kategori item
        },
      ],
      // Detail customer — nampilin info pembayar di halaman Midtrans
      customer_details: {
        first_name: userData.name || "User", // Nama user (fallback ke "User" kalau null)
        email: userData.email || "", // Email user (buat notifikasi pembayaran)
      },
      // Konfigurasi credit card
      credit_card: {
        secure: true, // Aktifkan 3DS (verifikasi tambahan kartu kredit) — WAJIB untuk Indonesia
        save_card: true, // Simpan kartu buat pembayaran berikutnya (tokenisasi)
      },
      // Callback URLs — kemana user di-redirect setelah selesai pembayaran
      // Midtrans akan redirect user ke URL ini sesuai status pembayaran
      callbacks: {
        finish: `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment/success?order_id=${orderId}`, // Setelah selesai (sukses/pending)
        error: `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment/failed?order_id=${orderId}`, // Kalau error
        pending: `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment/pending?order_id=${orderId}`, // Kalau pending (belum bayar)
      },
    };

    // Log info transaksi sebelum kirim ke Midtrans (buat debugging)
    console.log("[Payments] Creating Snap transaction...", {
      orderId,
      amount,
      plan_name,
    });

    // Kirim parameter ke Midtrans Snap API → bikin transaksi
    // Response berisi:
    //   - token: Snap token yang dipake frontend buka popup (string panjang)
    //   - redirect_url: URL kalau mau redirect langsung (alternatif popup)
    const snapResponse = await snap.createTransaction(snapParameter);

    // Log response buat debugging (cek apakah dapet token & redirect URL)
    console.log("[Payments] Snap response received:", {
      hasToken: !!snapResponse.token,
      hasRedirect: !!snapResponse.redirect_url,
    });

    // ─── STEP 5: Get atau create subscription record ──────────────────
    // Cek apakah user udah punya subscription sebelumnya
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    // Variable buat nyimpen subscription ID (dipake buat payment record)
    let subscriptionId: string;

    if (existingSub) {
      // Kalau user udah punya subscription (misal dari free plan / trial),
      // PAKAI subscription yang udah ada — JANGAN update plan disini!
      // Plan baru di-update SETELAH pembayaran berhasil (via webhook atau test-complete)
      // Kenapa? Kalau di-update sekarang, user bisa langung akses fitur Pro
      // sebelum bayar — itu bocor!
      subscriptionId = existingSub.id;
    } else {
      // Kalau user belum punya subscription sama sekali (edge case),
      // Buat subscription baru dengan status "trialing"
      // (ini jarang terjadi karena GET /subscription auto-create)
      const { data: newSub, error: insertErr } = await supabase
        .from("subscriptions")
        .insert({
          user_id: userId,
          plan_id: plan.id, // Sementara set ke plan yang dibeli
          billing_cycle, // monthly atau yearly
          status: "trialing", // Status awal trial
          trial_start: new Date().toISOString(),
          trial_end: new Date(Date.now() + 15 * 86400000).toISOString(), // 15 hari trial
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(
            Date.now() + 15 * 86400000,
          ).toISOString(),
        })
        .select("id")
        .single();

      // Kalau gagal insert subscription, return error
      if (insertErr || !newSub) {
        console.error("[Payments] Insert subscription error:", insertErr);
        return c.json({ error: "Failed to create subscription" }, 500);
      }
      subscriptionId = newSub.id;
    }

    // ─── STEP 6: Simpan payment record ke database ────────────────────
    // Ini penting buat tracking status pembayaran
    // Di dalam midtrans_response, kita simpan:
    //   - pending_plan_id       → ID plan yang MAU dibeli (belum aktif, nunggu bayar)
    //   - pending_billing_cycle → billing cycle yang dipilih
    // Kenapa disimpan di midtrans_response? Karena nanti webhook/test-complete
    // butuh info ini buat update subscription ke plan yang benar setelah bayar
    const { error: paymentErr } = await supabase.from("payments").insert({
      subscription_id: subscriptionId, // FK ke tabel subscriptions
      user_id: userId, // FK ke tabel users
      order_id: orderId, // ID unik transaksi (dari generateOrderId)
      amount, // Jumlah yang harus dibayar
      status: "pending", // Status awal: menunggu pembayaran
      snap_token: snapResponse.token, // Snap token buat buka popup
      snap_redirect_url: snapResponse.redirect_url, // URL redirect kalau gak pake popup
      midtrans_response: {
        // Simpan info plan yang mau dibeli
        pending_plan_id: plan.id, // ID plan yang dibeli (disimpan dulu, belum di-apply)
        pending_billing_cycle: billing_cycle, // Billing cycle yang dipilih
      },
    });

    // Kalau gagal insert payment, log error tapi GAK return error
    // Kenapa? Karena transaksi Midtrans udah kebuat, kita tetep return token
    // Payment record gak kesimpen itu masalah minor, user tetap bisa bayar
    if (paymentErr) {
      console.error("[Payments] Insert payment error:", paymentErr);
    }

    // Log sukses
    console.log(`[Payments] Snap token created for order ${orderId}`);

    // Return Snap token & info ke frontend
    // Frontend bakal pake snap_token buat buka popup Midtrans Snap
    return c.json({
      snap_token: snapResponse.token, // Token buat buka popup pembayaran
      redirect_url: snapResponse.redirect_url, // URL alternatif (redirect langsung)
      order_id: orderId, // Order ID buat tracking
    });
  } catch (err: any) {
    // Catch semua error yang gak terduga (misal Midtrans API down, dll)
    console.error("[Payments] Subscribe error:", err?.message || err);
    return c.json({ error: err?.message || "Failed to create payment" }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// POST /test-complete — Force-complete pembayaran pending (SANDBOX ONLY)
// ═══════════════════════════════════════════════════════════════════════
// KENAPA ENDPOINT INI DIBUTUHKAN?
// ──────────────────────────────────────────────────────────────────────
// Di Midtrans Sandbox, pembayaran via Virtual Account / Bank Transfer
// statusnya tetap "pending" selamanya karena:
//   1. Gak ada orang yang beneran transfer ke VA sandbox
//   2. Webhook "settlement" gak pernah fire di sandbox
//   3. Jadi subscription gak pernah aktif → user stuck di pending
//
// Endpoint ini SIMULASI pembayaran berhasil biar di sandbox kita bisa
// test full flow upgrade tanpa nunggu webhook yang gak pernah datang.
//
// KEAMANAN:
//   - Hanya jalan kalau MIDTRANS_IS_PRODUCTION BUKAN "true"
//   - Kalau production, return 403 Forbidden
//   - Hanya bisa complete payment yang statusnya "pending"
//
// YANG DILAKUKAN ENDPOINT INI:
//   1. Cek apakah sandbox → kalau production, block
//   2. Cari payment record berdasarkan order_id
//   3. Cek status payment harus "pending"
//   4. Coba approve via Midtrans Core API (opsional)
//   5. Update payment status → "paid"
//   6. Update subscription → "active" + plan sesuai yang dibeli
// ═══════════════════════════════════════════════════════════════════════
payments.post("/test-complete", async (c) => {
  // ─── GUARD: Hanya boleh jalan di sandbox ────────────────────────────
  // Cek env var: kalau MIDTRANS_IS_PRODUCTION === "true", berarti production
  // Endpoint ini BAHAYA kalau bisa diakses di production — orang bisa
  // bayar gratis tanpa bayar beneran! Jadi harus di-block.
  if (process.env.MIDTRANS_IS_PRODUCTION === "true") {
    return c.json(
      { error: "This endpoint is not available in production" },
      403,
    );
  }

  try {
    // Parse body request dari frontend
    // Contoh body: { "order_id": "LF-a1b2c3d4-1703123456789-x9k2m1" }
    const { order_id } = (await c.req.json()) as { order_id: string };

    // Validasi: order_id wajib ada
    if (!order_id) {
      return c.json({ error: "order_id is required" }, 400);
    }

    // ─── STEP 1: Cari payment record di database ──────────────────────
    // Query ke tabel "payments" + join tabel "subscriptions" buat dapet info subscription
    // Ini penting karena kita butuh subscription_id buat update subscription nanti
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*, subscriptions(id, user_id, plan_id, billing_cycle)") // Ambil payment + data subscription terkait
      .eq("order_id", order_id) // Filter by order ID yang dikirim frontend
      .single(); // Harus cuma 1 record (order ID unik)

    // Kalau payment gak ditemukan, return 404
    if (paymentError || !payment) {
      console.error("[Test-Complete] Payment not found:", order_id);
      return c.json({ error: "Payment not found" }, 404);
    }

    // ─── STEP 2: Cek status payment harus "pending" ───────────────────
    // Hanya payment yang BELUM dibayar (pending) yang bisa di-force complete
    // Kalau udah "paid", "failed", dll → gak boleh di-complete lagi
    // Ini buat mencegah double-activate atau modify payment yang udah final
    if (payment.status !== "pending") {
      return c.json(
        {
          error: `Payment status is '${payment.status}', only 'pending' payments can be test-completed`,
          current_status: payment.status,
        },
        400,
      );
    }

    // ─── STEP 3: Coba approve transaksi via Midtrans Core API ─────────
    // Ini optional — kalau transaksi Midtrans statusnya "challenge" (fraud check),
    // kita approve supaya Midtrans juga update status-nya
    // Kalau gagal (misal transaksi bukan challenge), gak masalah — kita tetap
    // force-complete di database kita
    try {
      // Panggil Midtrans Core API: transaction.approve()
      // Ini bilang ke Midtrans: "iya transaksi ini oke, approve aja"
      await coreApi.transaction.approve(order_id);
      console.log(`[Test-Complete] Midtrans approve called for ${order_id}`);
    } catch (approveErr: any) {
      // Kalau approve gagal (misal transaksi udah settle atau bukan challenge),
      // itu gak masalah — kita tetap update database kita sendiri
      console.log(
        `[Test-Complete] Approve call skipped: ${approveErr?.message || approveErr}`,
      );
    }

    // ─── STEP 4: Update payment status ke "paid" ──────────────────────
    // Update record di tabel payments:
    //   - status                    → "paid" (dari "pending")
    //   - payment_type              → metode pembayaran (kalau gak ada, set "test_simulation")
    //   - midtrans_transaction_id   → ID transaksi dari Midtrans (kalau gak ada, generate placeholder)
    //   - paid_at                   → timestamp kapan dibayar (sekarang)
    //   - updated_at                → timestamp update (sekarang)
    const { error: updatePaymentErr } = await supabase
      .from("payments")
      .update({
        status: "paid",
        payment_type: payment.payment_type || "test_simulation",
        midtrans_transaction_id:
          payment.midtrans_transaction_id || `TEST-${order_id}`,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", order_id); // Filter by order ID

    // Kalau gagal update payment, return error
    if (updatePaymentErr) {
      console.error("[Test-Complete] Update payment error:", updatePaymentErr);
      return c.json({ error: "Failed to update payment" }, 500);
    }

    // ─── STEP 5: Aktifkan subscription (sama kayak webhook "paid") ────
    // Ambil data subscription dari payment record yang udah di-query tadi
    const sub = payment.subscriptions;

    // Ambil plan ID & billing cycle yang disimpan saat subscribe
    // Kenapa dari midtrans_response? Karena saat subscribe kita simpan
    // pending_plan_id di midtrans_response — ini plan yang MAU dibeli user
    // (belum di-apply ke subscription, nunggu bayar)
    const pendingPlanId =
      payment.midtrans_response?.pending_plan_id || sub.plan_id; // Fallback ke plan_id subscription
    const pendingBillingCycle =
      payment.midtrans_response?.pending_billing_cycle || // Dari payment record
      sub.billing_cycle || // Fallback ke billing cycle subscription
      "monthly"; // Default monthly

    // Hitung durasi periode subscription:
    //   - yearly  → 365 hari
    //   - monthly → 30 hari
    const periodDays = pendingBillingCycle === "yearly" ? 365 : 30;

    // Hitung tanggal berakhirnya periode (sekarang + durasi)
    const periodEnd = new Date(
      Date.now() + periodDays * 86400000,
    ).toISOString();

    // Data yang mau di-update di tabel subscriptions:
    const updateData: Record<string, any> = {
      status: "active", // Status diubah dari "trialing" ke "active" (sudah berbayar)
      plan_id: pendingPlanId, // Update plan ke plan yang dibeli (misal dari free → pro)
      billing_cycle: pendingBillingCycle, // Set billing cycle (monthly/yearly)
      current_period_start: new Date().toISOString(), // Periode mulai hari ini
      current_period_end: periodEnd, // Periode berakhir N hari ke depan
      updated_at: new Date().toISOString(), // Timestamp update
    };

    // Update subscription di database
    const { error: updateSubErr } = await supabase
      .from("subscriptions")
      .update(updateData)
      .eq("id", sub.id); // Filter by subscription ID

    // Kalau gagal update subscription, return error
    if (updateSubErr) {
      console.error("[Test-Complete] Update subscription error:", updateSubErr);
      return c.json({ error: "Failed to activate subscription" }, 500);
    }

    // Log sukses — ini penting buat debugging
    console.log(
      `[Test-Complete] ✅ Subscription activated for user ${sub.user_id}, plan: ${pendingPlanId}`,
    );

    // Return response sukses ke frontend
    return c.json({
      status: "ok", // Status operasi
      message: "Payment completed & subscription activated (test mode)", // Pesan deskriptif
      subscription_status: "active", // Status subscription sekarang
      plan_id: pendingPlanId, // Plan ID yang aktif
    });
  } catch (err: any) {
    // Catch error yang gak terduga
    console.error("[Test-Complete] Error:", err);
    return c.json({ error: err?.message || "Test-complete failed" }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// POST /webhook — Terima notifikasi pembayaran dari Midtrans
// ═══════════════════════════════════════════════════════════════════════
// Ini endpoint yang dipanggil OLEH MIDTRANS (bukan frontend) setiap kali
// ada perubahan status transaksi. Midtrans ngirim POST request ke sini.
//
// CONTOH SKENARIO:
//   1. User bayar pake GoPay → Midtrans kirim webhook "settlement"
//   2. User bayar pake VA BCA → setelah transfer, Midtrans kirim "settlement"
//   3. Pembayaran gagal → Midtrans kirim "deny" atau "cancel"
//   4. Pembayaran expired (24 jam belum bayar) → Midtrans kirim "expire"
//
// YANG DILAKUKAN WEBHOOK INI:
//   1. Verifikasi signature (pencegahan fake webhook / fraud)
//   2. Cari payment record di database
//   3. Mapping status Midtrans → status internal kita
//   4. Update payment record
//   5. Kalau "paid" → aktifkan subscription
//   6. Kalau "failed/expired" → set subscription ke "past_due"
// ═══════════════════════════════════════════════════════════════════════
payments.post("/webhook", async (c) => {
  try {
    // Parse body notification dari Midtrans
    // Body berisi: order_id, transaction_status, fraud_status, payment_type,
    //              status_code, gross_amount, signature_key, dll
    const notification = await c.req.json();

    // Log notifikasi buat debugging — penting banget buat troubleshoot
    // masalah webhook di production nanti
    console.log("[Midtrans Webhook] Received:", {
      order_id: notification.order_id, // ID transaksi
      transaction_status: notification.transaction_status, // Status dari Midtrans
      fraud_status: notification.fraud_status, // Status fraud check
      payment_type: notification.payment_type, // Metode pembayaran
    });

    // ─── Verifikasi signature keamanan ────────────────────────────────
    // Ini PENTING BANGET buat mencegah orang nakal yang kirim fake webhook
    // Signature = SHA512(order_id + status_code + gross_amount + server_key)
    // Kalau signature gak cocok, berarti webhook ini PALSU → tolak!
    const isValid = verifySignature(
      notification.order_id, // Order ID transaksi
      notification.status_code, // Status code dari Midtrans (200, 201, dll)
      notification.gross_amount, // Jumlah pembayaran
      process.env.MIDTRANS_SERVER_KEY || "", // Server key kita (rahasia!)
      notification.signature_key, // Signature yang dikirim Midtrans
    );

    // Kalau signature gak valid, tolak webhook — ini kemungkinan serangan
    if (!isValid) {
      console.error("[Midtrans Webhook] Invalid signature!");
      return c.json({ error: "Invalid signature" }, 403);
    }

    // ─── Cari payment record di database ──────────────────────────────
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*, subscriptions(id, user_id, plan_id, billing_cycle)") // Join subscription
      .eq("order_id", notification.order_id) // Filter by order ID
      .single(); // Harus 1 record

    // Kalau payment gak ditemukan, bisa jadi order_id salah atau belum ke-save
    if (paymentError || !payment) {
      console.error(
        "[Midtrans Webhook] Payment not found:",
        notification.order_id,
      );
      return c.json({ error: "Payment not found" }, 404);
    }

    // ─── Mapping status Midtrans → status internal ────────────────────
    // Midtrans punya beberapa status transaksi:
    //   - capture    → Kartu kredit di-capture (butuh fraud check)
    //   - settlement → Pembayaran sukses, uang udah masuk
    //   - pending    → Menunggu pembayaran
    //   - cancel     → Dibatalkan
    //   - deny       → Ditolak (fraud, saldo kurang, dll)
    //   - expire     → Kadaluarsa (24 jam belum bayar)
    //   - refund     → Uang dikembalikan
    const transactionStatus = notification.transaction_status; // Status dari Midtrans
    const fraudStatus = notification.fraud_status; // Status fraud (hanya untuk CC)
    let paymentStatus: string; // Status internal kita (paid/pending/failed/expired/refunded)

    // Mapping logic:
    if (transactionStatus === "capture") {
      // Capture = kartu kredit di-capture
      // Kalau fraud_status "accept" → pembayaran aman, dianggap paid
      // Kalau fraud_status bukan "accept" → kemungkinan fraud, dianggap failed
      paymentStatus = fraudStatus === "accept" ? "paid" : "failed";
    } else if (transactionStatus === "settlement") {
      // Settlement = pembayaran sukses, uang udah settlement
      // Ini status yang paling umum buat pembayaran yang berhasil
      paymentStatus = "paid";
    } else if (["cancel", "deny", "expire"].includes(transactionStatus)) {
      // Cancel/Deny/Expire → pembayaran gagal
      // Kita bedain: "expire" → status "expired", lainnya → "failed"
      // Kenapa dibedain? Biar frontend bisa tampilin pesan yang beda
      // "Pembayaran kadaluarsa" vs "Pembayaran gagal/ditolak"
      paymentStatus = transactionStatus === "expire" ? "expired" : "failed";
    } else if (transactionStatus === "refund") {
      // Refund = uang dikembalikan ke customer
      paymentStatus = "refunded";
    } else {
      // Status lain (pending, dll) → tetap pending
      // Ini biasanya terjadi kalau webhook pertama kali datang saat
      // user baru buka halaman pembayaran tapi belum bayar
      paymentStatus = "pending";
    }

    // ─── Update payment record di database ────────────────────────────
    // Update status pembayaran & simpan semua info dari Midtrans
    await supabase
      .from("payments")
      .update({
        status: paymentStatus, // Status internal (paid/pending/failed/dll)
        payment_type: notification.payment_type, // Metode pembayaran (gopay, bca_va, dll)
        midtrans_transaction_id: notification.transaction_id, // ID transaksi Midtrans
        midtrans_response: notification, // Simpan SELURUH notifikasi (buat audit/debug)
        paid_at: paymentStatus === "paid" ? new Date().toISOString() : null, // Timestamp bayar (kalau paid)
        updated_at: new Date().toISOString(), // Timestamp update
      })
      .eq("order_id", notification.order_id); // Filter by order ID

    // ─── Kalau payment PAID → aktifkan subscription ───────────────────
    if (paymentStatus === "paid") {
      const sub = payment.subscriptions; // Data subscription dari join tadi

      // Ambil plan & billing cycle yang disimpan saat subscribe
      // Ini PENTING — karena saat subscribe kita gak langsung update plan
      // Plan di-update SETELAH pembayaran berhasil (di sini)
      const pendingPlanId =
        payment.midtrans_response?.pending_plan_id || sub.plan_id; // Plan yang dibeli
      const pendingBillingCycle =
        payment.midtrans_response?.pending_billing_cycle || // Billing cycle yang dipilih
        sub.billing_cycle || // Fallback
        "monthly"; // Default
      const periodDays = pendingBillingCycle === "yearly" ? 365 : 30; // Durasi periode
      const periodEnd = new Date(
        Date.now() + periodDays * 86400000,
      ).toISOString(); // Tanggal berakhir

      // Data yang di-update di subscription:
      const updateData: Record<string, any> = {
        status: "active", // Dari "trialing" → "active" (sudah berbayar)
        plan_id: pendingPlanId, // Update plan (misal free → pro)
        billing_cycle: pendingBillingCycle, // Set billing cycle
        current_period_start: new Date().toISOString(), // Periode mulai
        current_period_end: periodEnd, // Periode berakhir
        updated_at: new Date().toISOString(), // Timestamp update
      };

      // Kalau Midtrans ngirim saved_token_id (token kartu kredit yang disave),
      // simpan buat auto-charge berikutnya (recurring payment)
      if (notification.saved_token_id) {
        updateData.midtrans_saved_token_id = notification.saved_token_id;
      }

      // Update subscription di database
      await supabase.from("subscriptions").update(updateData).eq("id", sub.id);

      // Log sukses
      console.log(
        `[Midtrans Webhook] Subscription activated for user ${sub.user_id}`,
      );

      // ─── Kalau payment FAILED/EXPIRED → set subscription ke "past_due" ─
      // "past_due" artinya subscription bermasalah (pembayaran gagal)
      // Frontend bisa tampilin pesan "Pembayaran gagal, silakan coba lagi"
    } else if (paymentStatus === "failed" || paymentStatus === "expired") {
      await supabase
        .from("subscriptions")
        .update({ status: "past_due", updated_at: new Date().toISOString() })
        .eq("id", payment.subscription_id); // Filter by subscription ID
    }

    // Log final status
    console.log(
      `[Midtrans Webhook] Order ${notification.order_id} → ${paymentStatus}`,
    );

    // Return "ok" ke Midtrans — ini PENTING!
    // Kalau kita gak return 200, Midtrans bakal retry kirim webhook
    // sampai 5x dalam 24 jam (automatic retry mechanism)
    return c.json({ status: "ok" });
  } catch (err: any) {
    // Catch error yang gak terduga
    // Penting buat return 500 biar Midtrans retry webhook-nya
    console.error("[Midtrans Webhook] Error:", err);
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// GET /history — Ambil riwayat pembayaran user
// ═══════════════════════════════════════════════════════════════════════
// Dipake frontend buat nampilin halaman "Riwayat Pembayaran"
// Menampilkan 20 pembayaran terakhir user, diurutin dari yang terbaru
// ═══════════════════════════════════════════════════════════════════════
payments.get("/history", async (c) => {
  // Ambil user ID dari header auth
  const userId = c.req.header("x-user-id");
  if (!userId) return c.json({ error: "User ID required" }, 401);

  // Query ke tabel "payments":
  //   - eq("user_id", userId)                  → cuma payment milik user ini
  //   - order("created_at", { ascending: false }) → urutin dari terbaru ke terlama
  //   - limit(20)                              → cuma ambil 20 terakhir (biar gak berat)
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Kalau query gagal, return error
  if (error) return c.json({ error: error.message }, 500);

  // Return data pembayaran (array of payment objects)
  return c.json(data);
});

// ═══════════════════════════════════════════════════════════════════════
// POST /cancel — Cancel subscription user
// ═══════════════════════════════════════════════════════════════════════
// Dipake pas user klik "Cancel Subscription" di halaman settings
// Setelah cancel:
//   - Plan dikembalikan ke "free"
//   - Status jadi "canceled"
//   - User gak bisa akses fitur premium lagi
//   - Tapi data user tetap tersimpan (gak dihapus)
// ═══════════════════════════════════════════════════════════════════════
payments.post("/cancel", async (c) => {
  // Ambil user ID dari header auth
  const userId = c.req.header("x-user-id");
  if (!userId) return c.json({ error: "User ID required" }, 401);

  // Parse body — boleh ada reason kenapa cancel (opsional)
  // Contoh body: { "reason": "Terlalu mahal" }
  const body = await c.req.json();
  const { reason } = body;

  // Cari plan "free" di database — kita butuh ID-nya buat downgrade
  const { data: freePlan } = await supabase
    .from("plans")
    .select("id")
    .eq("name", "free")
    .single();

  // Kalau plan free gak ada di DB, error
  if (!freePlan) return c.json({ error: "Free plan not found" }, 500);

  // Update subscription user:
  //   - plan_id → kembali ke free (downgrade)
  //   - status → "canceled"
  //   - canceled_at → timestamp kapan cancel
  //   - cancel_reason → alasan cancel (kalau ada)
  const { error } = await supabase
    .from("subscriptions")
    .update({
      plan_id: freePlan.id, // Downgrade ke free
      status: "canceled", // Status jadi canceled
      canceled_at: new Date().toISOString(), // Kapan di-cancel
      cancel_reason: reason || null, // Alasan cancel (opsional)
      updated_at: new Date().toISOString(), // Timestamp update
    })
    .eq("user_id", userId); // Filter by user ID

  // Kalau gagal update, return error
  if (error) return c.json({ error: error.message }, 500);

  // Log sukses
  console.log(`[Payments] Subscription canceled for user ${userId}`);

  // Return pesan sukses
  return c.json({ message: "Subscription canceled successfully" });
});

// ═══════════════════════════════════════════════════════════════════════
// GET /check-access — Cek apakah user bisa akses fitur tertentu
// ═══════════════════════════════════════════════════════════════════════
// Dipake frontend buat FeatureGate / Paywall component
// Contoh: user coba buka halaman "Laporan Laba Rugi"
//   → Frontend panggil /check-access?feature=income_statement
//   → Backend cek: user free plan, fitur butuh pro → return has_access: false
//   → Frontend tampilin Paywall "Upgrade ke Pro buat akses fitur ini"
// ═══════════════════════════════════════════════════════════════════════
payments.get("/check-access", async (c) => {
  // Ambil user ID dari header auth
  const userId = c.req.header("x-user-id");
  if (!userId) return c.json({ error: "User ID required" }, 401);

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

  // Ambil nama plan user sekarang
  const planName = sub.plans?.name;

  // Mapping fitur → plan yang bisa akses fitur tersebut
  // Contoh: "export_pdf" bisa diakses oleh plan "pro" dan "enterprise"
  const featureAccess: Record<string, string[]> = {
    export_pdf: ["pro", "enterprise"], // Export PDF → Pro & Enterprise
    export_csv: ["enterprise"], // Export CSV → Enterprise aja
    unlimited_journals: ["pro", "enterprise"], // Unlimited journals → Pro & Enterprise
    multi_company: ["pro", "enterprise"], // Multi-company → Pro & Enterprise
    multi_user: ["enterprise"], // Multi-user → Enterprise aja
    api_access: ["enterprise"], // API access → Enterprise aja
    income_statement: ["pro", "enterprise"], // Laporan Laba Rugi → Pro & Enterprise
    balance_sheet: ["pro", "enterprise"], // Neraca → Pro & Enterprise
    cash_flow: ["pro", "enterprise"], // Arus Kas → Pro & Enterprise
  };

  // Kalau ada query parameter "feature", cek akses spesifik
  if (feature && featureAccess[feature]) {
    // Cek apakah plan user termasuk dalam daftar plan yang bisa akses fitur ini
    const hasAccess = featureAccess[feature].includes(planName);

    return c.json({
      has_access: hasAccess, // Apakah bisa akses
      plan: planName, // Plan user sekarang
      required_plan: hasAccess ? null : featureAccess[feature][0], // Plan minimal yang dibutuhkan (kalau gak bisa akses)
    });
  }

  // Kalau gak ada query "feature", return info subscription secara umum
  return c.json({
    has_access: true, // Subscription aktif, bisa akses sesuai plan
    plan: planName, // Plan sekarang
    is_trial: isTrialActive, // Apakah lagi trial
    trial_days_left: isTrialActive // Sisa hari trial (kalau trial)
      ? Math.ceil(
          (new Date(sub.trial_end).getTime() - now.getTime()) / 86400000,
        )
      : 0,
  });
});

export default payments;
