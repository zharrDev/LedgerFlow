// ============================================================================
// LEDGERFLOW - Payment Service (Frontend)
// ============================================================================
// File ini jadi "jembatan" antara frontend (React) dan backend API (Hono).
// Semua fungsi yang berhubungan sama pembayaran ada di sini:
//   - getPlans()           → Ambil daftar plan dari backend
//   - getSubscription()    → Ambil data subscription user
//   - subscribe()          → Buat transaksi pembayaran
//   - testComplete()       → Force-complete pembayaran (sandbox only)
//   - cancelSubscription() → Cancel subscription
//   - isSandboxMode()      → Cek apakah lagi di mode sandbox
//   - openSnapPayment()    → Buka popup pembayaran Midtrans Snap
//   - formatPrice()        → Format angka jadi format Rupiah
// ============================================================================

import { api } from "../lib/api"; // Axios instance yang udah di-config (base URL, auth headers, dll)
import { formatCurrency } from "../utils/currency"; // Harga backend dalam IDR → tampil ikut mata uang aktif

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

// Response dari endpoint POST /subscribe
export interface SubscribeResponse {
  snap_token: string; // Token buat buka popup Midtrans Snap (string panjang)
  redirect_url: string; // URL alternatif buat redirect langsung ke halaman Midtrans
  order_id: string; // ID transaksi buat tracking & navigasi ke halaman result
  client_key?: string; // Client key sesuai mode backend (wajib dipakai load Snap)
  is_production?: boolean; // Mode Midtrans backend (guard mismatch sandbox/production)
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
    const res = await api.get("/api/payments/is-sandbox", {
      skipErrorToast: true,
    });

    // Backend return { is_sandbox: true/false }
    // Simpen hasilnya ke cache
    _isSandbox = res.data.is_sandbox === true;

    return _isSandbox;
  } catch {
    // ─── Fallback: Kalau API gagal (misal network error) ──────────────
    // Script Snap.js diload on-demand (bukan di HTML), jadi gak bisa
    // deteksi sandbox dari DOM. Asumsi production (lebih aman: kalau
    // gak yakin, anggap production).
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
  const res = await api.get("/api/payments/plans", { skipErrorToast: true });

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
  const res = await api.get("/api/payments/subscription", {
    skipErrorToast: true,
  });

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
 * Sinkronkan status pembayaran langsung ke Midtrans.
 *
 * FAILSAFE bila webhook belum terpasang / notifikasi terlewat: dipanggil
 * frontend saat halaman payment result dibuka. Kalau ternyata transaksi
 * sudah dibayar, backend langsung mengaktifkan subscription.
 *
 * Backend: POST /api/payments/sync-status  Body: { order_id }
 */
export interface SyncStatusResponse {
  synced: boolean;
  payment_status: string;
  activated: boolean;
  plan?: string;
  midtrans_known?: boolean; // false = token tak dikenal Midtrans (mismatch env)
}

export async function syncPaymentStatus(
  orderId: string,
): Promise<SyncStatusResponse> {
  const res = await api.post(
    "/api/payments/sync-status",
    { order_id: orderId },
    { skipErrorToast: true },
  );
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

// ═══════════════════════════════════════════════════════════════════════
// MIDTRANS SNAP HELPER — Buka popup pembayaran Midtrans
// ═══════════════════════════════════════════════════════════════════════

// Fallback client key (sandbox) — dipakai hanya kalau backend tidak mengirim
// client_key di response subscribe. Sumber utama selalu backend, supaya mode
// snap.js PASTI sama dengan mode token → popup "transaction not found" hilang.
const SNAP_CLIENT_KEY_FALLBACK = "Mid-client-UdVDzr6pTrrbTWHN";

// Cache promise load Snap.js (anti double-load).
let _snapScriptPromise: Promise<void> | null = null;

/**
 * Load script Snap.js on-demand.
 *
 * Balikin Promise yang resolve pas script kebaca + window.snap kebentuk.
 * Kalau udah pernah diload, langsung resolve (idempotent).
 */async function loadSnapScript(clientKey?: string): Promise<void> {
  const win = window as any;
  if (win.snap) return; // Udah kebentuk, gak perlu load lagi

  // Kalau lagi proses loading, reuse promise yang sama (anti double-load)
  if (_snapScriptPromise) return _snapScriptPromise;

  // Deteksi sandbox/production dulu sebelum bikin URL script
  const sandbox = await isSandboxMode();

  _snapScriptPromise = new Promise<void>((resolve, reject) => {
    try {
      const base = sandbox
        ? "https://app.sandbox.midtrans.com"
        : "https://app.midtrans.com";
      const script = document.createElement("script");

      script.src = `${base}/snap/snap.js`;
      script.setAttribute("data-client-key", clientKey || SNAP_CLIENT_KEY_FALLBACK);
      script.async = true;

      let settled = false;

      script.onload = () => {
        // Kadang onload keburu sebelum window.snap kebentuk (tunggu sebentar)
        const trySnap = () => {
          if (win.snap) {
            if (!settled) {
              settled = true;
              resolve();
            }
            return;
          }
          setTimeout(trySnap, 50); // Retry kecil-kecil
        };
        trySnap();
      };
      script.onerror = () => {
        if (!settled) {
          settled = true;
          reject(new Error("Failed to load Snap.js"));
        }
      };

      document.head.appendChild(script);
    } catch (err) {
      reject(err);
    }
  });

  // Reset cache biar bisa dicoba lagi kalau gagal load
  _snapScriptPromise.catch(() => {
    _snapScriptPromise = null;
  });

  return _snapScriptPromise;
}

/**
 * Buka popup pembayaran Midtrans Snap.
 *
 * PRASYARAT:
 *   Script Snap.js diload on-demand otomatis (gak perlu tag <script> di HTML).
 *   Halaman Pricing pakai fungsi ini via subscribe() → snap_token.
 *
 * @param snapToken  — Token dari Midtrans (dapet dari subscribe())
 * @param callbacks  — Object berisi callback functions
 */
export async function openSnapPayment(
  snapToken: string, // Token yang dapet dari subscribe() response
  callbacks?: {
    // Optional callbacks buat handle hasil pembayaran
    onSuccess?: (result: any) => void; // Dipanggil kalau pembayaran sukses
    onPending?: (result: any) => void; // Dipanggil kalau pembayaran pending (belum bayar)
    onError?: (result: any) => void; // Dipanggil kalau pembayaran error
    onClose?: () => void; // Dipanggil kalau user tutup popup
  },
  redirectUrl?: string, // URL alternatif (dari response subscribe) kalau popup gagal
  clientKey?: string, // Client key dari backend (harus sama mode dengan snap_token)
): Promise<void> {
  const win = window as any;

  try {
    // Load Snap.js on-demand kalau belum pernah diload
    await loadSnapScript(clientKey);
  } catch (err) {
    // ─── FALLBACK: Kalau Snap.js gagal di-load ─────────────────────────
    console.error("[Payment] Snap.js failed to load:", err);
    if (redirectUrl) {
      console.log("[Payment] Falling back to redirect URL:", redirectUrl);
      window.open(redirectUrl, "_blank", "noopener,noreferrer");
    } else {
      callbacks?.onError?.(err);
    }
    return;
  }

  if (!win.snap) {
    console.error("[Payment] Snap.js not loaded!");
    if (redirectUrl) {
      console.log("[Payment] Falling back to redirect URL:", redirectUrl);
      window.open(redirectUrl, "_blank", "noopener,noreferrer");
    } else {
      callbacks?.onError?.(new Error("Snap.js not loaded"));
    }
    return;
  }

  // Panggil Midtrans Snap API: snap.pay(token, options)
  // Ini yang bikin popup pembayaran muncul di layar user
  try {
    // Default bahasa sesuai <html lang="..."> biar gak ada warning
    // "language not supported" dari Midtrans.
    const lang = document.documentElement.lang.startsWith("id") ? "id" : "en";

    win.snap.pay(snapToken, {
      // Set bahasa tampilan Snap sesuai bahasa browser/user
      language: lang,

      // Callback: pembayaran BERHASIL
      onSuccess: (result: any) => {
        console.log("[Payment] Success:", result);
        callbacks?.onSuccess?.(result);
      },

      // Callback: pembayaran PENDING
      onPending: (result: any) => {
        console.log("[Payment] Pending:", result);
        callbacks?.onPending?.(result);
      },

      // Callback: pembayaran ERROR/GAGAL
      onError: (result: any) => {
        console.error("[Payment] Error:", result);
        callbacks?.onError?.(result);
      },

      // Callback: user TUTUP POPUP
      onClose: () => {
        console.log("[Payment] Popup closed");
        callbacks?.onClose?.();
      },
    });
  } catch (err) {
    // ─── FALLBACK: Kalau snap.pay() throw (misal popup diblokir / CSP) ─
    console.error("[Payment] snap.pay failed, falling back to redirect:", err);
    callbacks?.onClose?.();
    if (redirectUrl) {
      console.log("[Payment] Falling back to redirect URL:", redirectUrl);
      window.open(redirectUrl, "_blank", "noopener,noreferrer");
    } else {
      callbacks?.onError?.(err);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FORMAT HELPERS — Fungsi helper buat format angka jadi Rupiah
// ═══════════════════════════════════════════════════════════════════════

/**
 * Format angka IDR jadi format mata uang aktif user.
 *
 * Contoh (mode IDR):  formatPrice(99000) → "Rp99.000"
 * Contoh (mode USD):  formatPrice(99000) → "$6.00"
 */
export function formatPrice(amount: number): string {
  return formatCurrency(amount);
}
