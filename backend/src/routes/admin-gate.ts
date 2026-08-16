import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { supabase } from "../lib/supabase.js";
import {
  signAdminGateToken,
  ADMIN_GATE_TTL_SECONDS,
} from "../lib/adminGateJwt.js";
import { requireAdminGate } from "../middleware/admin-gate.js";

// Gerbang admin (dashboard khusus admin).
// Password adalah SATU rahasia bersama (bukan per-akun), disimpan sebagai
// HASH bcrypt di env var ADMIN_GATE_PASSWORD_HASH. Tidak ada perbandingan
// string literal di kode — selalu lewat bcrypt.compare terhadap hash.

const adminGate = new Hono();

// ── Rate limiter ketat (in-memory per IP) ──────────────────────────────
// Tidak ada identitas per-akun di gerbang ini → rate limit adalah satu-
// satunya lapisan pertahanan dari brute-force. Aturan (lebih ketat dari
// endpoint lain):
//   - Maksimal 5 percobaan GAGAL per IP dalam 15 menit
//   - Setelah itu IP diblokir selama 1 jam
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;
const BLOCK_MS = 60 * 60 * 1000;

const attempts = new Map<string, { fails: number[]; blockedUntil: number }>();

function getClientIp(c: any): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown"
  );
}

function isBlocked(ip: string): boolean {
  const rec = attempts.get(ip);
  return !!rec && rec.blockedUntil > Date.now();
}

// Catat satu percobaan gagal; kembalikan true jika IP baru saja diblokir.
function recordFail(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip) ?? { fails: [], blockedUntil: 0 };
  rec.fails = rec.fails.filter((t) => now - t < FAIL_WINDOW_MS);
  rec.fails.push(now);
  if (rec.fails.length >= MAX_FAILS) {
    rec.blockedUntil = now + BLOCK_MS;
    attempts.set(ip, rec);
    return true;
  }
  attempts.set(ip, rec);
  return false;
}

function clearFails(ip: string) {
  attempts.delete(ip);
}

// ── Audit log ─────────────────────────────────────────────────────────
// Setiap percobaan (berhasil/gagal/diblokir) WAJIB dicatat: timestamp, IP,
// dan status. Disimpan ke tabel admin_gate_logs; bila migrasi DB belum
// dijalankan (tabel belum ada), fallback ke log server yang persisten.
async function writeAuditLog(ip: string, status: "success" | "failed" | "blocked") {
  const { error } = await supabase
    .from("admin_gate_logs")
    .insert({ ip, status })
    .select()
    .maybeSingle();

  if (error) {
    // Migrasi mungkin belum dijalankan — log server tetap tercatat.
    console.error(
      `[admin-gate] audit log insert gagal (status=${status}, ip=${ip}): ${error.message}`,
    );
  }
  console.log(`[admin-gate] ${status} ip=${ip}`);
}

// POST /api/admin-gate/verify — verifikasi password rahasia bersama
adminGate.post("/verify", async (c) => {
  const ip = getClientIp(c);

  // 1. Blokir bila sudah terkena rate limit
  if (isBlocked(ip)) {
    await writeAuditLog(ip, "blocked");
    return c.json(
      { error: "Terlalu banyak percobaan. Coba lagi beberapa saat lagi." },
      429,
    );
  }

  // 2. Validasi input minimal — pesan error TIDAK membocorkan detail
  let password: unknown;
  try {
    ({ password } = await c.req.json());
  } catch {
    return c.json({ error: "Password salah" }, 401);
  }
  if (
    typeof password !== "string" ||
    password.length === 0 ||
    password.length > 256
  ) {
    return c.json({ error: "Password salah" }, 401);
  }

  // 3. Hash wajib dikonfigurasi di env — tanpa itu, tidak ada yang bisa lolos
  const hash = process.env.ADMIN_GATE_PASSWORD_HASH;
  if (!hash) {
    await writeAuditLog(ip, "failed");
    return c.json({ error: "Password salah" }, 401);
  }

  // 4. Perbandingan via bcrypt — TIDAK ADA perbandingan string literal
  const match = await bcrypt.compare(password, hash);
  if (!match) {
    const justBlocked = recordFail(ip);
    await writeAuditLog(ip, justBlocked ? "blocked" : "failed");
    if (justBlocked) {
      return c.json(
        { error: "Terlalu banyak percobaan. Coba lagi beberapa saat lagi." },
        429,
      );
    }
    return c.json({ error: "Password salah" }, 401);
  }

  // 5. Sukses → reset percobaan & kirim token admin-gate
  clearFails(ip);
  await writeAuditLog(ip, "success");
  const token = await signAdminGateToken();
  return c.json({ token, expires_in: ADMIN_GATE_TTL_SECONDS });
});

// GET /api/admin-gate/logs — riwayat percobaan (dashboard admin).
// Hanya bisa diakses dengan token admin-gate (bukan token user biasa).
adminGate.get("/logs", requireAdminGate, async (c) => {
  const { data, error } = await supabase
    .from("admin_gate_logs")
    .select("id, ip, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return c.json({ error: "Gagal memuat log" }, 500);
  }

  return c.json(data ?? []);
});

// ────────────────────────────────────────────────────────────────────────
// Pandangan READ-ONLY global untuk Admin (pemilik aplikasi).
// Model role: per company hanya ada OWNER (akses penuh) & AKUNTAN
// (pencatatan). ADMIN di sini adalah pemilik aplikasi web — boleh MELIHAT
// status/data seluruh sistem, tapi TIDAK boleh mengubah/menginput apa pun.
// Karena itu endpoint di bawah hanya GET (tanpa mutasi). Semua dilindungi
// requireAdminGate (token admin-gate, bukan token user biasa).
// ────────────────────────────────────────────────────────────────────────

// GET /api/admin-gate/users — semua user lintas company + nama company
// (read-only: admin hanya boleh melihat)
adminGate.get("/users", requireAdminGate, async (c) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, phone, role, company_id, created_at, companies(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[admin-gate] users error:", error);
    return c.json({ error: "Gagal memuat user" }, 500);
  }
  return c.json(data ?? []);
});

// GET /api/admin-gate/companies — semua company (read-only)
adminGate.get("/companies", requireAdminGate, async (c) => {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, currency, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[admin-gate] companies error:", error);
    return c.json({ error: "Gagal memuat company" }, 500);
  }
  return c.json(data ?? []);
});

export default adminGate;
