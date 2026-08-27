// Notifikasi user — menggantikan sistem localStorage lama supaya notifikasi
// tersinkron antar perangkat dan bisa dipicu event backend (invite member,
// pembayaran, dll).
//
// Endpoints:
//   GET   /api/notifications            -> daftar notifikasi + unread count
//   POST  /api/notifications            -> buat notifikasi untuk DIRI SENDIRI
//   PATCH /api/notifications/:id/read   -> tandai satu notifikasi dibaca
//   PATCH /api/notifications/read-all   -> tandai semua notifikasi dibaca
import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { dbErrorResponse } from "../lib/errors.js";
import { authMiddleware } from "../middleware/auth.js";

const notifications = new Hono();

notifications.use("*", authMiddleware);

const MAX_LIMIT = 50;

// Tipe yang boleh dikirim klien. Notifikasi lintas-user (member_invited,
// payment_*) dibuat backend sendiri lewat lib/notify.ts — endpoint POST ini
// selalu memaksa user_id dari JWT sehingga tidak bisa dipakai spam orang lain.
const CLIENT_ALLOWED_TYPES = new Set([
  "journal_posted",
  "journal_created",
  "journal_deleted",
  "period_opened",
  "period_closed",
  "account_toggled",
  "profile_updated",
]);

// GET /api/notifications?limit=20&page=1
notifications.get("/", async (c) => {
  const { sub } = c.get("user");
  const pageNum = Math.max(1, parseInt(c.req.query("page") || "1"));
  const limitNum = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(c.req.query("limit") || "15")),
  );
  const offset = (pageNum - 1) * limitNum;

  const [listRes, unreadRes] = await Promise.all([
    supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", sub)
      .order("created_at", { ascending: false })
      .range(offset, offset + limitNum - 1),
    // Hitung unread terpisah (tidak terpengaruh pagination).
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", sub)
      .eq("read", false),
  ]);

  if (listRes.error) return dbErrorResponse(c, listRes.error);
  if (unreadRes.error) return dbErrorResponse(c, unreadRes.error);

  return c.json({
    data: listRes.data ?? [],
    total: listRes.count || 0,
    unread: unreadRes.count || 0,
    page: pageNum,
    limit: limitNum,
  });
});

// POST /api/notifications — buat notifikasi untuk diri sendiri (dipakai UI
// setelah aksi lokal: toggle akun, tutup periode, update profil, dll).
notifications.post("/", async (c) => {
  const { sub, company_id } = c.get("user");
  const body = await c.req.json();
  const { type, title, message, link } = body ?? {};

  if (!type || !CLIENT_ALLOWED_TYPES.has(type)) {
    return c.json({ error: "Tipe notifikasi tidak valid." }, 400);
  }
  if (!title || typeof title !== "string" || title.trim().length > 120) {
    return c.json({ error: "Judul notifikasi wajib diisi (maks 120 karakter)." }, 400);
  }
  if (!message || typeof message !== "string" || message.trim().length > 500) {
    return c.json({ error: "Pesan notifikasi wajib diisi (maks 500 karakter)." }, 400);
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: sub,
      company_id: company_id ?? null,
      type,
      title: title.trim(),
      message: message.trim(),
      link: typeof link === "string" && link.startsWith("/") ? link : null,
    })
    .select()
    .single();

  if (error) return dbErrorResponse(c, error);
  return c.json(data, 201);
});

// PATCH /api/notifications/:id/read
notifications.patch("/:id/read", async (c) => {
  const { sub } = c.get("user");
  const id = c.req.param("id");

  // Filter user_id dari JWT — user tidak bisa menandai notifikasi milik
  // orang lain walau tahu ID-nya.
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", sub);

  if (error) return dbErrorResponse(c, error);
  return c.json({ success: true });
});

// PATCH /api/notifications/read-all
notifications.patch("/read-all", async (c) => {
  const { sub } = c.get("user");

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", sub)
    .eq("read", false);

  if (error) return dbErrorResponse(c, error);
  return c.json({ success: true });
});

export default notifications;
