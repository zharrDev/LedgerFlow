import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";

const users = new Hono();

// GET /api/users/:id
// Ambil profil user beserta avatar dan nama company
users.get("/:id", async (c) => {
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, company_id, avatar_url, created_at")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[Users] GET error:", error);
    return c.json({ error: error.message }, 404);
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", data.company_id)
    .single();

  return c.json({
    ...data,
    avatar_url: data.avatar_url || null,
    company_name: company?.name || "",
  });
});

// PUT /api/users/:id
// Update profil publik user dan avatar metadata di Supabase Auth
users.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const updates: Record<string, any> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;

  if (Object.keys(updates).length > 0) {
    const { error: updErr } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id);

    if (updErr) {
      console.error("[Users] PUT error:", updErr);
      return c.json({ error: updErr.message }, 500);
    }
  }

  const { data: freshData, error: freshErr } = await supabase
    .from("users")
    .select("id, name, email, role, company_id, avatar_url")
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
    avatar_url: freshData.avatar_url || null,
    company_name: company?.name || "",
  });
});

export default users;
