import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const userMgmt = new Hono();

userMgmt.use("*", authMiddleware);

userMgmt.get("/", requireRole("admin", "owner"), async (c) => {
  const { company_id } = c.get("user");

  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, avatar_url, created_at")
    .eq("company_id", company_id)
    .order("created_at", { ascending: true });

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

userMgmt.put("/:id/role", requireRole("admin", "owner"), async (c) => {
  const { company_id } = c.get("user");
  const id = c.req.param("id");
  const { role } = await c.req.json();

  if (!["admin", "akuntan", "owner"].includes(role)) {
    return c.json({ error: "Role tidak valid. Pilih: admin, akuntan, atau owner." }, 400);
  }

  const { data: targetUser } = await supabase
    .from("users")
    .select("id, company_id")
    .eq("id", id)
    .single();

  if (!targetUser) return c.json({ error: "User tidak ditemukan" }, 404);
  if (targetUser.company_id !== company_id) return c.json({ error: "Forbidden" }, 403);

  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", id);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ message: "Role berhasil diubah" });
});

userMgmt.delete("/:id", requireRole("admin", "owner"), async (c) => {
  const { company_id, sub: myId } = c.get("user");
  const id = c.req.param("id");

  if (id === myId) {
    return c.json({ error: "Tidak bisa menghapus akun sendiri." }, 400);
  }

  const { data: targetUser } = await supabase
    .from("users")
    .select("id, company_id")
    .eq("id", id)
    .single();

  if (!targetUser) return c.json({ error: "User tidak ditemukan" }, 404);
  if (targetUser.company_id !== company_id) return c.json({ error: "Forbidden" }, 403);

  await supabase.auth.admin.deleteUser(id);

  return c.json({ message: "User berhasil dihapus" });
});

export default userMgmt;
