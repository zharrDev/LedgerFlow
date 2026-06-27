// ============================================================================
// LEDGERFLOW - Midtrans Client Configuration
// ============================================================================

import midtransClient from "midtrans-client";
import crypto from "crypto";

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
const clientKey = process.env.MIDTRANS_CLIENT_KEY || "";

// Instance Snap untuk membuat transaksi pembayaran
export const snap = new midtransClient.Snap({
  isProduction: isProduction,
  serverKey: serverKey,
  clientKey: clientKey,
});

// Instance Core API untuk operasi Midtrans level lebih rendah/fleksibel
export const coreApi = new midtransClient.CoreApi({
  isProduction: isProduction,
  serverKey: serverKey,
  clientKey: clientKey,
});

// Helper: membuat order id unik untuk setiap transaksi
export function generateOrderId(userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `LF-${userId.substring(0, 8)}-${timestamp}-${random}`;
}

// Helper: verifikasi apakah webhook benar-benar berasal dari Midtrans
export function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  sKey: string,
  signatureKey: string,
): boolean {
  const hash = crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${sKey}`)
    .digest("hex");
  return hash === signatureKey;
}

// Daftar harga paket subscription
export const PLAN_PRICES = {
  free: { monthly: 0, yearly: 0 },
  pro: { monthly: 99000, yearly: 999000 },
  enterprise: { monthly: 299000, yearly: 2999000 },
} as const;

export type PlanName = keyof typeof PLAN_PRICES;
export type BillingCycle = "monthly" | "yearly";

// Mengambil harga plan berdasarkan nama plan dan siklus billing
export function getPlanPrice(plan: PlanName, cycle: BillingCycle): number {
  return PLAN_PRICES[plan]?.[cycle] ?? 0;
}

// Debug konfigurasi Midtrans aktif
console.log(`[Midtrans] Mode: ${isProduction ? "PRODUCTION" : "SANDBOX"}`);
console.log(`[Midtrans] Server key: ${serverKey.substring(0, 20)}...`);
console.log(`[Midtrans] Client key: ${clientKey.substring(0, 20)}...`);
console.log(
  `[Midtrans] Snap API URL: ${isProduction ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com"}`,
);
