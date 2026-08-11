import { Hono } from "hono";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { probeSmtp } from "../lib/email.js";

const health = new Hono();

// GET /api/health/smtp-test
// Kirim email uji untuk mendiagnosis konfigurasi SMTP (admin/owner saja).
// Bisa pakai ?to=email@example.com untuk menargetkan alamat lain.
health.get("/smtp-test", authMiddleware, requireRole("admin", "owner"), async (c) => {
  const user = c.get("user");
  const to = c.req.query("to") || user.email;
  const result = await probeSmtp(to);
  return c.json({ to, ...result });
});

// GET /api/health/net-test?url=https://...
// Cek keterjangkauan URL dari jaringan server (untuk memilih jalur email API).
health.get("/net-test", authMiddleware, requireRole("admin", "owner"), async (c) => {
  const url = c.req.query("url");
  if (!url) return c.json({ ok: false, error: "param url wajib" }, 400);
  if (!/^https?:\/\//.test(url)) return c.json({ ok: false, error: "url harus http(s)" }, 400);
  try {
    const opts: RequestInit = { redirect: "follow", signal: AbortSignal.timeout(15000) };
    if (c.req.query("method") === "POST") {
      opts.method = "POST";
      opts.headers = { "Content-Type": "application/x-www-form-urlencoded" };
      opts.body = c.req.query("body") || "";
    }
    const res = await fetch(url, opts);
    const text = await res.text();
    return c.json({
      ok: true,
      status: res.status,
      contentType: res.headers.get("content-type"),
      size: text.length,
      preview: text.slice(0, 200),
    });
  } catch (err: any) {
    return c.json({ ok: false, error: err?.message || String(err), errorCode: err?.code });
  }
});

export default health;
