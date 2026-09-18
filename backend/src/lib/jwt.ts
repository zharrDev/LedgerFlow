import { SignJWT, jwtVerify } from "jose";
import crypto from "node:crypto";

// JWT_SECRET wajib ada dan cukup kuat. Tidak ada fallback: bila kosong,
// token bisa dipalsukan siapa pun. Fail-fast saat startup.
const rawSecret = process.env.JWT_SECRET;
if (!rawSecret || rawSecret.length < 32) {
  throw new Error(
    "JWT_SECRET wajib diset dan minimal 32 karakter. Set env JWT_SECRET yang kuat.",
  );
}

const secret = new TextEncoder().encode(rawSecret);

// Struktur payload JWT yang dipakai di aplikasi
export interface JWTPayload {
  sub: string; // user id
  // Opsional: user WhatsApp tidak punya email.
  email?: string;
  name?: string;
  role: "akuntan" | "owner";
  company_id: string;
}

// Membuat token login untuk user (access token, expiry 1 hari)
export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(secret);
}

// Memverifikasi token dan mengambil isi payload-nya
export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as JWTPayload;
}

// ============================================================================
// REFRESH TOKEN
// ============================================================================
// Refresh token disimpan di DB (hashed). Access token (JWT) expiry 1 hari,
// refresh token expiry 7 hari. Rotasi: saat refresh, token lama direvoke,
// token baru dibuat. Access token baru + refresh token baru dikembalikan.

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string; // ID baris di DB refresh_tokens
}

export const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// Generate refresh token (opaque random string), return (plainToken, hashedToken)
export async function generateRefreshToken(): Promise<{
  plain: string;
  hash: string;
}> {
  const plain = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(plain).digest("hex");
  return { plain, hash };
}

// Hash refresh token untuk disimpan di DB
export function hashRefreshToken(plain: string): string {
  return crypto.createHash("sha256").update(plain).digest("hex");
}

// Sign refresh token payload (minimal payload, hanya sub + tokenId)
export async function signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_EXPIRY_DAYS}d`)
    .sign(secret);
}

// Verify refresh token (signature + expiry)
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as RefreshTokenPayload;
}
