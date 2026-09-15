import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { dbErrorResponse } from "../lib/errors.js";
import { signToken } from "../lib/jwt.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  sendLoginNotification,
  sendMemberLoginNotification,
} from "../lib/email.js";
import { ensureUserProfile } from "../lib/ensureProfile.js";

const auth = new Hono();

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
// tidak ada/ tidak aktif, pakai membership aktif tertua. Nama company di-
// embed (FK ke companies) supaya tanpa query tambahan — login lebih cepat.
async function resolveActiveMembership(
  userId: string,
  preferredCompanyId?: string | null,
): Promise<{
  company_id: string;
  role: "owner" | "akuntan";
  company_name: string;
} | null> {
  const { data: memberships, error } = await supabase
    .from("company_members")
    .select("company_id, role, companies(name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!memberships?.length) return null;
  const m =
    memberships.find((x) => x.company_id === preferredCompanyId) ??
    memberships[0];
  const companies = m.companies as unknown as { name?: string } | null;
  return {
    company_id: m.company_id,
    role: m.role as "owner" | "akuntan",
    company_name: companies?.name ?? "",
  };
}

// POST /api/auth/register — DINONAKTIFKAN.
// Pendaftaran email/password dimatikan: gunakan WhatsApp OTP atau Google.
// Akun password lama tetap bisa masuk via Google (email yang sama).
auth.post("/register", async (c) => {
  return c.json(
    {
      error:
        "Pendaftaran email dinonaktifkan. Daftar dengan WhatsApp OTP atau Google.",
    },
    410,
  );
});

// POST /api/auth/login — DINONAKTIFKAN.
// Login email/password dimatikan: gunakan WhatsApp OTP atau Google.
auth.post("/login", async (c) => {
  return c.json(
    {
      error:
        "Login password dinonaktifkan. Masuk dengan WhatsApp OTP atau Google.",
    },
    410,
  );
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
    let membership: {
      company_id: string;
      role: "owner" | "akuntan";
      company_name: string;
    } | null;
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

    const companyName = membership.company_name;

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

// GET /api/auth/my-companies
// Daftar SEMUA company yang tergabung dengan user ini (dari company_members,
// join companies untuk nama — satu query). Dipakai dropdown pindah company
// di sidebar; user multi-company mendapat lebih dari satu baris.
auth.get("/my-companies", authMiddleware, async (c) => {
  const { sub } = c.get("user");

  const { data: memberships, error } = await supabase
    .from("company_members")
    .select("company_id, role, status, created_at, companies(name)")
    .eq("user_id", sub)
    .order("created_at", { ascending: true });

  if (error) return dbErrorResponse(c, error);

  return c.json({
    data: (memberships ?? []).map((m) => ({
      company_id: m.company_id,
      name:
        (m.companies as unknown as { name?: string } | null)?.name ?? "",
      role: m.role,
      status: m.status,
      joined_at: m.created_at,
    })),
  });
});

// POST /api/auth/switch-company — body { company_id }
// Pindah company aktif: validasi user member AKTIF di company tujuan, lalu
// keluarkan JWT BARU dengan company_id + role sesuai company tersebut (role
// bisa berbeda per company — dibaca dari company_members, bukan token lama).
auth.post("/switch-company", authMiddleware, async (c) => {
  const current = c.get("user");
  let body: { company_id?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Body JSON tidak valid" }, 400);
  }
  const companyId = typeof body.company_id === "string" ? body.company_id : "";
  if (!companyId) {
    return c.json({ error: "company_id wajib diisi." }, 400);
  }

  const { data: membership, error: memberError } = await supabase
    .from("company_members")
    .select("company_id, role, companies(name)")
    .eq("user_id", current.sub)
    .eq("company_id", companyId)
    .eq("status", "active")
    .maybeSingle();

  if (memberError) return dbErrorResponse(c, memberError);
  if (!membership) {
    return c.json(
      { error: "Anda bukan anggota aktif perusahaan tersebut." },
      403,
    );
  }

  const companyName =
    (membership.companies as unknown as { name?: string } | null)?.name ?? "";

  const token = await signToken({
    sub: current.sub,
    email: current.email,
    role: membership.role as "owner" | "akuntan",
    company_id: membership.company_id,
  });

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, avatar_url")
    .eq("id", current.sub)
    .single();

  console.log(
    `[auth] switch-company: ${current.sub} ${current.company_id} -> ${membership.company_id} (role=${membership.role})`,
  );

  return c.json({
    token,
    user: {
      id: profile?.id ?? current.sub,
      name: profile?.name ?? "",
      email: profile?.email ?? current.email,
      role: membership.role,
      company_id: membership.company_id,
      company_name: companyName,
      avatar_url: profile?.avatar_url ?? null,
    },
  });
});

export default auth;
