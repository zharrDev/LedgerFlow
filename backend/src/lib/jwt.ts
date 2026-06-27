import { SignJWT, jwtVerify } from "jose";

// Debug: cek apakah JWT secret sudah terbaca dari environment
console.log("JWT_SECRET =", process.env.JWT_SECRET);

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "fallback-secret-change-in-production",
);

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
    .setExpirationTime("7d")
    .sign(secret);
}

// Memverifikasi token dan mengambil isi payload-nya
export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as JWTPayload;
}
