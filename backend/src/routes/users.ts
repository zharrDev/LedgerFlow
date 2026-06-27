import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";

const users = new Hono();

// GET /api/users/:id
// Ambil profil user beserta avatar dan nama company
users.get("/:id", async (c) => {
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, company_id, created_at")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[Users] GET error:", error);
    return c.json({ error: error.message }, 404);
  }

  let avatarUrl: string | null = null;
  const { data: authUser } = await supabase.auth.admin.getUserById(id);
  if (authUser?.user?.user_metadata?.avatar_url) {
    avatarUrl = authUser.user.user_metadata.avatar_url;
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", data.company_id)
    .single();

  return c.json({
    ...data,
    avatar_url: avatarUrl,
    company_name: company?.name || "",
  });
});

// PUT /api/users/:id
// Update profil publik user dan avatar metadata di Supabase Auth
users.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const publicUpdates: Record<string, any> = {};
  if (body.name !== undefined) publicUpdates.name = body.name;

  if (Object.keys(publicUpdates).length > 0) {
    const { error: pubErr } = await supabase
      .from("users")
      .update(publicUpdates)
      .eq("id", id);

    if (pubErr) {
      console.error("[Users] PUT public error:", pubErr);
      return c.json({ error: pubErr.message }, 500);
    }
  }

  let avatarUrl: string | null = null;
  if (body.avatar_url !== undefined) {
    avatarUrl = body.avatar_url;

    const { data: authUser } = await supabase.auth.admin.getUserById(id);
    const currentMetadata = authUser?.user?.user_metadata || {};

    const { error: metaErr } = await supabase.auth.admin.updateUserById(id, {
      user_metadata: {
        ...currentMetadata,
        avatar_url: body.avatar_url,
      },
    });

    if (metaErr) {
      console.error("[Users] PUT metadata error:", metaErr);
      // Avatar dianggap non-kritis, jadi request utama tetap dilanjutkan
    }
  } else {
    const { data: authUser } = await supabase.auth.admin.getUserById(id);
    if (authUser?.user?.user_metadata?.avatar_url) {
      avatarUrl = authUser.user.user_metadata.avatar_url;
    }
  }

  const { data: freshData, error: freshErr } = await supabase
    .from("users")
    .select("id, name, email, role, company_id")
    .eq("id", id)
    .single();

  if (freshErr) {
    console.error("[Users] PUT fresh fetch error:", freshErr);
    return c.json({ error: freshErr.message }, 500);
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", freshData.company_id)
    .single();

  return c.json({
    ...freshData,
    avatar_url: avatarUrl,
    company_name: company?.name || "",
  });
});

export default users;
