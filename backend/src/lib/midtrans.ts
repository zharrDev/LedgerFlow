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

// Type untuk plan name
export type PlanName = "pro" | "enterprise";
export type BillingCycle = "monthly" | "yearly";

// Debug konfigurasi Midtrans aktif — JANGAN log material key (rahasia).
console.log(`[Midtrans] Mode: ${isProduction ? "PRODUCTION" : "SANDBOX"}`);
console.log(`[Midtrans] Server key configured: ${!!serverKey}`);
console.log(`[Midtrans] Client key configured: ${!!clientKey}`);
console.log(
  `[Midtrans] Snap API URL: ${isProduction ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com"}`,
);

// Helper untuk ambil harga plan dari database (bukan hardcode)
// Dipakai di payments.ts /subscribe
export async function getPlanPrice(
  supabase: any,
  plan: PlanName,
  cycle: BillingCycle,
): Promise<number> {
  const { data: planData } = await supabase
    .from("plans")
    .select("price_monthly, price_yearly")
    .eq("name", plan)
    .single();

  if (!planData) return 0;
  return cycle === "yearly" ? planData.price_yearly : planData.price_monthly;
}