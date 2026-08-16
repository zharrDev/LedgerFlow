import { Hono } from "hono";
import dns from "node:dns";
import net from "node:net";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { probeSmtp } from "../lib/email.js";

const health = new Hono();

// GET /api/health/smtp-test
// Kirim email uji untuk mendiagnosis konfigurasi SMTP (admin/owner saja).
// Bisa pakai ?to=email@example.com untuk menargetkan alamat lain.
health.get("/smtp-test", authMiddleware, requireRole("admin", "owner"), async (c) => {
  const user = c.get("user");
  const to = c.req.query("to") || user.email || "";
  const result = await probeSmtp(to);
  return c.json({ to, ...result });
});

// ── Anti-SSRF: cek bahwa URL aman untuk di-fetch dari jaringan server ──
// Menolak: protokol selain http/https, port selain 80/443, hostname yang
// resolve ke IP privat/loopback/link-local/metadata cloud (10.x, 127.x,
// 169.254.x, 172.16-31.x, 192.168.x, 100.64/10, ::1, fc00::/7, fe80::/10).
function isPrivateIp(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^::ffff:/, "");
  if (net.isIP(normalized) === 0) return true; // bukan IP valid

  if (net.isIPv4(normalized)) {
    const [a, b] = normalized.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) || // link-local / metadata cloud
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }

  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

async function isSafeFetchUrl(rawUrl: string): Promise<{ ok: boolean; reason?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "URL tidak valid" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "hanya http/https yang diizinkan" };
  }
  const port = parsed.port ? Number(parsed.port) : parsed.protocol === "https:" ? 443 : 80;
  if (port !== 80 && port !== 443) {
    return { ok: false, reason: "port hanya 80/443 yang diizinkan" };
  }

  const host = parsed.hostname;
  if (net.isIP(host)) {
    if (isPrivateIp(host)) {
      return { ok: false, reason: "IP privat/loopback/metadata dilarang" };
    }
    return { ok: true };
  }

  // Hostname → resolve DNS dan periksa SEMUA alamat hasilnya
  try {
    const addresses = await dns.promises.lookup(host, { all: true });
    if (!addresses || addresses.length === 0) {
      return { ok: false, reason: "hostname tidak resolve" };
    }
    for (const { address: ip } of addresses) {
      if (isPrivateIp(ip)) {
        return { ok: false, reason: "hostname menunjuk ke IP privat/loopback/metadata" };
      }
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "hostname tidak resolve" };
  }
}

// GET /api/health/net-test?url=https://...
// Cek keterjangkauan URL dari jaringan server (untuk memilih jalur email API).
health.get("/net-test", authMiddleware, requireRole("admin", "owner"), async (c) => {
  const url = c.req.query("url");
  if (!url) return c.json({ ok: false, error: "param url wajib" }, 400);
  if (url.length > 2048) return c.json({ ok: false, error: "url terlalu panjang" }, 400);

  const safe = await isSafeFetchUrl(url);
  if (!safe.ok) {
    return c.json({ ok: false, error: safe.reason }, 400);
  }

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
