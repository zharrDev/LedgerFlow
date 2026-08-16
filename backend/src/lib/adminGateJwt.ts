import { SignJWT, jwtVerify } from "jose";
import { loadEnv } from "./env.js";

loadEnv();

// JWT untuk gerbang admin (dashboard admin khusus). Sengaja TERPISAH dari
// token user biasa (lib/jwt.ts):
//   - payload minimal { type: "admin-gate" } — TIDAK memuat sub/role/company_id
//   - TTL pendek (6 jam)
// Dengan begitu token ini tidak bisa disalahgunakan untuk mengakses endpoint
// user biasa (authMiddleware menolak karena tidak ada company_id/role), dan
// token user biasa juga tidak bisa dipakai di dashboard admin (middleware
// verifyAdminGateToken hanya menerima type === "admin-gate").
const rawSecret = process.env.JWT_SECRET;
if (!rawSecret || rawSecret.length < 32) {
  throw new Error(
    "JWT_SECRET wajib diset dan minimal 32 karakter. Set env JWT_SECRET yang kuat.",
  );
}

const secret = new TextEncoder().encode(rawSecret);

export const ADMIN_GATE_TTL_SECONDS = 6 * 60 * 60; // 6 jam

export interface AdminGatePayload {
  type: "admin-gate";
  iat?: number;
  exp?: number;
}

// Membuat token admin-gate baru (tanpa identitas per-akun, hanya type).
export async function signAdminGateToken(): Promise<string> {
  return new SignJWT({ type: "admin-gate" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_GATE_TTL_SECONDS}s`)
    .sign(secret);
}

// Memverifikasi token admin-gate. HANYA menerima payload dengan
// type === "admin-gate" — token user biasa (yang tidak punya type ini)
// otomatis ditolak.
export async function verifyAdminGateToken(
  token: string,
): Promise<AdminGatePayload> {
  const { payload } = await jwtVerify(token, secret);
  if (payload.type !== "admin-gate") {
    throw new Error("Token bukan admin-gate");
  }
  return payload as unknown as AdminGatePayload;
}
