import { Hono } from "hono";

const passwordReset = new Hono();

// Seluruh alur password email (lupa + reset) DINONAKTIFKAN — aplikasi hanya
// memakai WhatsApp OTP dan Google. Endpoint dipertahankan sebagai 410 Gone
// agar klien lama mendapat sinyal jelas, bukan 404 misterius.

// POST /api/auth/forgot-password — DINONAKTIFKAN.
// Login password dimatikan: gunakan WhatsApp OTP atau Google.
passwordReset.post("/forgot-password", async (c) => {
  return c.json(
    {
      error:
        "Reset password dinonaktifkan. Masuk dengan WhatsApp OTP atau Google.",
    },
    410,
  );
});

// POST /api/auth/reset-password — DINONAKTIFKAN.
// Login password dimatikan: gunakan WhatsApp OTP atau Google.
passwordReset.post("/reset-password", async (c) => {
  return c.json(
    {
      error:
        "Reset password dinonaktifkan. Masuk dengan WhatsApp OTP atau Google.",
    },
    410,
  );
});

export default passwordReset;
