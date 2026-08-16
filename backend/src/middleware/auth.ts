import { createMiddleware } from "hono/factory";
import { verifyToken, type JWTPayload } from "../lib/jwt.js";
import { supabase } from "../lib/supabase.js";

// Tambahkan typed variable 'user' ke context Hono agar bisa dipakai di route lain
// Setelah authMiddleware sukses, c.get("user") akan berisi payload JWT user

declare module "hono" {
  interface ContextVariableMap {
    user: JWTPayload;
  }
}

// Validasi format UUID untuk memastikan company_id di token benar
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Middleware utama autentikasi
// Tugasnya: ambil Bearer token -> verifikasi JWT -> simpan user ke context
export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7); // ambil token tanpa prefix "Bearer "

  try {
    const user = await verifyToken(token); // verifikasi token JWT

    // Token admin-gate (dashboard admin khusus) TIDAK boleh dipakai di
    // endpoint user biasa — payload-nya tidak punya company_id, cek eksplisit
    // di sini sebagai lapisan kedua.
    if ((user as any).type === "admin-gate") {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (!user?.company_id) {
      return c.json(
        { error: "Invalid token payload: missing company_id" },
        401,
      );
    }

    if (!UUID_REGEX.test(user.company_id)) {
      console.error("Invalid company_id in JWT:", user.company_id);

      return c.json(
        { error: "Invalid token payload: company_id must be UUID" },
        401,
      );
    }

    // ── Revalidasi role & company_id dari database (anti stale-JWT) ──
    // Role/company di-bake ke token selama 1 hari. Jika user di-demote,
    // dihapus, atau dipindah company, token lama masih membawa role lama
    // sampai expire — itu celah privilege escalation. Karena itu, cek ulang
    // setiap request: user harus masih ada, dan role/company_id di token
    // harus sama dengan yang tersimpan saat ini. Kalau beda → tolak (401).
    const { data: freshUser, error: dbError } = await supabase
      .from("users")
      .select("id, role, company_id")
      .eq("id", user.sub)
      .maybeSingle();

    if (dbError) {
      console.error("AUTH DB CHECK ERROR =", dbError);
      return c.json({ error: "Internal server error" }, 500);
    }

    if (!freshUser) {
      return c.json({ error: "Invalid or expired token" }, 401);
    }

    if (freshUser.role !== user.role || freshUser.company_id !== user.company_id) {
      return c.json({ error: "Invalid or expired token" }, 401);
    }

    c.set("user", {
      ...user,
      role: freshUser.role,
      company_id: freshUser.company_id,
    }); // simpan payload user (role/company segar dari DB) ke context
    await next(); // lanjut ke middleware/handler selanjutnya
  } catch (err) {
    console.error("JWT ERROR =", err);

    return c.json({ error: "Invalid or expired token" }, 401);
  }
});

// Middleware role-based access control
// Hanya user dengan role tertentu yang boleh mengakses endpoint
export const requireRole = (...roles: JWTPayload["role"][]) =>
  createMiddleware(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (!roles.includes(user.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    await next();
  });
