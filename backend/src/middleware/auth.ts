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

    // ── Verifikasi membership dari company_members (SUMBER KEBENARAN) ──
    // Role & keanggotaan TIDAK lagi dibaca dari tabel users (yang kini murni
    // profil). Setiap request: user harus masih terdaftar dengan status
    // 'active' di company yang tercantum di token. Ini menutup celah token
    // lama yang masih valid setelah user dihapus dari company, di-suspend,
    // atau role-nya berubah — semuanya terdeteksi real-time di sini (token
    // berlaku 1 hari; tanpa cek ini token itu tetap hidup sampai expire).
    // Role di context diambil dari DB (bukan dari JWT) sehingga stale role di
    // token lama tidak bisa dipakai untuk privilege escalation.
    const { data: membership, error: memberError } = await supabase
      .from("company_members")
      .select("role, status")
      .eq("user_id", user.sub)
      .eq("company_id", user.company_id)
      .maybeSingle();

    if (memberError) {
      console.error("AUTH MEMBERSHIP CHECK ERROR =", memberError);
      return c.json({ error: "Internal server error" }, 500);
    }

    if (!membership || membership.status !== "active") {
      return c.json({ error: "Sesi tidak valid, silakan login ulang" }, 401);
    }

    // ── Cek status suspend GLOBAL (moderasi admin aplikasi) ──
    // Berbeda dari suspend per-company di company_members (di atas), ini
    // menonaktifkan user di seluruh aplikasi. Kolom `status` ada sejak
    // migrasi migration-admin-suspend.sql; jika kolom belum ada (undefined)
    // → fail-open (perilaku lama) agar tidak mengunci semua user.
    const { data: freshUser, error: dbError } = await supabase
      .from("users")
      .select("status")
      .eq("id", user.sub)
      .maybeSingle();

    if (dbError) {
      console.error("AUTH DB CHECK ERROR =", dbError);
      return c.json({ error: "Internal server error" }, 500);
    }

    if (!freshUser) {
      return c.json({ error: "Invalid or expired token" }, 401);
    }

    if (freshUser.status === "suspended") {
      return c.json(
        {
          error:
            "Akun dinonaktifkan sementara oleh administrator. Hubungi dukungan.",
        },
        403,
      );
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("status")
      .eq("id", user.company_id)
      .maybeSingle();

    if (companyError) {
      console.error("AUTH COMPANY CHECK ERROR =", companyError);
      return c.json({ error: "Internal server error" }, 500);
    }

    if (!company || company.status === "suspended") {
      return c.json(
        {
          error:
            "Perusahaan dinonaktifkan sementara oleh administrator. Hubungi dukungan.",
        },
        403,
      );
    }

    c.set("user", {
      ...user,
      role: membership.role, // role segar dari company_members, bukan dari JWT
    }); // simpan payload user (role segar dari DB) ke context
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
