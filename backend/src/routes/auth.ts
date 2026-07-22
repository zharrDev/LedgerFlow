import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { signToken } from "../lib/jwt.js";

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
      })
      .select()
      .single();

    if (userError) {
      return c.json(
        { step: "create_user_profile", error: userError.message },
        500,
      );
    }

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
          company_name: company.name,
          avatar_url: null,
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

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const { data: user, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (profileError || !user) {
    return c.json(
      { error: "User profile not found. Please register first." },
      404,
    );
  }

  const companyName = await getCompanyName(user.company_id);

  const token = await signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    company_id: user.company_id,
  });

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

    const { data: user, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (profileError?.code === "PGRST116" || !user) {
      console.log("USER NOT FOUND — rejecting login, must register first");

      await supabase.auth.admin.deleteUser(authUser.id);

      return c.json(
        {
          error: "NOT_REGISTERED",
          message: "Akun belum terdaftar. Silakan register terlebih dahulu.",
        },
        403,
      );
    }

    if (profileError) {
      return c.json({ error: profileError.message }, 500);
    }

    const companyName = await getCompanyName(user.company_id);

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
    });

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

export default auth;
