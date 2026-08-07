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

export default health;
