import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { sendResetPasswordEmail } from "../lib/email.js";
import crypto from "node:crypto";

const passwordReset = new Hono();

passwordReset.post("/forgot-password", async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: "Email wajib diisi." }, 400);
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("email", email)
      .single();

    if (!user) {
      return c.json({ message: "Jika email terdaftar, link reset akan dikirim." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await supabase.from("password_resets").insert({
      user_id: user.id,
      token: resetToken,
      expires_at: expiresAt.toISOString(),
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    sendResetPasswordEmail(user.email, user.name, resetLink).catch(console.error);

    return c.json({ message: "Jika email terdaftar, link reset akan dikirim." });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

passwordReset.post("/reset-password", async (c) => {
  try {
    const { token, email, password } = await c.req.json();

    if (!token || !email || !password) {
      return c.json({ error: "Token, email, dan password wajib diisi." }, 400);
    }

    if (password.length < 8) {
      return c.json({ error: "Password minimal 8 karakter." }, 400);
    }

    const { data: resetRecord } = await supabase
      .from("password_resets")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .single();

    if (!resetRecord) {
      return c.json({ error: "Token tidak valid atau sudah digunakan." }, 400);
    }

    if (new Date(resetRecord.expires_at) < new Date()) {
      return c.json({ error: "Token sudah kedaluwarsa." }, 400);
    }

    // Target user WAJIB diturunkan dari token (resetRecord.user_id), bukan dari
    // email di body. Kalau tidak, pemegang token valid bisa mereset password
    // akun orang lain hanya dengan mengganti email di request (account takeover).
    const { data: user } = await supabase
      .from("users")
      .select("id, email")
      .eq("id", resetRecord.user_id)
      .single();

    if (!user) {
      return c.json({ error: "User tidak ditemukan." }, 404);
    }

    // Email di body harus cocok dengan pemilik token — kalau tidak, tolak
    // dengan pesan generik yang sama (jangan bocorkan info akun).
    if (user.email.toLowerCase() !== String(email).toLowerCase()) {
      return c.json({ error: "Token tidak valid atau sudah digunakan." }, 400);
    }

    await supabase.auth.admin.updateUserById(user.id, { password });

    await supabase
      .from("password_resets")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", resetRecord.id);

    return c.json({ message: "Password berhasil direset. Silakan login." });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default passwordReset;
