-- ============================================================================
-- MIGRASI: PERBAIKAN REGISTER WA-OTP ("Gagal membuat akun" / 500 saat OTP valid)
-- Jalankan manual di Supabase SQL Editor (blok semua → Run). Idempoten.
-- ============================================================================
-- Gejala: register WhatsApp sukses kirim OTP, user memasukkan kode VALID,
-- tapi backend membalas 500 "Gagal membuat akun. Coba lagi beberapa saat."
--
-- Penyebab (ditemukan di backend/src/routes/wa-auth.ts → register/verify):
--   Insert baris `users` GAGAL karena skema belum lengkap. Kegagalan paling
--   umum (semua melempar error generik → 500):
--     1. Kolom users.phone / email_verified / status belum ada
--        (migration-wa-auth.sql & migration-journal-rpc-and-email-verify.sql
--        & migration-admin-suspend.sql belum dijalankan).
--     2. Kolom company_members.status belum ada — buildLoginPayload memakai
--        .eq("status", "active") sehingga lookup membership error.
--     3. Plan 'free' tidak ada di tabel plans → trigger
--        create_default_subscription melempar error (plan_id NULL) →
--        INSERT users ikut gagal (trigger AFTER INSERT membatalkan statement).
--     4. Sisa baris subscriptions lama (user_id UNIQUE) untuk auth user yang
--        sama → trigger insert duplikat → INSERT users gagal.
-- Migrasi ini menutup KEEMPAT penyebab sekaligus, aman dijalankan berulang.
-- ============================================================================

-- ─── 1. Kolom users untuk auth WhatsApp (phone) & verifikasi ───────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;

-- User WhatsApp boleh tanpa email (Google/email user tetap terisi)
ALTER TABLE public.users
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- ─── 2. Enum & kolom status (moderasi admin: suspend) ──────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_status') THEN
    CREATE TYPE entity_status AS ENUM ('active', 'suspended');
  END IF;
END $$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status entity_status NOT NULL DEFAULT 'active';
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS status entity_status NOT NULL DEFAULT 'active';

-- ─── 3. company_members.status — WAJIB: buildLoginPayload memfilter ────────
-- status='active'. Tanpa kolom ini, verifikasi OTP register/login 500.
ALTER TABLE public.company_members
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'suspended'));

-- Backfill: tiap user wajib punya membership aktif untuk company default-nya,
-- supaya login tidak gagal "no_active_membership".
INSERT INTO public.company_members (user_id, company_id, role, status, created_at)
SELECT
  u.id,
  u.company_id,
  CASE WHEN u.role IN ('owner', 'akuntan') THEN u.role ELSE 'akuntan' END,
  'active',
  COALESCE(u.created_at, now())
FROM public.users u
WHERE u.company_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- ─── 4. Plan 'free' wajib ada — dipakai trigger subscription & limit plan ──
INSERT INTO plans (name, display_name, price_monthly, price_yearly, max_companies, max_journals, features)
VALUES ('free', 'Free', 0, 0, 1, 50,
  '["chart_of_accounts", "journal_entries", "dashboard", "general_ledger"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ─── 5. Trigger subscription tahan-gagal ───────────────────────────────────
-- INSERT users TIDAK BOLEH gagal hanya karena:
--   - plan 'free' hilang (dilewati + warning), atau
--   - user sudah punya baris subscriptions sisa (unique_violation → skip).
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  SELECT id INTO free_plan_id FROM plans WHERE name = 'free' LIMIT 1;

  IF free_plan_id IS NULL THEN
    RAISE WARNING 'create_default_subscription: plan free tidak ditemukan — subscription dilewati untuk user %', NEW.id;
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO subscriptions (user_id, plan_id, status, trial_start, trial_end, current_period_start, current_period_end)
    VALUES (
      NEW.id,
      free_plan_id,
      'trialing',
      now(),
      now() + interval '15 days',
      now(),
      now() + interval '15 days'
    );
  EXCEPTION WHEN unique_violation THEN
    -- Sudah ada subscription untuk user ini (sisa data lama) — biarkan.
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 6. Tabel OTP WhatsApp (kalau migration-wa-auth.sql belum dijalankan) ──
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

-- ─── VERIFIKASI SETELAH MIGRASI (jalankan manual di SQL Editor) ────────────
--   1. SELECT column_name FROM information_schema.columns
--      WHERE table_name = 'users'
--        AND column_name IN ('phone','email_verified','status');  → 3 baris.
--   2. SELECT column_name FROM information_schema.columns
--      WHERE table_name = 'company_members' AND column_name = 'status'; → 1 baris.
--   3. SELECT count(*) FROM plans WHERE name = 'free';  → 1.
--   4. SELECT count(*) FROM users u WHERE NOT EXISTS (
--        SELECT 1 FROM company_members cm
--        WHERE cm.user_id = u.id AND cm.company_id = u.company_id);  → 0.
