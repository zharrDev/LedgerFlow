import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { dbErrorResponse } from "../lib/errors.js";
import { authClient } from "../lib/authClient.js";
import { signToken } from "../lib/jwt.js";
import { authMiddleware } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  sendWelcomeEmail,
  sendLoginNotification,
  sendMemberLoginNotification,
} from "../lib/email.js";
import { ensureUserProfile } from "../lib/ensureProfile.js";

const auth = new Hono();

// ── Schema zod: validasi STRUKTUR & TIPE body request ────────────────
// Business rule (Supabase auth, verifikasi email, suspend) tetap di handler.

const registerSchema = z.object({
  email: z.email("Format email tidak valid."),
  password: z.string().min(8, "Password minimal 8 karakter."),
  name: z.string().trim().min(1, "name wajib diisi"),
  company_name: z.string().trim().min(1, "company_name wajib diisi"),
});

const loginSchema = z.object({
  email: z.email("Format email tidak valid."),
  password: z.string().min(1, "password wajib diisi"),
});

// Helper: ambil nama company dari company_id
async function getCompanyName(companyId: string): Promise<string> {
  const { data } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();
  return data?.name || "";
}

// Helper: terjemahkan User-Agent menjadi info perangkat yang mudah dibaca
function parseUserAgent(ua: string): string {
  if (!ua) return "Perangkat tidak dikenal";
  const browser = ua.includes("Edg/")
    ? "Microsoft Edge"
    : ua.includes("Chrome/")
      ? "Chrome"
      : ua.includes("Firefox/")
        ? "Firefox"
        : ua.includes("Safari/")
          ? "Safari"
          : ua.includes("OPR/")
            ? "Opera"
            : "Browser";
  const os = ua.includes("Windows")
    ? "Windows"
    : ua.includes("Mac OS")
      ? "macOS"
      : ua.includes("Android")
        ? "Android"
        : ua.includes("iPhone") || ua.includes("iPad")
          ? "iOS"
          : ua.includes("Linux")
            ? "Linux"
            : "OS";
  return `${browser} · ${os}`;
}

// Helper: ambil IP client (menghormati proxy/load balancer)
function getClientIp(c: any): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "Tidak diketahui"
  );
}

// Helper: beri tahu owner perusahaan jika member lain login.
// Owner diambil dari company_members (sumber kebenaran) — company_members
// menunjuk auth.users (bukan public.users) sehingga join via PostgREST tidak
// bisa; profil owner diambil lewat query terpisah lalu digabung manual.
async function notifyCompanyOwners(
  companyId: string,
  actor: { id: string; name: string; email: string },
  meta: { device: string; ip: string },
) {
  try {
    const { data: memberships, error: memberErr } = await supabase
      .from("company_members")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("role", "owner")
      .eq("status", "active")
      .neq("user_id", actor.id);

    if (memberErr) throw memberErr;
    if (!memberships?.length) return;

    const ownerIds = memberships.map((m) => m.user_id);
    const { data: owners } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", ownerIds);

    if (!owners?.length) return;

    for (const owner of owners) {
      if (!owner.email) continue; // anggota WA-only tidak bisa dinotifikasi email
      sendMemberLoginNotification(
        owner.email,
        owner.name,
        actor.name,
        actor.email,
        meta,
      ).catch(console.error);
    }
  } catch (err) {
    console.error("notifyCompanyOwners error:", err);
  }
}

// Helper: resolve membership AKTIF user dari company_members (sumber
// kebenaran role & company). User bisa punya banyak company — kalau ada,
// pilih yang cocok dengan company default legacy di profil (users.company_id)
// supaya user lama mendarat di company yang sama seperti sebelumnya; kalau
// tidak ada/ tidak aktif, pakai membership aktif tertua.
async function resolveActiveMembership(
  userId: string,
  preferredCompanyId?: string | null,
): Promise<{ company_id: string; role: "owner" | "akuntan" } | null> {
  const { data: memberships, error } = await supabase
    .from("company_members")
    .select("company_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!memberships?.length) return null;
  return (
    memberships.find((m) => m.company_id === preferredCompanyId) ??
    memberships[0]
  );
}

// Rate-limit kasar per-IP untuk login/register email-password (in-memory;
// cukup untuk mencegah brute-force per instance). 10 percobaan per 15 menit.
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_PER_IP = 10;
const authHits = new Map<string, number[]>();

function checkAuthRateLimit(c: any): boolean {
  const ip = getClientIp(c);
  const now = Date.now();
  const hits = (authHits.get(ip) ?? []).filter((t) => now - t < AUTH_WINDOW_MS);
  if (hits.length >= AUTH_MAX_PER_IP) {
    authHits.set(ip, hits);
    return false;
  }
  authHits.set(ip, [...hits, now]);
  return true;
}

// POST /api/auth/register
// Alur: buat company -> buat auth user -> buat profil user -> kirim JWT

auth.post("/register", validateBody(registerSchema), async (c) => {
  try {
    if (!checkAuthRateLimit(c)) {
      return c.json(
        { error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." },
        429,
      );
    }

    // (email, password, name & company_name sudah divalidasi zod di atas.)
    const { email, password, name, company_name } = c.get("validatedBody") as z.infer<
      typeof registerSchema
    >;

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({ name: company_name, currency: "IDR" })
      .select()
      .single();

    if (companyError) {
      console.error("REGISTER create_company error:", companyError);
      return c.json({ error: "Gagal mendaftar. Silakan coba lagi." }, 500);
    }

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      console.error("REGISTER create_auth_user error:", authError);
      return c.json(
        { error: "Gagal membuat akun. Email mungkin sudah terdaftar." },
        400,
      );
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        id: authData.user.id,
        company_id: company.id,
        email,
        name,
        role: "owner",
        email_verified: true,
      })
      .select()
      .single();

    if (userError) {
      console.error("REGISTER create_user_profile error:", userError);
      return c.json({ error: "Gagal mendaftar. Silakan coba lagi." }, 500);
    }

    // Relasi M:M — daftarkan user sebagai member company
    await supabase.from("company_members").insert({
      user_id: user.id,
      company_id: company.id,
      role: "owner",
    });

    // Tanpa OTP: akun langsung verified. Welcome email dikirim best-effort
    // (gagal tidak menghalangi registrasi; dari prod akan jalan setelah
    // domain pengirim diaktifkan).
    sendWelcomeEmail(user.email, user.name, company.name).catch((err) => {
      console.error("SEND WELCOME EMAIL GAGAL:", err);
    });

    const companyName = await getCompanyName(user.company_id);

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
    });

    return c.json(
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          company_id: user.company_id,
          company_name: companyName,
          avatar_url: user.avatar_url || null,
        },
      },
      201,
    );
  } catch (err) {
    console.error("REGISTER CRASH:", err);
    return dbErrorResponse(c, err);
  }
});

// POST /api/auth/login
// Login via Supabase Auth, lalu ambil profil aplikasi dan buat JWT internal

auth.post("/login", validateBody(loginSchema), async (c) => {
  if (!checkAuthRateLimit(c)) {
    return c.json(
      { error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." },
      429,
    );
  }

  // (email & password sudah divalidasi zod di atas.)
  const { email, password } = c.get("validatedBody") as z.infer<
    typeof loginSchema
  >;

  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  let { data: user, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    return dbErrorResponse(c, profileError);
  }

  if (!user) {
    console.log(
      "LOGIN — profile not found, auto-healing (buat profil otomatis)",
    );
    try {
      const provisioned = await ensureUserProfile(data.user);
      user = provisioned.user;
    } catch (err) {
      console.error("AUTO-HEAL ERROR:", err);
      return dbErrorResponse(c, err, "Gagal membuat profil");
    }
  }

  // Gate verifikasi email. Pakai `=== false` supaya bila kolom belum ada
  // (undefined, mis. migrasi belum jalan) tidak mengunci siapa pun (fail-open).
  if (user.email_verified === false) {
    return c.json(
      {
        error: "Email belum diverifikasi.",
        email: user.email,
      },
      403,
    );
  }

  // Gate status suspend (moderasi admin). Kolom `status` ada sejak migrasi
  // migration-admin-suspend.sql; bila undefined → fail-open.
  if (user.status === "suspended") {
    return c.json(
      {
        error:
          "Akun dinonaktifkan sementara oleh administrator. Hubungi dukungan.",
      },
      403,
    );
  }

  // ── Resolve company & role dari company_members (sumber kebenaran) ──
  // User multi-company login ke company default-nya (membership aktif).
  let membership: { company_id: string; role: "owner" | "akuntan" } | null;
  try {
    membership = await resolveActiveMembership(user.id, user.company_id);
  } catch (err) {
    return dbErrorResponse(c, err);
  }
  if (!membership) {
    return c.json(
      {
        error:
          "Anda belum terhubung ke perusahaan mana pun. Minta pemilik perusahaan mengundang Anda kembali.",
      },
      403,
    );
  }

  const companyName = await getCompanyName(membership.company_id);

  const token = await signToken({
    sub: user.id,
    email: user.email,
    role: membership.role,
    company_id: membership.company_id,
  });

  sendLoginNotification(user.email, user.name, {
    companyName,
    device: parseUserAgent(c.req.header("user-agent") || ""),
    ip: getClientIp(c),
  }).catch(console.error);

  notifyCompanyOwners(
    membership.company_id,
    { id: user.id, name: user.name, email: user.email },
    {
      device: parseUserAgent(c.req.header("user-agent") || ""),
      ip: getClientIp(c),
    },
  );

  return c.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: membership.role,
      company_id: membership.company_id,
      company_name: companyName,
      avatar_url: user.avatar_url || null,
    },
  });
});

// POST /api/auth/exchange-token
// Menukar token Supabase/OAuth menjadi JWT internal aplikasi
// User yang belum punya profil di tabel users akan ditolak

auth.post("/exchange-token", async (c) => {
  try {
    const { supabase_token } = await c.req.json();

    if (!supabase_token) {
      return c.json({ error: "supabase_token is required" }, 400);
    }

    const {
      data: { user: authUser },
      error: verifyError,
    } = await supabase.auth.getUser(supabase_token);

    if (verifyError || !authUser) {
      console.error("Token verification failed:", verifyError);
      return c.json({ error: "Invalid Supabase token" }, 401);
    }

    const email = authUser.email!;
    const name =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      email.split("@")[0];

    console.log("EXCHANGE TOKEN - OAuth user:", { email, name });

    let { data: user, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (profileError) {
      return dbErrorResponse(c, profileError);
    }

    if (!user) {
      console.log("PROFILE NOT FOUND — auto-provisioning profil (Google sign-up)");
      try {
        const provisioned = await ensureUserProfile(authUser);
        user = provisioned.user;
      } catch (err) {
        console.error("AUTO-PROVISION ERROR:", err);
        return dbErrorResponse(c, err, "Gagal membuat profil");
      }
    }

    // ── Resolve company & role dari company_members (sumber kebenaran) ──
    let membership: { company_id: string; role: "owner" | "akuntan" } | null;
    try {
      membership = await resolveActiveMembership(user.id, user.company_id);
    } catch (err) {
      return dbErrorResponse(c, err);
    }
    if (!membership) {
      return c.json(
        {
          error:
            "Anda belum terhubung ke perusahaan mana pun. Minta pemilik perusahaan mengundang Anda kembali.",
        },
        403,
      );
    }

    const companyName = await getCompanyName(membership.company_id);

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: membership.role,
      company_id: membership.company_id,
    });

    sendLoginNotification(user.email, user.name, {
      companyName,
      device: parseUserAgent(c.req.header("user-agent") || ""),
      ip: getClientIp(c),
    }).catch(console.error);

    notifyCompanyOwners(
      membership.company_id,
      { id: user.id, name: user.name, email: user.email },
      {
        device: parseUserAgent(c.req.header("user-agent") || ""),
        ip: getClientIp(c),
      },
    );

    console.log("EXCHANGE TOKEN SUCCESS");

    return c.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: membership.role,
        company_id: membership.company_id,
        company_name: companyName,
        avatar_url: user.avatar_url || null,
      },
    });
  } catch (err) {
    console.error("EXCHANGE TOKEN ERROR:", err);
    return dbErrorResponse(c, err, "Authentication failed");
  }
});

// POST /api/auth/logout
// Client-side session (JWT stateless) — endpoint ini menandai logout sukses
// dan bisa dipakai untuk audit/monitoring sesi

auth.post("/logout", authMiddleware, async (c) => {
  const user = c.get("user");
  console.log("LOGOUT:", { sub: user?.sub, email: user?.email });
  return c.json({ message: "Logout berhasil." });
});

export default auth;
