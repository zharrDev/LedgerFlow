-- Migration: WhatsApp OTP (passwordless) auth
-- Wajib dijalankan manual di Supabase SQL editor (dashboard) sebelum deploy
-- fitur OTP WhatsApp. User Google/existing sama sekali tidak terpengaruh.

-- 1) Identitas login via WhatsApp
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;

-- 2) User WhatsApp bisa tanpa email (Google & email user tetap terisi)
ALTER TABLE IF EXISTS public.users
  ALTER COLUMN email DROP NOT NULL;

-- 3) Tabel OTP khusus WhatsApp (terpisah dari otp_codes legacy)
CREATE TABLE IF NOT EXISTS public.wa_otp_codes (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone         TEXT NOT NULL,
  code          TEXT NOT NULL,
  purpose       TEXT NOT NULL CHECK (purpose IN ('register', 'login')),
  expires_at    TIMESTAMPTZ NOT NULL,
  used          BOOLEAN NOT NULL DEFAULT false,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_otp_phone_purpose
  ON public.wa_otp_codes (phone, purpose);

GRANT ALL PRIVILEGES ON TABLE public.wa_otp_codes TO service_role;

-- 4) Bersihkan tabel otp_codes legacy. Sudah diverifikasi tidak dipakai:
--    - grep seluruh backend: tanpa referensi apa pun
--    - forgot-password memakai tabel password_resets (link email, 1 jam)
--    Hapus komentar baris berikut bila ingin mempertahankan tabel lama.
DROP TABLE IF EXISTS public.otp_codes;