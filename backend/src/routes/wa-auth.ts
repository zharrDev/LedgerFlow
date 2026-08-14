// Auth via WhatsApp OTP (passwordless), terpisah dari routes/auth.ts agar
// alur Google (exchange-token) dan endpoint email/password lama tidak terusik.
//
// Endpoints:
//   POST /api/wa/register/start   { phone, name, company_name }  -> kirim OTP
//   POST /api/wa/register/verify  { phone, code, name, company_name } -> buat akun + JWT
//   POST /api/wa/login/start      { phone }                      -> kirim OTP
//   POST /api/wa/login/verify     { phone, code }                -> JWT
//
// Aturan keamanan:
//   - Kode OTP TIDAK PERNAH dikembalikan ke client (hanya via WhatsApp).
//   - Cooldown kirim ulang 60 detik per nomor+purpose.
//   - Maksimal 5 percobaan salah, lalu kunci sampai minta kode baru.
//   - OTP kedaluwarsa 5 menit; sekali dipakai langsung dinonaktifkan.
//   - Gagal kirim via Fonnte = throw (tidak ada row OTP yang tertinggal).
import { Hono } from "hono";
import { randomInt, createHash, timingSafeEqual } from "node:crypto";
import { supabase } from "../lib/supabase.js";
import { signToken } from "../lib/jwt.js";
import {
  normalizePhoneNumber,
  sendWhatsAppOTP,
  sendWhatsAppLoginAlert,
  FonnteError,
} from "../lib/whatsapp.js";

const waAuth = new Hono();

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

// Rate-limit kasar per-IP (in-memory; cukup untuk pencegahan spam per instance).
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_START_MAX = 10; // kirim OTP
const IP_VERIFY_MAX = 30; // percobaan verifikasi
const ipHits = new Map<string, number[]>();

function checkIpRateLimit(ip: string, max: number): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
  if (hits.length >= max) {
    ipHits.set(ip, hits);
    return false;
  }
  ipHits.set(ip, [...hits, now]);
  return true;
}

function fmtError(err: any): string {
  return err?.message
    ? `${err.message}${err?.details ? ` (details: ${err.details})` : ""}${err?.hint ? ` (hint: ${err.hint})` : ""}`
    : String(err);
}

function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// Kode OTP TIDAK disimpan sebagai teks di database — hanya hash SHA-256.
// Perbandingan saat verifikasi memakai timingSafeEqual (anti timing attack).
function hashOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

// Kirim OTP lalu simpan row-nya. Urutan ini penting: bila Fonnte gagal
// (throw), tidak ada row OTP yang tertinggal (anti-silent-fail).
async function issueOtp(phone: string, purpose: "register" | "login") {
  const code = generateOtpCode();
  await sendWhatsAppOTP(phone, code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
  const { error } = await supabase.from("wa_otp_codes").insert({
    phone,
    code: hashOtpCode(code),
    purpose,
    expires_at: expiresAt.toISOString(),
  });
  if (error) {
    throw new Error(`insert_otp: ${fmtError(error)}`);
  }
}

// Sisa waktu cooldown kirim ulang (detik); 0 = boleh kirim lagi.
async function cooldownRemaining(
  phone: string,
  purpose: "register" | "login",
): Promise<number> {
  const since = new Date(Date.now() - RESEND_COOLDOWN_MS).toISOString();
  const { data, error } = await supabase
    .from("wa_otp_codes")
    .select("created_at")
    .eq("phone", phone)
    .eq("purpose", purpose)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    throw new Error(`check_cooldown: ${fmtError(error)}`);
  }
  if (!data?.length) return 0;
  const wait = RESEND_COOLDOWN_MS - (Date.now() - new Date(data[0].created_at).getTime());
  return wait > 0 ? Math.ceil(wait / 1000) : 0;
}

type OtpResult =
  | { ok: true }
  | { ok: false; status: "expired" | "locked" | "wrong"; remaining?: number };

async function verifyOtp(
  phone: string,
  purpose: "register" | "login",
  code: string,
): Promise<OtpResult> {
  const { data: rows, error } = await supabase
    .from("wa_otp_codes")
    .select("*")
    .eq("phone", phone)
    .eq("purpose", purpose)
    .eq("used", false)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    throw new Error(`lookup_otp: ${fmtError(error)}`);
  }
  const row = rows?.[0];
  if (!row) return { ok: false, status: "expired" };
  if (row.attempt_count >= MAX_ATTEMPTS) return { ok: false, status: "locked" };
  if (!safeEqualHex(hashOtpCode(code), row.code)) {
    const next = row.attempt_count + 1;
    await supabase.from("wa_otp_codes").update({ attempt_count: next }).eq("id", row.id);
    return { ok: false, status: "wrong", remaining: Math.max(MAX_ATTEMPTS - next, 0) };
  }
  await supabase.from("wa_otp_codes").update({ used: true }).eq("id", row.id);
  return { ok: true };
}

// --- helpers provisi akun (meniru alur register email lama) ---

async function getCompanyName(companyId: string): Promise<string> {
  const { data } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();
  return data?.name || "";
}

async function createCompany(companyName: string): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("companies")
    .insert({ name: companyName, currency: "IDR" })
    .select("id")
    .single();
  if (error) throw new Error(`create_company: ${fmtError(error)}`);
  return data;
}

async function createPhoneAuthUser(phone: string): Promise<{ id: string }> {
  const { data, error } = await supabase.auth.admin.createUser({
    phone: `+${phone}`,
    phone_confirm: true,
  });
  if (error) throw new Error(`create_auth_user: ${fmtError(error)}`);
  return { id: data.user.id };
}

async function createUserProfile(
  id: string,
  companyId: string,
  phone: string,
  name: string,
) {
  const { data, error } = await supabase
    .from("users")
    .insert({
      id,
      company_id: companyId,
      phone,
      name,
      role: "owner",
      email: null,
      email_verified: true,
    })
    .select()
    .single();
  if (error) throw new Error(`create_user_profile: ${fmtError(error)}`);
  return data;
}

// Kompensasi bila provisi akun register gagal di tengah jalan:
// hapus mundur mulai dari yang paling terakhir dibuat (best-effort),
// supaya tidak ada company / auth user / profil yatim yang tertinggal.
async function rollbackProvision(opts: {
  companyId?: string;
  authUserId?: string;
  userId?: string;
}) {
  if (opts.userId) {
    try {
      await supabase.from("users").delete().eq("id", opts.userId);
    } catch (e) {
      console.error("[rollback] gagal hapus profil user:", e);
    }
  }
  if (opts.authUserId) {
    try {
      await supabase.auth.admin.deleteUser(opts.authUserId);
    } catch (e) {
      console.error("[rollback] gagal hapus auth user:", e);
    }
  }
  if (opts.companyId) {
    try {
      await supabase.from("companies").delete().eq("id", opts.companyId);
    } catch (e) {
      console.error("[rollback] gagal hapus company:", e);
    }
  }
}

// --- helpers request ---

function parseUserAgent(ua: string): string {
  if (!ua) return "Perangkat tidak dikenal";
  const browser = ua.includes("Edg/")
    ? "Microsoft Edge"
    : ua.includes("Chrome/")
      ? "Chrome"
      : ua.includes("Firefox/")
        ? "Firefox"
        : ua.includes("Safari/")
          ? "Safari"
          : "Browser";
  const os = ua.includes("Windows")
    ? "Windows"
    : ua.includes("Mac OS")
      ? "macOS"
      : ua.includes("Android")
        ? "Android"
        : ua.includes("iPhone") || ua.includes("iPad")
          ? "iOS"
          : "OS";
  return `${browser} · ${os}`;
}

function getClientIp(c: { req: { header: (h: string) => string | undefined } }): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "Tidak diketahui"
  );
}

function normalizeOr400(c: any, raw: any): { phone: string } | { errorResponse: Response } {
  try {
    return { phone: normalizePhoneNumber(raw) };
  } catch (err: any) {
    return { errorResponse: c.json({ error: err.message }, 400) };
  }
}

// --- POST /register/start ---

waAuth.post("/register/start", async (c) => {
  try {
    const body = await c.req.json();
    const { name, company_name } = body ?? {};

    const norm = normalizeOr400(c, body?.phone);
    if ("errorResponse" in norm) return norm.errorResponse;
    const phone = norm.phone;

    if (!name || !company_name) {
      return c.json({ error: "Nama dan nama perusahaan wajib diisi." }, 400);
    }

    if (!checkIpRateLimit(getClientIp(c), IP_START_MAX)) {
      return c.json(
        { error: "Terlalu banyak permintaan. Coba lagi beberapa menit lagi." },
        429,
      );
    }

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (existing) {
      return c.json(
        { error: "Nomor WhatsApp sudah terdaftar. Silakan masuk." },
        409,
      );
    }

    const wait = await cooldownRemaining(phone, "register");
    if (wait > 0) {
      return c.json(
        { error: `Mohon tunggu ${wait} detik sebelum meminta kode baru.`, retry_after: wait },
        429,
      );
    }

    await issueOtp(phone, "register");
    return c.json({ success: true, message: "Kode OTP dikirim ke WhatsApp Anda." });
  } catch (err: any) {
    console.error("WA REGISTER START ERROR:", err);
    const status = err instanceof FonnteError ? 502 : 500;
    return c.json({ error: err?.message ?? "Gagal mengirim kode OTP." }, status);
  }
});

// --- POST /register/verify ---

waAuth.post("/register/verify", async (c) => {
  try {
    const body = await c.req.json();
    const { name, company_name, code } = body ?? {};

    const norm = normalizeOr400(c, body?.phone);
    if ("errorResponse" in norm) return norm.errorResponse;
    const phone = norm.phone;

    if (!code || !/^\d{6}$/.test(String(code))) {
      return c.json({ error: "Format kode OTP tidak valid." }, 400);
    }
    if (!name || !company_name) {
      return c.json({ error: "Nama dan nama perusahaan wajib diisi." }, 400);
    }

    if (!checkIpRateLimit(getClientIp(c), IP_VERIFY_MAX)) {
      return c.json(
        { error: "Terlalu banyak permintaan. Coba lagi beberapa menit lagi." },
        429,
      );
    }

    // Anti-loncatan: nomor harus belum terdaftar. Dicek SEBELUM verifikasi
    // OTP supaya kode yang sudah valid tidak terbuang untuk nomor terdaftar.
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (existing) {
      return c.json({ error: "Nomor WhatsApp sudah terdaftar." }, 409);
    }

    const result = await verifyOtp(phone, "register", String(code));
    if (!result.ok) {
      if (result.status === "locked") {
        return c.json(
          { error: "Terlalu banyak percobaan salah. Minta kode baru." },
          429,
        );
      }
      if (result.status === "wrong") {
        return c.json(
          {
            error: result.remaining
              ? `Kode OTP salah. Sisa ${result.remaining} percobaan.`
              : "Kode OTP salah.",
          },
          400,
        );
      }
      return c.json(
        { error: "Kode OTP tidak ditemukan atau sudah kedaluwarsa. Minta kode baru." },
        400,
      );
    }

    // Provisi akun dengan rollback: bila salah satu langkah gagal, semua
    // yang sudah dibuat dihancurkan kembali (tidak ada data yatim).
    const company = await createCompany(String(company_name).trim());
    let authUserId: string | undefined;
    let userId: string | undefined;
    try {
      const authUser = await createPhoneAuthUser(phone);
      authUserId = authUser.id;
      const user = await createUserProfile(
        authUser.id,
        company.id,
        phone,
        String(name).trim(),
      );
      userId = user.id;
      const { error: memberErr } = await supabase
        .from("company_members")
        .insert({
          user_id: user.id,
          company_id: company.id,
          role: "owner",
        });
      if (memberErr) throw new Error(`insert_member: ${fmtError(memberErr)}`);

      const companyName = await getCompanyName(user.company_id);
      const token = await signToken({
        sub: user.id,
        email: user.email ?? undefined,
        role: user.role,
        company_id: user.company_id,
      });

      return c.json(
        {
          token,
          user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            company_id: user.company_id,
            company_name: companyName,
            avatar_url: user.avatar_url || null,
          },
        },
        201,
      );
    } catch (err: any) {
      await rollbackProvision({ companyId: company.id, authUserId, userId });
      throw err;
    }
  } catch (err: any) {
    console.error("WA REGISTER VERIFY ERROR:", err);
    return c.json({ error: err?.message ?? "Gagal membuat akun." }, 500);
  }
});

// --- POST /login/start ---

waAuth.post("/login/start", async (c) => {
  try {
    const body = await c.req.json();

    const norm = normalizeOr400(c, body?.phone);
    if ("errorResponse" in norm) return norm.errorResponse;
    const phone = norm.phone;

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (!user) {
      return c.json(
        { error: "Nomor WhatsApp belum terdaftar. Silakan daftar terlebih dahulu." },
        404,
      );
    }

    const wait = await cooldownRemaining(phone, "login");
    if (wait > 0) {
      return c.json(
        { error: `Mohon tunggu ${wait} detik sebelum meminta kode baru.`, retry_after: wait },
        429,
      );
    }

    await issueOtp(phone, "login");
    return c.json({ success: true, message: "Kode OTP dikirim ke WhatsApp Anda." });
  } catch (err: any) {
    console.error("WA LOGIN START ERROR:", err);
    const status = err instanceof FonnteError ? 502 : 500;
    return c.json({ error: err?.message ?? "Gagal mengirim kode OTP." }, status);
  }
});

// --- POST /login/verify ---

waAuth.post("/login/verify", async (c) => {
  try {
    const body = await c.req.json();
    const { code } = body ?? {};

    const norm = normalizeOr400(c, body?.phone);
    if ("errorResponse" in norm) return norm.errorResponse;
    const phone = norm.phone;

    if (!code || !/^\d{6}$/.test(String(code))) {
      return c.json({ error: "Format kode OTP tidak valid." }, 400);
    }

    if (!checkIpRateLimit(getClientIp(c), IP_VERIFY_MAX)) {
      return c.json(
        { error: "Terlalu banyak permintaan. Coba lagi beberapa menit lagi." },
        429,
      );
    }

    // Cari user DULU sebelum consume OTP: untuk nomor tanpa akun, kode
    // yang valid tidak boleh terbuang sia-sia (di-mark used).
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();
    if (userError) {
      return c.json({ error: userError.message }, 500);
    }
    if (!user) {
      return c.json({ error: "Akun tidak ditemukan." }, 404);
    }

    const result = await verifyOtp(phone, "login", String(code));
    if (!result.ok) {
      if (result.status === "locked") {
        return c.json(
          { error: "Terlalu banyak percobaan salah. Minta kode baru." },
          429,
        );
      }
      if (result.status === "wrong") {
        return c.json(
          {
            error: result.remaining
              ? `Kode OTP salah. Sisa ${result.remaining} percobaan.`
              : "Kode OTP salah.",
          },
          400,
        );
      }
      return c.json(
        { error: "Kode OTP tidak ditemukan atau sudah kedaluwarsa. Minta kode baru." },
        400,
      );
    }

    const companyName = await getCompanyName(user.company_id);
    const token = await signToken({
      sub: user.id,
      email: user.email ?? undefined,
      role: user.role,
      company_id: user.company_id,
    });

    sendWhatsAppLoginAlert(
      phone,
      parseUserAgent(c.req.header("user-agent") || ""),
      getClientIp(c),
    ).catch(console.error);

    return c.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        company_id: user.company_id,
        company_name: companyName,
        avatar_url: user.avatar_url || null,
      },
    });
  } catch (err: any) {
    console.error("WA LOGIN VERIFY ERROR:", err);
    return c.json({ error: err?.message ?? "Gagal masuk." }, 500);
  }
});

export default waAuth;
