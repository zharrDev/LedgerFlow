// ============================================================================
// LEDGERFLOW - Payment Service (Frontend)
// ============================================================================
// File ini jadi "jembatan" antara frontend (React) dan backend API (Hono).
// Semua fungsi yang berhubungan sama pembayaran ada di sini:
//   - getPlans()           → Ambil daftar plan dari backend
//   - getSubscription()    → Ambil data subscription user
//   - subscribe()          → Buat transaksi pembayaran
//   - testComplete()       → Force-complete pembayaran (sandbox only)
//   - getPaymentHistory()  → Ambil riwayat pembayaran
//   - cancelSubscription() → Cancel subscription
//   - checkFeatureAccess() → Cek akses fitur
//   - isSandboxMode()      → Cek apakah lagi di mode sandbox
//   - openSnapPayment()    → Buka popup pembayaran Midtrans Snap
//   - formatPrice()        → Format angka jadi format Rupiah
// ============================================================================

import { api } from "../lib/api"; // Axios instance yang udah di-config (base URL, auth headers, dll)

// ═══════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════
// TypeScript types buat type-safety saat ngoding di frontend.
// Setiap response API punya type yang jelas biar gak tebak-tebak.

// Data plan (Free, Pro, Enterprise)
export interface Plan {
  id: string; // UUID plan di database
  name: string; // "free", "pro", "enterprise"
  display_name: string; // "Free", "Pro", "Enterprise" (buat ditampilin di UI)
  price_monthly: number; // Harga bulanan dalam IDR (contoh: 99000)
  price_yearly: number; // Harga tahunan dalam IDR (contoh: 999000)
  max_companies: number; // Maksimal perusahaan yang bisa dibuat
  max_journals: number | null; // Maksimal jurnal per bulan (null = unlimited)
  features: string[]; // Array fitur yang tersedia di plan ini
  is_active: boolean; // Apakah plan masih aktif/dijual
}

// Data subscription user
export interface Subscription {
  id: string; // UUID subscription
  user_id: string; // UUID user pemilik subscription
  plan_id: string; // UUID plan yang sedang aktif
  status: "active" | "trialing" | "past_due" | "canceled" | "expired"; // Status subscription
  billing_cycle: "monthly" | "yearly"; // Siklus pembayaran
  trial_start: string | null; // Kapan trial mulai (ISO date string)
  trial_end: string | null; // Kapan trial selesai (ISO date string)
  current_period_start: string | null; // Periode berlangganan mulai
  current_period_end: string | null; // Periode berlangganan selesai
  is_active: boolean; // Apakah subscription masih berlaku (computed by backend)
  is_trial: boolean; // Apakah lagi masa trial (computed by backend)
  trial_days_left: number; // Sisa hari trial (computed by backend)
  plans: Plan; // Object plan yang di-join dari tabel plans
}

// Data riwayat pembayaran
export interface PaymentHistory {
  id: string; // UUID payment record
  order_id: string; // ID transaksi unik (format: LF-{userId}-{timestamp}-{random})
  amount: number; // Jumlah yang dibayar (dalam IDR)
  status: "pending" | "paid" | "failed" | "expired" | "refunded"; // Status pembayaran
  payment_type: string | null; // Metode pembayaran ("gopay", "bca_va", "credit_card", dll)
  created_at: string; // Kapan payment record dibuat (ISO date string)
  paid_at: string | null; // Kapan pembayaran berhasil (null kalau belum bayar)
}

// Response dari endpoint POST /subscribe
export interface SubscribeResponse {
  snap_token: string; // Token buat buka popup Midtrans Snap (string panjang)
  redirect_url: string; // URL alternatif buat redirect langsung ke halaman Midtrans
  order_id: string; // ID transaksi buat tracking & navigasi ke halaman result
}

// Response dari endpoint GET /check-access
export interface AccessCheck {
  has_access: boolean; // Apakah user bisa akses fitur ini
  plan: string; // Plan user sekarang ("free", "pro", "enterprise")
  required_plan?: string; // Plan minimal yang dibutuhkan (kalau has_access false)
  reason?: string; // Alasan kenapa gak bisa akses (contoh: "subscription_expired")
  is_trial?: boolean; // Apakah user lagi trial
  trial_days_left?: number; // Sisa hari trial
}

// Response dari endpoint POST /test-complete (sandbox only)
export interface TestCompleteResponse {
  status: "ok"; // Status operasi (selalu "ok" kalau sukses)
  message: string; // Pesan deskriptif
  subscription_status: string; // Status subscription setelah complete ("active")
  plan_id: string; // Plan ID yang aktif setelah complete
}

// ═══════════════════════════════════════════════════════════════════════
// SANDBOX DETECTION
// ═══════════════════════════════════════════════════════════════════════
// Cache variable buat nyimpen hasil cek sandbox
// Kenapa di-cache? Biar gak hit API /is-sandbox berkali-kali
// Cukup sekali aja di awal, hasilnya disimpen di variable ini
let _isSandbox: boolean | null = null; // null = belum di-cek, true = sandbox, false = production

/**
 * Cek apakah Midtrans lagi jalan di mode sandbox/test.
 *
 * CARA KERJANYA:
 *   1. Kalau udah pernah dicek (_isSandbox bukan null), langsung return cache
 *   2. Kalau belum, panggil API GET /is-sandbox ke backend
 *   3. Backend cek env var MIDTRANS_IS_PRODUCTION
 *   4. Hasilnya di-cache di _isSandbox biar gak hit API lagi
 *   5. Kalau API gagal, fallback: cek URL script snap.js di HTML
 *      (kalau ada "sandbox" di URL, berarti sandbox)
 *
 * Return: true kalau sandbox, false kalau production
 */
export async function isSandboxMode(): Promise<boolean> {
  // Kalau udah pernah di-cek, return hasil cache (gak perlu hit API lagi)
  if (_isSandbox !== null) return _isSandbox;

  try {
    // Hit API GET /is-sandbox ke backend
    const res = await api.get("/api/payments/is-sandbox");

    // Backend return { is_sandbox: true/false }
    // Simpen hasilnya ke cache
    _isSandbox = res.data.is_sandbox === true;

    return _isSandbox;
  } catch {
    // ─── Fallback: Kalau API gagal (misal network error) ──────────────
    // Cek dari URL script Snap.js yang diload di HTML
    // Kalau script-nya dari app.sandbox.midtrans.com → sandbox
    // Kalau dari app.midtrans.com → production
    const scripts = document.querySelectorAll('script[src*="midtrans"]'); // Cari semua script yang ada "midtrans" di URL-nya
    for (const s of scripts) {
      // Cek apakah URL script mengandung kata "sandbox"
      if (s.getAttribute("src")?.includes("sandbox")) {
        _isSandbox = true; // Cache hasilnya
        return true; // Return true = sandbox
      }
    }

    // Kalau gak ada script Midtrans atau URL-nya gak ada "sandbox"
    // Asumsi production (lebih aman: kalau gak yakin, anggap production)
    _isSandbox = false;
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// API FUNCTIONS — Fungsi-fungsi yang manggil backend API
// ═══════════════════════════════════════════════════════════════════════

/**
 * Ambil daftar semua plan yang tersedia.
 *
 * Dipake: PricingPage.tsx (buat nampilin card Free/Pro/Enterprise)
 *
 * Backend: GET /api/payments/plans
 * Return: Array of Plan objects, diurutin dari termurah
 */
export async function getPlans(): Promise<Plan[]> {
  // Hit API GET /plans
  const res = await api.get("/api/payments/plans");

  // Response data berisi array Plan (langsung dari Supabase)
  return res.data;
}

/**
 * Ambil data subscription user yang login.
 *
 * Dipake: useSubscription hook, SettingsPage, Dashboard, dll
 *
 * Backend: GET /api/payments/subscription
 * Return: Object Subscription (kalau belum ada, backend auto-create yang free)
 */
export async function getSubscription(): Promise<Subscription> {
  // Hit API GET /subscription (user ID dikirim via header oleh api interceptor)
  const res = await api.get("/api/payments/subscription");

  // Response data berisi object Subscription + data plan yang di-join
  return res.data;
}

/**
 * Buat transaksi pembayaran & dapet Midtrans Snap token.
 *
 * Dipake: PricingPage.tsx pas user klik "Upgrade Sekarang"
 *
 * Backend: POST /api/payments/subscribe
 *   Body: { plan_name: "pro", billing_cycle: "monthly" }
 *   Return: { snap_token, redirect_url, order_id }
 *
 * Setelah dapet snap_token, frontend manggil openSnapPayment()
 * buat buka popup pembayaran Midtrans.
 */
export async function subscribe(
  planName: string, // "pro" atau "enterprise"
  billingCycle: "monthly" | "yearly" = "monthly", // Default monthly
): Promise<SubscribeResponse> {
  // Hit API POST /subscribe dengan plan & billing cycle yang dipilih user
  const res = await api.post("/api/payments/subscribe", {
    plan_name: planName, // Nama plan yang dibeli
    billing_cycle: billingCycle, // Siklus pembayaran
  });

  // Response berisi snap_token, redirect_url, dan order_id
  return res.data;
}

/**
 * Force-complete pembayaran yang masih pending.
 *
 * ⚠️ SANDBOX ONLY — endpoint ini gak bisa dipake di production!
 *
 * KENAPA DIBUTUHKAN:
 *   Di Midtrans Sandbox, pembayaran via Virtual Account / Bank Transfer
 *   statusnya tetap "pending" selamanya (webhook settlement gak pernah fire).
 *   Fungsi ini simulasi pembayaran berhasil biar bisa test full flow upgrade.
 *
 * Dipake:
 *   - PricingPage.tsx → auto-call pas onPending (sandbox mode)
 *   - PaymentResultPage.tsx → tombol "Simulasi Bayar Berhasil" (sandbox mode)
 *
 * Backend: POST /api/payments/test-complete
 *   Body: { order_id: "LF-xxx-xxx" }
 *   Return: { status: "ok", message: "...", subscription_status: "active", plan_id: "..." }
 */
export async function testComplete(
  orderId: string,
): Promise<TestCompleteResponse> {
  // Hit API POST /test-complete dengan order ID yang mau di-force complete
  const res = await api.post("/api/payments/test-complete", {
    order_id: orderId,
  });

  // Response berisi konfirmasi bahwa subscription udah aktif
  return res.data;
}

/**
 * Ambil riwayat pembayaran user.
 *
 * Dipake: Halaman "Riwayat Pembayaran" / Settings
 *
 * Backend: GET /api/payments/history
 * Return: Array of PaymentHistory (maks 20, diurutin dari terbaru)
 */
export async function getPaymentHistory(): Promise<PaymentHistory[]> {
  // Hit API GET /history
  const res = await api.get("/api/payments/history");

  // Response berisi array payment records (maks 20 terakhir)
  return res.data;
}

/**
 * Cancel subscription user.
 *
 * Dipake: Halaman Settings pas user klik "Cancel Subscription"
 *
 * Backend: POST /api/payments/cancel
 *   Body: { reason: "Terlalu mahal" }  (reason optional)
 *
 * Setelah cancel: plan kembali ke "free", status "canceled"
 */
export async function cancelSubscription(reason?: string): Promise<void> {
  // Hit API POST /cancel dengan alasan (kalau ada)
  // Gak return data apapun (void) — cuma perlu tau sukses/gak
  await api.post("/api/payments/cancel", { reason });
}

/**
 * Cek apakah user bisa akses fitur tertentu.
 *
 * Dipake: FeatureGate/Paywall component buat nentuin
 *         apakah user bisa lihat fitur atau harus tampilin paywall
 *
 * Backend: GET /api/payments/check-access?feature=export_pdf
 * Return: { has_access: false, plan: "free", required_plan: "pro" }
 */
export async function checkFeatureAccess(
  feature: string, // Nama fitur (contoh: "export_pdf", "income_statement")
): Promise<AccessCheck> {
  // Hit API GET /check-access dengan query parameter feature
  const res = await api.get(`/api/payments/check-access?feature=${feature}`);

  // Response berisi info apakah user bisa akses fitur ini
  return res.data;
}

// ═══════════════════════════════════════════════════════════════════════
// MIDTRANS SNAP HELPER — Buka popup pembayaran Midtrans
// ═══════════════════════════════════════════════════════════════════════

/**
 * Buka popup pembayaran Midtrans Snap.
 *
 * PRASYARAT:
 *   Script Snap.js harus udah diload di HTML:
 *   Sandbox:  <script src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key="SBX-xxx">
 *   Production: <script src="https://app.midtrans.com/snap/snap.js" data-client-key="PROD-xxx">
 *
 * CARA KERJANYA:
 *   1. Cek apakah window.snap udah ada (Snap.js udah diload)
 *   2. Kalau belum ada, log error (popup gak bisa dibuka)
 *   3. Kalau udah ada, panggil snap.pay(token, callbacks)
 *   4. Midtrans bakal munculin popup pembayaran di browser
 *   5. Callbacks dipanggil sesuai hasil pembayaran:
 *      - onSuccess → pembayaran berhasil (credit card auto-settle)
 *      - onPending → pembayaran pending (VA, bank transfer, dll)
 *      - onError   → pembayaran error/gagal
 *      - onClose   → user tutup popup tanpa bayar
 *
 * @param snapToken  — Token dari Midtrans (dapet dari subscribe())
 * @param callbacks  — Object berisi callback functions
 */
export function openSnapPayment(
  snapToken: string, // Token yang dapet dari subscribe() response
  callbacks?: {
    // Optional callbacks buat handle hasil pembayaran
    onSuccess?: (result: any) => void; // Dipanggil kalau pembayaran sukses
    onPending?: (result: any) => void; // Dipanggil kalau pembayaran pending (belum bayar)
    onError?: (result: any) => void; // Dipanggil kalau pembayaran error
    onClose?: () => void; // Dipanggil kalau user tutup popup
  },
): void {
  // Cast window ke any biar bisa akses window.snap (Snap.js nambahin properti ini)
  const win = window as any;

  // Cek apakah Snap.js udah diload
  // Kalau belum, berarti ada masalah di HTML (script tag kurang / salah URL)
  if (!win.snap) {
    console.error(
      "[Payment] Snap.js not loaded! Add the script tag to your HTML.",
    );
    // Gak bisa buka popup kalau Snap.js gak ada
    // Alternatif: bisa redirect ke redirect_url, tapi buat sekarang gak dilakuin
    return;
  }

  // Panggil Midtrans Snap API: snap.pay(token, options)
  // Ini yang bikin popup pembayaran muncul di layar user
  win.snap.pay(snapToken, {
    // Callback: pembayaran BERHASIL
    // Dipanggil kalau transaksi langsung settle (contoh: credit card yang langsung approve)
    // result berisi: order_id, transaction_status, payment_type, dll
    onSuccess: (result: any) => {
      console.log("[Payment] Success:", result); // Log buat debugging
      callbacks?.onSuccess?.(result); // Panggil callback dari caller (PricingPage)
    },

    // Callback: pembayaran PENDING
    // Dipanggil kalau transaksi belum settle (contoh: VA yang belum dibayar,
    // e-wallet yang belum dikonfirmasi, dll)
    // result berisi info cara bayar (nomor VA, dll)
    onPending: (result: any) => {
      console.log("[Payment] Pending:", result); // Log buat debugging
      callbacks?.onPending?.(result); // Panggil callback dari caller
    },

    // Callback: pembayaran ERROR/GAGAL
    // Dipanggil kalau transaksi gagal (contoh: kartu ditolak, saldo kurang, dll)
    onError: (result: any) => {
      console.error("[Payment] Error:", result); // Log error buat debugging
      callbacks?.onError?.(result); // Panggil callback dari caller
    },

    // Callback: user TUTUP POPUP
    // Dipanggil kalau user klik tombol close (X) di popup Midtrans
    // ATAU kalau popup di-close otomatis karena timeout
    onClose: () => {
      console.log("[Payment] Popup closed"); // Log buat debugging
      callbacks?.onClose?.(); // Panggil callback dari caller
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════
// FORMAT HELPERS — Fungsi helper buat format angka jadi Rupiah
// ═══════════════════════════════════════════════════════════════════════

/**
 * Format angka jadi format Rupiah lengkap.
 *
 * Contoh:
 *   formatPrice(99000)   → "Rp99.000"
 *   formatPrice(999000)  → "Rp999.000"
 *   formatPrice(2999000) → "Rp2.999.000"
 */
export function formatPrice(amount: number): string {
  // Pakai Intl.NumberFormat dengan locale "id-ID" dan currency "IDR"
  // minimumFractionDigits: 0 → gak ada desimal (Rp99.000, bukan Rp99.000,00)
  // maximumFractionDigits: 0 → gak ada desimal
  return new Intl.NumberFormat("id-ID", {
    style: "currency", // Format sebagai mata uang
    currency: "IDR", // Mata uang Rupiah
    minimumFractionDigits: 0, // Minimal 0 digit desimal
    maximumFractionDigits: 0, // Maksimal 0 digit desimal
  }).format(amount);
}

/**
 * Format angka jadi format Rupiah compact (singkat).
 *
 * Berguna buat nampilin harga di tempat yang sempit (badge, card kecil, dll)
 *
 * Contoh:
 *   formatPriceCompact(99000)   → "Rp99rb"
 *   formatPriceCompact(999000)  → "Rp999rb"
 *   formatPriceCompact(2999000) → "Rp3jt"
 */
export function formatPriceCompact(amount: number): string {
  // Kalau >= 1 juta, format sebagai "Rp Xjt"
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(0)}jt`;

  // Kalau >= 1 ribu, format sebagai "Rp Xrb"
  if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}rb`;

  // Kalau < 1 ribu, pakai format lengkap (Rp500, dll)
  return formatPrice(amount);
}
