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
// Dukung filter opsional via query string:
//   ?status=success|failed|blocked  → filter berdasarkan status
//   ?ip=1.2.3.4                     → cari IP (pencocokan sebagian)
// Hanya bisa diakses dengan token admin-gate (bukan token user biasa).
adminGate.get("/logs", requireAdminGate, async (c) => {
  const status = c.req.query("status");
  const ip = c.req.query("ip")?.trim();

  // Filter status hanya menerima nilai enum yang valid; nilai lain diabaikan
  // (tidak melempar error, tapi dianggap tanpa filter status).
  const validStatuses = ["success", "failed", "blocked"];

  let query = supabase
    .from("admin_gate_logs")
    .select("id, ip, status, created_at");

  if (status && validStatuses.includes(status)) {
    query = query.eq("status", status);
  }
  if (ip) {
    // Pencarian IP sebagian (contains) — tanpa pola regex berbahaya.
    query = query.ilike("ip", `%${ip}%`);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return c.json({ error: "Gagal memuat log" }, 500);
  }

  return c.json(data ?? []);
});

// ────────────────────────────────────────────────────────────────────────
// Pandangan global untuk Admin (pemilik aplikasi).
// Model role: per company hanya ada OWNER (akses penuh) & AKUNTAN
// (pencatatan). ADMIN di sini adalah pemilik aplikasi web — boleh MELIHAT
// status/data seluruh sistem dan melakukan MODERASI (menghapus user/
// company bermasalah dengan konfirmasi), tapi TIDAK boleh mengubah data
// bisnis (jurnal/akun/role). Endpoint GET = view; DELETE = moderasi saja.
// Semua dilindungi requireAdminGate (token admin-gate, bukan token user
// biasa).
// ────────────────────────────────────────────────────────────────────────

// Hitung jumlah owner di sebuah company (proteksi owner terakhir).
// Role tersimpan di DUA tabel (users.role + company_members.role) yang bisa
// tidak sinkron (mis. data lama sebelum sinkronisasi role). Agar TIDAK pernah
// salah memblokir user yang bukan owner terakhir, hitung MAX dari kedua
// sumber — nilai terbesar = jumlah owner paling akurat.
async function countOwners(companyId: string): Promise<number> {
  const { count: memberCount, error: memberErr } = await supabase
    .from("company_members")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("role", "owner");

  const { count: userCount, error: userErr } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("role", "owner");

  const a = !memberErr ? (memberCount ?? 0) : 0;
  const b = !userErr ? (userCount ?? 0) : 0;
  return Math.max(a, b);
}

// GET /api/admin-gate/users — semua user lintas company + nama company
// (read-only: admin hanya boleh melihat)
adminGate.get("/users", requireAdminGate, async (c) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, phone, role, company_id, status, created_at, companies(name)")
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
    .select("id, name, currency, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[admin-gate] companies error:", error);
    return c.json({ error: "Gagal memuat company" }, 500);
  }
  return c.json(data ?? []);
});

// GET /api/admin-gate/companies/:id/detail — detail satu company untuk
// modal "Lihat Detail" di tab Company: info dasar + jumlah user, member,
// akun, jurnal, dan subscription aktif (read-only).
adminGate.get("/companies/:id/detail", requireAdminGate, async (c) => {
  const id = c.req.param("id");

  const [
    company,
    userCount,
    memberCount,
    accountCount,
    journalCount,
    subscription,
  ] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, code, currency, status, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("company_id", id),
    supabase
      .from("company_members")
      .select("id", { count: "exact", head: true })
      .eq("company_id", id),
    supabase
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", id),
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("company_id", id),
    supabase
      .from("subscriptions")
      .select(
        "billing_cycle, status, current_period_end, plans(name, display_name)",
      )
      .eq("company_id", id)
      .maybeSingle(),
  ]);

  if (
    company.error ||
    userCount.error ||
    memberCount.error ||
    accountCount.error ||
    journalCount.error ||
    subscription.error
  ) {
    console.error("[admin-gate] company detail error:", {
      company: company.error,
      users: userCount.error,
      members: memberCount.error,
      accounts: accountCount.error,
      journals: journalCount.error,
      subscription: subscription.error,
    });
    return c.json({ error: "Gagal memuat detail company" }, 500);
  }

  if (!company.data) {
    return c.json({ error: "Company tidak ditemukan" }, 404);
  }

  return c.json({
    ...company.data,
    total_users: userCount.count ?? 0,
    total_members: memberCount.count ?? 0,
    total_accounts: accountCount.count ?? 0,
    total_journals: journalCount.count ?? 0,
    subscription: subscription.data ?? null,
  });
});

// GET /api/admin-gate/overview — ringkasan statistik global untuk tab
// "Overview" dashboard admin (view-only, tidak ada mutasi):
//   - total_users / total_companies: jumlah seluruh user & company
//   - users_growth_30d: user baru dalam 30 hari terakhir
//   - churn_30d: subscription yang dibatalkan dalam 30 hari terakhir
//   - mrr: Monthly Recurring Revenue (sub aktif bulanan = price_monthly;
//     sub aktif tahunan dihitung price_yearly/12 agar sebanding per bulan)
//   - plan_distribution: jumlah user per plan (dari sub aktif)
adminGate.get("/overview", requireAdminGate, async (c) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const [userCount, companyCount, growthCount, churnCount, activeSubs] =
      await Promise.all([
        supabase
          .from("users")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("companies")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .gte("created_at", thirtyDaysAgo),
        supabase
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .gte("canceled_at", thirtyDaysAgo),
        supabase
          .from("subscriptions")
          .select("user_id, billing_cycle, plans(name, price_monthly, price_yearly)")
          .eq("status", "active")
          .limit(10000),
      ]);

    if (
      userCount.error ||
      companyCount.error ||
      growthCount.error ||
      churnCount.error ||
      activeSubs.error
    ) {
      console.error("[admin-gate] overview error:", {
        user: userCount.error,
        company: companyCount.error,
        growth: growthCount.error,
        churn: churnCount.error,
        subs: activeSubs.error,
      });
      return c.json({ error: "Gagal memuat ringkasan dashboard" }, 500);
    }

    // Hitung MRR & distribusi plan dari data sub aktif yang sama.
    let mrr = 0;
    const planDist: Record<string, number> = {};
    for (const sub of activeSubs.data ?? []) {
      const plan = sub.plans as unknown as
        | { name: string | null; price_monthly: number; price_yearly: number }
        | null;
      const monthly = plan?.price_monthly ?? 0;
      const yearly = plan?.price_yearly ?? 0;
      mrr += sub.billing_cycle === "yearly" ? yearly / 12 : monthly;
      const planName = plan?.name ?? "Tanpa plan";
      planDist[planName] = (planDist[planName] ?? 0) + 1;
    }

    return c.json({
      total_users: userCount.count ?? 0,
      total_companies: companyCount.count ?? 0,
      users_growth_30d: growthCount.count ?? 0,
      churn_30d: churnCount.count ?? 0,
      mrr: Math.round(mrr),
      plan_distribution: Object.entries(planDist).map(([name, users]) => ({
        name,
        users,
      })),
    });
  } catch (err) {
    console.error("[admin-gate] overview error:", err);
    return c.json({ error: "Gagal memuat ringkasan dashboard" }, 500);
  }
});

// GET /api/admin-gate/subscriptions — daftar subscription global (view-only)
// untuk tab Billing: siapa berlangganan plan apa, status & periode aktif.
// CATATAN: `subscriptions.user_id` menunjuk ke auth.users (bukan public.users),
// jadi join `users(...)` via PostgREST tidak bisa dibuat (PGRST200) — data user
// diambil lewat query terpisah lalu digabung manual.
adminGate.get("/subscriptions", requireAdminGate, async (c) => {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id, user_id, status, billing_cycle, current_period_end, canceled_at, plans(name, display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[admin-gate] subscriptions error:", error);
    return c.json({ error: "Gagal memuat subscription" }, 500);
  }

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((s) => s.user_id).filter(Boolean))];
  const { data: userRows } = await supabase
    .from("users")
    .select("id, name, email, phone")
    .in("id", userIds);
  const userMap = new Map((userRows ?? []).map((u) => [u.id, u]));

  return c.json(
    rows.map((s) => ({
      ...s,
      users: s.user_id ? (userMap.get(s.user_id) ?? null) : null,
    })),
  );
});

// GET /api/admin-gate/payments — riwayat pembayaran global (view-only):
// order_id Midtrans, jumlah, status, dan siapa yang membayar.
// CATATAN: sama seperti subscriptions, `payments.user_id` menunjuk ke
// auth.users — data user diambil lewat query terpisah lalu digabung manual.
adminGate.get("/payments", requireAdminGate, async (c) => {
  const { data, error } = await supabase
    .from("payments")
    .select("id, user_id, order_id, amount, currency, status, paid_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[admin-gate] payments error:", error);
    return c.json({ error: "Gagal memuat pembayaran" }, 500);
  }

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((p) => p.user_id).filter(Boolean))];
  const { data: userRows } = await supabase
    .from("users")
    .select("id, name, email, phone")
    .in("id", userIds);
  const userMap = new Map((userRows ?? []).map((u) => [u.id, u]));

  return c.json(
    rows.map((p) => ({
      ...p,
      users: p.user_id ? (userMap.get(p.user_id) ?? null) : null,
    })),
  );
});

// ── Moderasi (satu-satunya aksi mutasi admin) ──────────────────────────

// DELETE /api/admin-gate/users/:id — hapus user bermasalah.
// Proteksi: owner terakhir sebuah company tidak bisa dihapus.
adminGate.delete("/users/:id", requireAdminGate, async (c) => {
  const id = c.req.param("id");

  const { data: target } = await supabase
    .from("users")
    .select("id, role, company_id")
    .eq("id", id)
    .single();

  if (!target) return c.json({ error: "User tidak ditemukan" }, 404);

  if (target.role === "owner") {
    const owners = await countOwners(target.company_id);
    if (owners <= 1) {
      console.error(
        "[admin-gate] blokir hapus owner:",
        JSON.stringify({
          userId: id,
          companyId: target.company_id,
          countedOwners: owners,
        }),
      );
      return c.json(
        {
          error:
            "Tidak bisa menghapus owner terakhir dari company-nya. Masih ada user lain ber-role owner di company ini? Pastikan role-nya tersimpan dengan benar.",
        },
        400,
      );
    }
  }

  const { error: authErr } = await supabase.auth.admin.deleteUser(id);
  if (authErr) {
    console.error("[admin-gate] delete auth error:", authErr);
    return c.json({ error: "Gagal menghapus user" }, 500);
  }
  return c.json({ message: "User berhasil dihapus" });
});

// DELETE /api/admin-gate/companies/:id — hapus company bermasalah.
// PERINGATAN: menghapus company ikut menghapus seluruh datanya via CASCADE
// (user, akun, periode, jurnal, dst). Frontend wajib konfirmasi eksplisit.
adminGate.delete("/companies/:id", requireAdminGate, async (c) => {
  const id = c.req.param("id");

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!company) return c.json({ error: "Company tidak ditemukan" }, 404);

  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) {
    console.error("[admin-gate] delete company error:", error);
    return c.json({ error: "Gagal menghapus company" }, 500);
  }
  return c.json({ message: `Company "${company.name}" berhasil dihapus` });
});

// ── Suspend / unsuspend (soft delete) ─────────────────────────────────
// Moderasi yang TIDAK menghapus data: user/company dinonaktifkan sementara
// (status = 'suspended'). Akibatnya otomatis diterapkan di lapisan auth:
//   - user suspended      → tidak bisa login & semua request-nya ditolak
//   - company suspended   → seluruh anggotanya kehilangan akses
// Data bisnis tetap utuh sehingga bisa diaktifkan kembali kapan saja.

// PATCH /api/admin-gate/users/:id/status — body { suspended: boolean }
adminGate.patch("/users/:id/status", requireAdminGate, async (c) => {
  const id = c.req.param("id");

  let body: { suspended?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Body JSON tidak valid" }, 400);
  }
  if (typeof body.suspended !== "boolean") {
    return c.json({ error: "Field `suspended` (boolean) wajib diisi" }, 400);
  }

  const { data: target } = await supabase
    .from("users")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!target) return c.json({ error: "User tidak ditemukan" }, 404);

  const { error } = await supabase
    .from("users")
    .update({ status: body.suspended ? "suspended" : "active" })
    .eq("id", id);
  if (error) {
    console.error("[admin-gate] suspend user error:", error);
    return c.json({ error: "Gagal mengubah status user" }, 500);
  }

  return c.json({
    message: body.suspended
      ? `${target.name} dinonaktifkan sementara.`
      : `${target.name} diaktifkan kembali.`,
  });
});

// PATCH /api/admin-gate/companies/:id/status — body { suspended: boolean }
adminGate.patch("/companies/:id/status", requireAdminGate, async (c) => {
  const id = c.req.param("id");

  let body: { suspended?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Body JSON tidak valid" }, 400);
  }
  if (typeof body.suspended !== "boolean") {
    return c.json({ error: "Field `suspended` (boolean) wajib diisi" }, 400);
  }

  const { data: target } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!target) return c.json({ error: "Company tidak ditemukan" }, 404);

  const { error } = await supabase
    .from("companies")
    .update({ status: body.suspended ? "suspended" : "active" })
    .eq("id", id);
  if (error) {
    console.error("[admin-gate] suspend company error:", error);
    return c.json({ error: "Gagal mengubah status company" }, 500);
  }

  return c.json({
    message: body.suspended
      ? `${target.name} dinonaktifkan sementara (semua anggota kehilangan akses).`
      : `${target.name} diaktifkan kembali.`,
  });
});

// ── Plan Management (CRUD) ────────────────────────────────────────────
// Mengelola daftar plan langganan. Endpoint ini menggunakan
// requireAdminGate (token admin portal, bukan token user biasa).

// GET /api/admin-gate/plans — daftar semua plan
adminGate.get("/plans", requireAdminGate, async (c) => {
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .order("price_monthly", { ascending: true });

  if (error) {
    console.error("[admin-gate] plans list error:", error);
    return c.json({ error: "Gagal memuat daftar plan" }, 500);
  }
  return c.json(data ?? []);
});

// POST /api/admin-gate/plans — tambah plan baru
adminGate.post("/plans", requireAdminGate, async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Body JSON tidak valid" }, 400);
  }

  const { name, display_name, price_monthly, price_yearly, max_companies, max_journals, features } = body;
  if (!name || typeof name !== "string") {
    return c.json({ error: "Field 'name' wajib diisi" }, 400);
  }

  const { data, error } = await supabase
    .from("plans")
    .insert({
      name,
      display_name: display_name || name,
      price_monthly: price_monthly ?? 0,
      price_yearly: price_yearly ?? 0,
      max_companies: max_companies ?? 1,
      max_journals: max_journals ?? 50,
      features: features ?? {},
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("[admin-gate] plans create error:", error);
    return c.json({ error: "Gagal membuat plan: " + error.message }, 500);
  }
  return c.json(data, 201);
});

// PUT /api/admin-gate/plans/:id — update plan
adminGate.put("/plans/:id", requireAdminGate, async (c) => {
  const id = c.req.param("id");
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Body JSON tidak valid" }, 400);
  }

  const update: Record<string, any> = {};
  for (const key of ["name", "display_name", "price_monthly", "price_yearly", "max_companies", "max_journals", "features", "is_active"]) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return c.json({ error: "Tidak ada field yang diubah" }, 400);
  }

  const { data, error } = await supabase
    .from("plans")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[admin-gate] plans update error:", error);
    return c.json({ error: "Gagal mengubah plan" }, 500);
  }
  return c.json(data);
});

// DELETE /api/admin-gate/plans/:id — soft delete (nonaktifkan plan)
// Tidak hard delete karena mungkin ada subscription aktif yang masih
// memakai plan ini. Cukup set is_active = false.
adminGate.delete("/plans/:id", requireAdminGate, async (c) => {
  const id = c.req.param("id");

  // Cek apakah ada subscription aktif yang masih memakai plan ini
  const { count, error: subErr } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", id)
    .eq("status", "active");

  if (subErr) {
    console.error("[admin-gate] plans delete check error:", subErr);
    return c.json({ error: "Gagal mengecek subscription" }, 500);
  }

  const { error } = await supabase
    .from("plans")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("[admin-gate] plans delete error:", error);
    return c.json({ error: "Gagal menonaktifkan plan" }, 500);
  }

  const activeCount = count ?? 0;
  return c.json({
    message: activeCount > 0
      ? `Plan dinonaktifkan (${activeCount} subscription aktif masih memakainya).`
      : "Plan berhasil dinonaktifkan.",
  });
});

// ── System Health Monitor ─────────────────────────────────────────────
// Endpoint untuk memeriksa status komponen sistem (SMTP, WA, Database).
// Menggunakan probe sederhana — semua memakai requireAdminGate.

// GET /api/admin-gate/health/smtp — tes koneksi SMTP
adminGate.get("/health/smtp", requireAdminGate, async (c) => {
  try {
    const { probeSmtp } = await import("../lib/email.js");
    const result = await probeSmtp();
    return c.json({ ok: result.ok, message: result.error || "SMTP OK", details: result });
  } catch (err: any) {
    return c.json({ ok: false, message: err?.message || "SMTP probe gagal" });
  }
});

// GET /api/admin-gate/health/whatsapp — tes koneksi WhatsApp/Fonnte
adminGate.get("/health/whatsapp", requireAdminGate, async (c) => {
  const token = process.env.FONNTE_API_TOKEN;
  const url = process.env.FONNTE_API_URL || "https://api.fonnte.com/send";
  if (!token) {
    return c.json({ ok: false, message: "FONNTE_API_TOKEN belum dikonfigurasi" });
  }
  try {
    // Fonnte API: cek status device via /device/status
    const res = await fetch("https://api.fonnte.com/device/status", {
      method: "GET",
      headers: { Authorization: token },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    const connected = data?.status === true || data?.connected === true;
    return c.json({ ok: connected, message: connected ? "WhatsApp terhubung" : "WhatsApp terputus", details: data });
  } catch (err: any) {
    return c.json({ ok: false, message: err?.message || "WhatsApp probe gagal" });
  }
});

// GET /api/admin-gate/health/database — tes koneksi database Supabase
adminGate.get("/health/database", requireAdminGate, async (c) => {
  try {
    const start = Date.now();
    const { error } = await supabase.from("plans").select("id", { count: "exact", head: true });
    const latencyMs = Date.now() - start;
    if (error) {
      return c.json({ ok: false, message: "Database error: " + error.message, latency_ms: latencyMs });
    }
    return c.json({ ok: true, message: `Database OK (${latencyMs}ms)`, latency_ms: latencyMs });
  } catch (err: any) {
    return c.json({ ok: false, message: err?.message || "Database probe gagal" });
  }
});

export default adminGate;
