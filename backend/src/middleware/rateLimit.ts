// ============================================================================
// Middleware: Rate Limit - Melindungi endpoint premium dari abuse dan brute force
// ============================================================================
// Implementasi rate limiting per-user untuk endpoint fitur premium.
// Rate limit default: 30 request per menit per user.
// Endpoint premium: income_statement, balance_sheet, cash_flow, export_pdf, export_csv, unlimited_journals, multi_company, multi_user, api_access
// Admin routes: rate limit terpisah (lebih ketat, 10 request per menit)

import type { Context, Next } from "hono";
import { supabase } from "../lib/supabase.js";

declare module "hono" {
  interface ContextVariableMap {
    rateLimited?: boolean;
    rateLimitResetMs?: number;
  }
}

// Rate limit store: map user_id -> array of timestamps
const rateLimitStore = new Map<string, number[]>();

// Configuration
const DEFAULT_RATE_LIMIT = 30; // request per menit
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 menit

const ADMIN_RATE_LIMIT = 10; // request per menit
const ADMIN_WINDOW_MS = 60 * 1000;

// Helper: ambil user_id dari context Hono
function getUserId(c: Context): string | null {
  const user = c.get("user");
  return user?.sub || null;
}

// Helper: ambil IP address
function getClientIp(c: Context): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown"
  );
}

// Helper: bersihkan timestamp yang sudah expired
function cleanExpiredTimestamps(timestamps: number[], windowMs: number): number[] {
  const now = Date.now();
  return timestamps.filter((timestamp) => now - timestamp < windowMs);
}

// Helper: cek apakah user exceed rate limit
function isRateLimited(
  userId: string,
  limit: number,
  windowMs: number
): { limited: boolean; resetInMs?: number } {
  if (!rateLimitStore.has(userId)) {
    return { limited: false };
  }
  
  const timestamps = rateLimitStore.get(userId) || [];
  const cleanedTimestamps = cleanExpiredTimestamps(timestamps, windowMs);
  
  rateLimitStore.set(userId, cleanedTimestamps);
  
  if (cleanedTimestamps.length >= limit) {
    const oldestTimestamp = cleanedTimestamps[0];
    const resetInMs = oldestTimestamp + windowMs - Date.now();
    return { limited: true, resetInMs: Math.max(0, resetInMs) };
  }
  
  return { limited: false };
}

// Middleware rate limit untuk endpoint premium
export const premiumFeatureRateLimit = async (c: Context, next: Next) => {
  const userId = getUserId(c);
  if (!userId) {
    // Tidak ada user → lewati (middleware auth akan mengembalikan 401)
    await next();
    return;
  }
  
  // Cek apakah endpoint adalah admin (berdasarkan path)
  const path = c.req.path;
  const isAdminRoute = path.startsWith("/api/admin") || path.startsWith("/api/auth/admin");
  
  const rateLimitConfig = isAdminRoute
    ? { limit: ADMIN_RATE_LIMIT, windowMs: ADMIN_WINDOW_MS }
    : { limit: DEFAULT_RATE_LIMIT, windowMs: DEFAULT_WINDOW_MS };
  
  const result = isRateLimited(userId, rateLimitConfig.limit, rateLimitConfig.windowMs);
  
  if (result.limited) {
    // Tandai request sebagai rate limited
    c.set("rateLimited", true);
    c.set("rateLimitResetMs", result.resetInMs);
    
    // Logging untuk audit (best-effort; kegagalan log tidak boleh
    // mengubah status 429 yang harus diterima klien).
    try {
      await supabase.from("rate_limit_logs").insert({
        user_id: userId,
        reason: "premium_feature_access",
        ip_address: getClientIp(c),
        user_agent: c.req.header("user-agent") || "unknown",
        request_path: path,
        method: c.req.method,
        created_at: new Date().toISOString(),
        reset_at: new Date(Date.now() + (result.resetInMs || 0)).toISOString(),
      });
    } catch (logError) {
      console.error("[RateLimit] Gagal menyimpan log:", logError);
    }
    
    return c.json(
      {
        error: "Terlalu banyak permintaan. Coba lagi dalam beberapa saat.",
        retry_after: Math.ceil((result.resetInMs || 0) / 1000),
      },
      429
    );
  }
  
  // Simpan timestamp request ini untuk rate limiting
  if (!rateLimitStore.has(userId)) {
    rateLimitStore.set(userId, []);
  }
  const timestamps = rateLimitStore.get(userId) || [];
  timestamps.push(Date.now());
  rateLimitStore.set(userId, timestamps);
  
  await next();
};

// Utility: ambil stats rate limit (berguna untuk admin dashboard)
export async function getRateLimitStats() {
  const stats = {
    totalUsers: rateLimitStore.size,
    totalRequests: Array.from(rateLimitStore.values()).reduce((sum, ts) => sum + ts.length, 0),
    averageRequestsPerUser: 0,
    topUsers: [] as Array<{ userId: string; requestCount: number }>,
  };
  
  if (stats.totalUsers > 0) {
    stats.averageRequestsPerUser = stats.totalRequests / stats.totalUsers;
    
    const userCounts = Array.from(rateLimitStore.entries())
      .map(([userId, timestamps]) => ({
        userId,
        requestCount: timestamps.length,
      }))
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, 10);

    stats.topUsers = userCounts;
  }
  
  return stats;
}

// Cleanup rate limit entries lama (jika memory terlalu besar)
export function cleanupRateLimitStore() {
  const now = Date.now();
  const windowMs = DEFAULT_WINDOW_MS;
  
  for (const [userId, timestamps] of rateLimitStore.entries()) {
    const cleanedTimestamps = cleanExpiredTimestamps(timestamps, windowMs);
    if (cleanedTimestamps.length !== timestamps.length) {
      rateLimitStore.set(userId, cleanedTimestamps);
    }
    
    // Hapus user yang tidak punya request aktif
    if (cleanedTimestamps.length === 0) {
      rateLimitStore.delete(userId);
    }
  }
}

// Schedule cleanup periodik (berguna di production)
if (process.env.NODE_ENV === "production") {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000); // Setiap 5 menit
}
