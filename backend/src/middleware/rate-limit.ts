// Middleware rate limiting terpusat (in-memory) — pelindung spam & brute-force.
//
// Dua tingkat:
//   STRICT : 5 request / 15 menit per kombinasi IP + nomor telepon.
//            Dipasang di endpoint OTP WhatsApp (/api/wa/register|login/*).
//   NORMAL : 100 request / 15 menit per IP. Fallback global semua /api/*.
//
// State tersimpan di memori proses (Map). Cukup untuk deployment satu
// instance (Render free tier); bila nanti multi-instance, pindahkan ke Redis.
import type { Context, Next } from "hono";

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  /** Kunci custom (default: IP klien). Harus stabil per-klien. */
  keyGenerator?: (c: Context) => string | Promise<string>;
  message?: string;
}

interface Bucket {
  hits: number[];
}

// Satu Map bersama untuk semua tier — kunci tiap tier punya format berbeda
// (IP saja vs "ip:phone") sehingga tidak saling bertabrakan.
const buckets = new Map<string, Bucket>();

// Jendela terbesar yang dipakai tier mana pun; dipakai cleanup untuk buang
// bucket yang pasti sudah kedaluwarsa.
const MAX_WINDOW_MS = 30 * 60 * 1000;

// Prune berkala supaya Map tidak tumbuh tanpa batas (anti memory-leak saat
// diserang banyak IP palsu). Timer di-unref agar tidak menahan proses exit.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const cleanupTimer = setInterval(() => {
  const cutoff = Date.now() - MAX_WINDOW_MS;
  for (const [key, bucket] of buckets) {
    const newest = bucket.hits[bucket.hits.length - 1];
    if (newest === undefined || newest < cutoff) buckets.delete(key);
  }
}, CLEANUP_INTERVAL_MS);
cleanupTimer.unref?.();

export const STRICT_WINDOW_MS = 15 * 60 * 1000;
export const STRICT_MAX = 5;

export const NORMAL_WINDOW_MS = 15 * 60 * 1000;
export const NORMAL_MAX = 100;

const DEFAULT_MESSAGE = "Terlalu banyak permintaan. Coba lagi beberapa menit lagi.";

/** IP klien dari proxy headers (Render/Vercel meneruskan x-forwarded-for). */
export function getClientIp(c: Context): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown"
  );
}

// Ambil nomor telepon mentah dari body JSON untuk keperluan keying STRICT.
// Normalisasi penuh tetap dilakukan handler; di sini cukup digit saja agar
// middleware tidak bergantung pada lib whatsapp (tetap mudah di-test).
async function phoneKeyPart(c: Context): Promise<string> {
  try {
    // Hono meng-cache hasil parse body — handler masih bisa memanggil
    // c.req.json() lagi setelah ini tanpa error "body already consumed".
    const body = await c.req.json();
    const digits = String(body?.phone ?? "")
      .replace(/\D+/g, "")
      .slice(0, 20);
    return digits || "-";
  } catch {
    return "-";
  }
}

function recordHit(
  key: string,
  now: number,
  windowMs: number,
  max: number,
): { allowed: boolean; retryAfterSec: number } {
  const hits = (buckets.get(key)?.hits ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= max) {
    buckets.set(key, { hits });
    const oldest = hits[0];
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  hits.push(now);
  buckets.set(key, { hits });
  return { allowed: true, retryAfterSec: 0 };
}

/** Pabrik middleware rate limit generik. */
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, keyGenerator, message = DEFAULT_MESSAGE } = options;

  return async (c: Context, next: Next) => {
    // Preflight CORS jangan dihitung — bisa menghabiskan kuota sia-sia.
    if (c.req.method === "OPTIONS") return next();

    const identity = keyGenerator ? await keyGenerator(c) : getClientIp(c);
    const { allowed, retryAfterSec } = recordHit(
      identity,
      Date.now(),
      windowMs,
      max,
    );

    if (!allowed) {
      c.header("Retry-After", String(retryAfterSec));
      return c.json({ error: message }, 429);
    }

    await next();
  };
}

// ── Tingkat STRICT: endpoint OTP WhatsApp (per IP + nomor telepon) ──
export function strictOtpRateLimit() {
  return rateLimit({
    windowMs: STRICT_WINDOW_MS,
    max: STRICT_MAX,
    keyGenerator: async (c) => `${getClientIp(c)}:${await phoneKeyPart(c)}`,
    message:
      "Terlalu banyak percobaan. Coba lagi dalam 15 menit atau hubungi dukungan.",
  });
}

// ── Tingkat NORMAL: seluruh /api/* (per IP) ──
export const normalRateLimit = rateLimit({
  windowMs: NORMAL_WINDOW_MS,
  max: NORMAL_MAX,
});
