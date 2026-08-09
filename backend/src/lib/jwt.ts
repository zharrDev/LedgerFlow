import { SignJWT, jwtVerify } from "jose";

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
  email: string;
  role: "admin" | "akuntan" | "owner";
  company_id: string;
}

// Membuat token login untuk user
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
