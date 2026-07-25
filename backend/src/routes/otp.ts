import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { sendOTPEmail } from "../lib/email.js";

const otp = new Hono();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

otp.post("/send-otp", async (c) => {
  try {
    const { email, purpose } = await c.req.json();

    if (!email || !purpose) {
      return c.json({ error: "Email dan purpose wajib diisi." }, 400);
    }
    if (!["register_verification", "forgot_password"].includes(purpose)) {
      return c.json({ error: "Purpose tidak valid." }, 400);
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("email", email)
      .single();

    if (!user) {
      return c.json({ message: "Jika email terdaftar, kode OTP akan dikirim." });
    }

    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("otp_codes")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("purpose", purpose)
      .eq("used", false)
      .gte("created_at", sixtySecondsAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent) {
      return c.json({ error: "Mohon tunggu 60 detik sebelum meminta kode baru." }, 429);
    }

    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("user_id", user.id)
      .eq("purpose", purpose)
      .eq("used", false);

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await supabase.from("otp_codes").insert({
      user_id: user.id,
      code,
      purpose,
      expires_at: expiresAt,
    });

    sendOTPEmail(user.email, user.name, code).catch(console.error);

    return c.json({ message: "Kode OTP berhasil dikirim." });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

otp.post("/verify-otp", async (c) => {
  try {
    const { email, code, purpose } = await c.req.json();

    if (!email || !code || !purpose) {
      return c.json({ error: "Email, kode, dan purpose wajib diisi." }, 400);
    }
    if (!["register_verification", "forgot_password"].includes(purpose)) {
      return c.json({ error: "Purpose tidak valid." }, 400);
    }
    if (!/^\d{6}$/.test(code)) {
      return c.json({ error: "Kode OTP harus 6 digit angka." }, 400);
    }

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (!user) {
      return c.json({ error: "User tidak ditemukan." }, 404);
    }

    const now = new Date().toISOString();
    const { data: otpRecord } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("user_id", user.id)
      .eq("code", code)
      .eq("purpose", purpose)
      .eq("used", false)
      .gte("expires_at", now)
      .maybeSingle();

    if (!otpRecord) {
      return c.json({ error: "Kode OTP tidak valid atau sudah kedaluwarsa." }, 400);
    }

    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("id", otpRecord.id);

    return c.json({ message: "Verifikasi berhasil.", success: true });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default otp;
