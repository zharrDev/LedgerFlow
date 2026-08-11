import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { authClient } from "../lib/authClient.js";
import { signToken } from "../lib/jwt.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  sendWelcomeEmail,
  sendLoginNotification,
  sendMemberLoginNotification,
} from "../lib/email.js";
import { ensureUserProfile } from "../lib/ensureProfile.js";

const auth = new Hono();

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

// Helper: beri tahu owner perusahaan jika member lain login
async function notifyCompanyOwners(
  companyId: string,
  actor: { id: string; name: string; email: string },
  meta: { device: string; ip: string },
) {
  try {
    const { data: owners } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("company_id", companyId)
      .eq("role", "owner")
      .neq("id", actor.id);

    if (!owners?.length) return;

    for (const owner of owners) {
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

// POST /api/auth/register
// Alur: buat company -> buat auth user -> buat profil user -> kirim JWT

auth.post("/register", async (c) => {
  try {
    const { email, password, name, company_name } = await c.req.json();

    if (!email || !password || !name || !company_name) {
      return c.json({ error: "All fields are required" }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: "Format email tidak valid." }, 400);
    }
    if (password.length < 8) {
      return c.json({ error: "Password minimal 8 karakter." }, 400);
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({ name: company_name, currency: "IDR" })
      .select()
      .single();

    if (companyError) {
      return c.json(
        { step: "create_company", error: companyError.message },
        500,
      );
    }

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      return c.json(
        { step: "create_auth_user", error: authError.message },
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
      return c.json(
        { step: "create_user_profile", error: userError.message },
        500,
      );
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
    return c.json(
      {
        step: "catch_block",
        error: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }
});

// POST /api/auth/login
// Login via Supabase Auth, lalu ambil profil aplikasi dan buat JWT internal

auth.post("/login", async (c) => {
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: "Email and password required" }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: "Format email tidak valid." }, 400);
  }

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
    return c.json({ error: profileError.message }, 500);
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
      return c.json(
        {
          error: err instanceof Error ? err.message : "Gagal membuat profil",
        },
        500,
      );
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

  const companyName = await getCompanyName(user.company_id);

  const token = await signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    company_id: user.company_id,
  });

  sendLoginNotification(user.email, user.name, {
    companyName,
    device: parseUserAgent(c.req.header("user-agent") || ""),
    ip: getClientIp(c),
  }).catch(console.error);

  notifyCompanyOwners(
    user.company_id,
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
      role: user.role,
      company_id: user.company_id,
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
      return c.json({ error: profileError.message }, 500);
    }

    if (!user) {
      console.log("PROFILE NOT FOUND — auto-provisioning profil (Google sign-up)");
      try {
        const provisioned = await ensureUserProfile(authUser);
        user = provisioned.user;
      } catch (err) {
        console.error("AUTO-PROVISION ERROR:", err);
        return c.json(
          {
            error: err instanceof Error ? err.message : "Gagal membuat profil",
          },
          500,
        );
      }
    }

    const companyName = await getCompanyName(user.company_id);

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
    });

    sendLoginNotification(user.email, user.name, {
      companyName,
      device: parseUserAgent(c.req.header("user-agent") || ""),
      ip: getClientIp(c),
    }).catch(console.error);

    notifyCompanyOwners(
      user.company_id,
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
        role: user.role,
        company_id: user.company_id,
        company_name: companyName,
        avatar_url: user.avatar_url || null,
      },
    });
  } catch (err) {
    console.error("EXCHANGE TOKEN ERROR:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Authentication failed" },
      400,
    );
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
