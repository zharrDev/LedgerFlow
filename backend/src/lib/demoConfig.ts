// ============================================================================
// DEMO MODE — nomor & whitelist akun demo (satu sumber kebenaran)
// ============================================================================
// Dipakai oleh scripts/seed-demo.ts (sinkronisasi nomor ke akun demo) dan
// routes/wa-auth.ts (whitelist bypass OTP saat DEMO_MODE_ENABLED=true).
// HANYA untuk lingkungan demo/staging — JANGAN aktifkan DEMO_MODE_ENABLED
// di production dengan data user asli.
import { loadEnv } from "./env.js";
import { normalizePhoneNumber } from "./whatsapp.js";

loadEnv();

const DEMO_OWNER_PHONE =
  process.env.DEMO_OWNER_PHONE?.trim() || "081234567890";
const DEMO_AKUNTAN_PHONE =
  process.env.DEMO_AKUNTAN_PHONE?.trim() || "081245678901";

// Nomor demo keyed by email — jangan duplikasi hardcode di tempat lain,
// selalu import dari sini.
export const DEMO_PHONES: Record<string, string> = {
  "owner@demo.com": DEMO_OWNER_PHONE,
  "akuntan@demo.com": DEMO_AKUNTAN_PHONE,
};

// Whitelist dalam bentuk E.164 yang sama dengan hasil normalisasi di
// wa-auth.ts (mis. "6281234567890"). Nomor env yang tidak valid dilewati
// (bukan crash di startup).
export const DEMO_PHONE_SET: ReadonlySet<string> = new Set(
  Object.values(DEMO_PHONES)
    .map((raw) => {
      try {
        return normalizePhoneNumber(raw);
      } catch {
        return null;
      }
    })
    .filter((p): p is string => p !== null),
);