-- ============================================================================
-- LEDGERFLOW - COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. ENUM TYPES ─────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'expired', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. CORE TABLES ────────────────────────────────────────────────

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  code       TEXT,
  currency   TEXT NOT NULL DEFAULT 'IDR',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users (references Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'akuntan', 'owner')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Accounts (Chart of Accounts)
CREATE TABLE IF NOT EXISTS accounts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
  normal_balance TEXT NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
  parent_id     UUID REFERENCES accounts(id),
  is_active     BOOLEAN DEFAULT true,
  UNIQUE(company_id, code)
);

-- Periods
CREATE TABLE IF NOT EXISTS periods (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year       INTEGER NOT NULL,
  month      INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at  TIMESTAMPTZ,
  UNIQUE(company_id, year, month)
);

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_id    UUID REFERENCES periods(id),
  created_by   UUID REFERENCES users(id),
  entry_number TEXT NOT NULL,
  entry_date   DATE NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted')),
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, entry_number)
);

-- Journal Entry Lines
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id  UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id        UUID NOT NULL REFERENCES accounts(id),
  debit             NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit            NUMERIC(18,2) NOT NULL DEFAULT 0,
  memo              TEXT,
  CHECK (debit >= 0 AND credit >= 0),
  CHECK (debit = 0 OR credit = 0)
);

-- Journal Counters (auto-increment per company per month)
CREATE TABLE IF NOT EXISTS journal_counters (
  company_id UUID,
  year_month TEXT,
  last_number INT DEFAULT 0,
  PRIMARY KEY (company_id, year_month)
);

-- ─── 3. SUBSCRIPTION & PAYMENT TABLES ──────────────────────────────

-- Plans (pricing definitions)
CREATE TABLE IF NOT EXISTS plans (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  price_monthly BIGINT NOT NULL DEFAULT 0,
  price_yearly  BIGINT NOT NULL DEFAULT 0,
  max_companies INT NOT NULL DEFAULT 1,
  max_journals  INT DEFAULT NULL,
  features      JSONB NOT NULL DEFAULT '[]',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Insert default plans
INSERT INTO plans (name, display_name, price_monthly, price_yearly, max_companies, max_journals, features) VALUES
  ('free', 'Free', 0, 0, 1, 50, '["Chart of Accounts", "Journal Entries (50/bulan)", "Dashboard", "Buku Besar"]'::jsonb),
  ('pro', 'Pro', 99000, 999000, 3, NULL, '["Semua fitur Free", "Unlimited Journal Entries", "Laporan Laba Rugi", "Neraca", "Arus Kas", "Export PDF", "3 Perusahaan", "Priority Support"]'::jsonb),
  ('enterprise', 'Enterprise', 299000, 2999000, -1, NULL, '["Semua fitur Pro", "Unlimited Perusahaan", "Multi-user & Roles", "API Access", "Export PDF & CSV", "Custom Reports", "Dedicated Support", "Audit Trail"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id            UUID REFERENCES companies(id) ON DELETE SET NULL,
  plan_id               UUID NOT NULL REFERENCES plans(id),
  status                subscription_status NOT NULL DEFAULT 'trialing',
  billing_cycle         TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  trial_start           TIMESTAMPTZ,
  trial_end             TIMESTAMPTZ,
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  midtrans_subscription_id TEXT,
  midtrans_saved_token_id  TEXT,
  canceled_at           TIMESTAMPTZ,
  cancel_reason         TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Payments (transaction history)
CREATE TABLE IF NOT EXISTS payments (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id         UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id                TEXT NOT NULL UNIQUE,
  midtrans_transaction_id TEXT,
  amount                  BIGINT NOT NULL,
  currency                TEXT NOT NULL DEFAULT 'IDR',
  status                  payment_status NOT NULL DEFAULT 'pending',
  payment_type            TEXT,
  snap_token              TEXT,
  snap_redirect_url       TEXT,
  midtrans_response       JSONB,
  paid_at                 TIMESTAMPTZ,
  expired_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- ─── 4. PASSWORD RESET & OTP TABLES ────────────────────────────────

-- Password Resets
CREATE TABLE IF NOT EXISTS password_resets (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  used       BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- OTP Codes
CREATE TABLE IF NOT EXISTS otp_codes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,
  purpose    TEXT NOT NULL CHECK (purpose IN ('register_verification', 'forgot_password')),
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 5. INDEXES ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_user_purpose ON otp_codes(user_id, purpose);

-- ─── 6. GRANTS ─────────────────────────────────────────────────────
GRANT ALL PRIVILEGES ON TABLE public.companies TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.users TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.accounts TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.periods TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.journal_entries TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.journal_entry_lines TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.journal_counters TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.plans TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.subscriptions TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.payments TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.password_resets TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.otp_codes TO service_role;

GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.companies TO authenticated;
GRANT SELECT ON public.accounts TO authenticated;
GRANT SELECT ON public.periods TO authenticated;
GRANT SELECT ON public.journal_entries TO authenticated;
GRANT SELECT ON public.journal_entry_lines TO authenticated;

-- ─── 7. RLS (Row Level Security) ───────────────────────────────────

-- Disable RLS for service_role-managed tables (backend uses service_role key)
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE periods DISABLE ROW LEVEL SECURITY;

-- Plans: readable by everyone
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans viewable by everyone" ON plans FOR SELECT USING (true);

-- Subscriptions: user can only see their own
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Payments: user can only see their own
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── 8. TRIGGERS ───────────────────────────────────────────────────

-- Auto-create FREE subscription when user registers
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  SELECT id INTO free_plan_id FROM plans WHERE name = 'free' LIMIT 1;

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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_created_subscription ON users;
CREATE TRIGGER on_user_created_subscription
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- ─── 9. HELPER FUNCTIONS ───────────────────────────────────────────

-- Check if user has active subscription
CREATE OR REPLACE FUNCTION is_subscription_active(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sub RECORD;
BEGIN
  SELECT * INTO sub FROM subscriptions WHERE user_id = p_user_id LIMIT 1;

  IF NOT FOUND THEN RETURN false; END IF;

  IF sub.status = 'trialing' AND sub.trial_end > now() THEN
    RETURN true;
  END IF;

  IF sub.status = 'active' AND sub.current_period_end > now() THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 10. TIMESTAMPS LENGKAP DI SEMUA TABEL UTAMA ─────────────────────
-- Pastikan setiap tabel utama punya created_at & updated_at
ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE periods ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE periods ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Trigger otomatis update updated_at saat row diubah
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON accounts;
CREATE TRIGGER trg_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_periods_updated_at ON periods;
CREATE TRIGGER trg_periods_updated_at BEFORE UPDATE ON periods FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_journal_entries_updated_at ON journal_entries;
CREATE TRIGGER trg_journal_entries_updated_at BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_journal_entry_lines_updated_at ON journal_entry_lines;
CREATE TRIGGER trg_journal_entry_lines_updated_at BEFORE UPDATE ON journal_entry_lines FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 11. SOFT DELETE JOURNAL ENTRIES ─────────────────────────────────
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ─── 12. COMPANY MEMBERS (Relasi M:M users <-> companies) ────────────
CREATE TABLE IF NOT EXISTS company_members (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'akuntan', 'owner')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_company_members_user ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company ON company_members(company_id);
GRANT ALL PRIVILEGES ON TABLE public.company_members TO service_role;

-- ─── 13. SUPABASE STORAGE BUCKETS (upload file) ──────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', true)
  ON CONFLICT (id) DO NOTHING;

-- ─── 14. CONSTRAINT: normal_balance harus konsisten dengan type ──────
-- Mencegah data korup: mis. akun ASSET dengan normal_balance CREDIT.
-- Backend sudah menurunkan normal_balance dari type, ini jaring pengaman
-- di level DB (defense-in-depth). Idempoten via DROP IF EXISTS.
--
-- PENTING: data lama bisa saja punya normal_balance yang tidak konsisten
-- dengan type (dari sebelum backend dikeraskan). Postgres memvalidasi SEMUA
-- baris saat CHECK dipasang, jadi baris yang melanggar akan bikin ADD
-- CONSTRAINT gagal. Karena itu kita rapikan datanya DULU: normal_balance
-- selalu diturunkan dari type (ASSET/EXPENSE = DEBIT, sisanya = CREDIT).
UPDATE accounts
  SET normal_balance = CASE
    WHEN type IN ('ASSET', 'EXPENSE') THEN 'DEBIT'
    ELSE 'CREDIT'
  END
WHERE normal_balance <> CASE
    WHEN type IN ('ASSET', 'EXPENSE') THEN 'DEBIT'
    ELSE 'CREDIT'
  END;

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS chk_accounts_type_normal_balance;
ALTER TABLE accounts ADD CONSTRAINT chk_accounts_type_normal_balance CHECK (
  (type IN ('ASSET', 'EXPENSE') AND normal_balance = 'DEBIT') OR
  (type IN ('LIABILITY', 'EQUITY', 'REVENUE') AND normal_balance = 'CREDIT')
);

-- Index untuk mempercepat query yang sering memfilter deleted_at & period
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_status
  ON journal_entries(company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account
  ON journal_entry_lines(account_id);

-- ─── 15. RPC ATOMIK: buat & update jurnal dalam satu transaksi ───────
-- Fungsi PL/pgSQL berjalan dalam satu transaksi: bila ada baris yang gagal,
-- SELURUH operasi di-rollback otomatis (tidak ada header tanpa baris / tidak
-- balance). Nomor jurnal diambil via journal_counters agar aman dari race
-- condition saat banyak request bersamaan.
--
-- p_lines berbentuk JSONB array: [{ "account_id": "...", "debit": 0, "credit": 100, "memo": null }, ...]

CREATE OR REPLACE FUNCTION create_journal_entry(
  p_company_id  UUID,
  p_period_id   UUID,
  p_created_by  UUID,
  p_entry_date  DATE,
  p_description TEXT,
  p_status      TEXT,
  p_lines       JSONB
) RETURNS journal_entries
LANGUAGE plpgsql
AS $$
DECLARE
  v_year_month   TEXT;
  v_next         INT;
  v_entry_number TEXT;
  v_entry        journal_entries;
  v_total_debit  NUMERIC(18,2);
  v_total_credit NUMERIC(18,2);
  v_line         JSONB;
BEGIN
  IF p_lines IS NULL OR jsonb_array_length(p_lines) < 2 THEN
    RAISE EXCEPTION 'Minimal 2 baris jurnal';
  END IF;

  -- Balance check di level DB
  SELECT
    COALESCE(SUM((l->>'debit')::NUMERIC), 0),
    COALESCE(SUM((l->>'credit')::NUMERIC), 0)
  INTO v_total_debit, v_total_credit
  FROM jsonb_array_elements(p_lines) AS l;

  IF abs(v_total_debit - v_total_credit) > 0.005 THEN
    RAISE EXCEPTION 'Debit (%) tidak sama dengan Kredit (%)', v_total_debit, v_total_credit;
  END IF;

  -- Nomor jurnal aman dari race condition (atomic upsert + row lock)
  v_year_month := to_char(p_entry_date, 'YYYYMM');
  INSERT INTO journal_counters (company_id, year_month, last_number)
    VALUES (p_company_id, v_year_month, 1)
  ON CONFLICT (company_id, year_month)
    DO UPDATE SET last_number = journal_counters.last_number + 1
  RETURNING last_number INTO v_next;

  v_entry_number := 'JE-' || v_year_month || '-' || lpad(v_next::TEXT, 4, '0');

  INSERT INTO journal_entries
    (company_id, period_id, created_by, entry_number, entry_date, description, status)
  VALUES
    (p_company_id, p_period_id, p_created_by, v_entry_number, p_entry_date, p_description,
     CASE WHEN p_status = 'posted' THEN 'posted' ELSE 'draft' END)
  RETURNING * INTO v_entry;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, memo)
    VALUES (
      v_entry.id,
      (v_line->>'account_id')::UUID,
      COALESCE((v_line->>'debit')::NUMERIC, 0),
      COALESCE((v_line->>'credit')::NUMERIC, 0),
      v_line->>'memo'
    );
  END LOOP;

  RETURN v_entry;
END;
$$;

-- Replace seluruh baris jurnal (dipakai saat edit) secara atomik + balance check.
CREATE OR REPLACE FUNCTION replace_journal_entry_lines(
  p_entry_id UUID,
  p_lines    JSONB
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_debit  NUMERIC(18,2);
  v_total_credit NUMERIC(18,2);
  v_line         JSONB;
BEGIN
  IF p_lines IS NULL OR jsonb_array_length(p_lines) < 2 THEN
    RAISE EXCEPTION 'Minimal 2 baris jurnal';
  END IF;

  SELECT
    COALESCE(SUM((l->>'debit')::NUMERIC), 0),
    COALESCE(SUM((l->>'credit')::NUMERIC), 0)
  INTO v_total_debit, v_total_credit
  FROM jsonb_array_elements(p_lines) AS l;

  IF abs(v_total_debit - v_total_credit) > 0.005 THEN
    RAISE EXCEPTION 'Debit (%) tidak sama dengan Kredit (%)', v_total_debit, v_total_credit;
  END IF;

  DELETE FROM journal_entry_lines WHERE journal_entry_id = p_entry_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, memo)
    VALUES (
      p_entry_id,
      (v_line->>'account_id')::UUID,
      COALESCE((v_line->>'debit')::NUMERIC, 0),
      COALESCE((v_line->>'credit')::NUMERIC, 0),
      v_line->>'memo'
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION create_journal_entry(UUID, UUID, UUID, DATE, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION replace_journal_entry_lines(UUID, JSONB) TO service_role;

-- ─── 16. VERIFIKASI EMAIL SAAT REGISTER ─────────────────────────────
-- Menambah flag email_verified di users. Register membuat akun dengan
-- email_verified=false; login diblokir sampai OTP diverifikasi.
-- Idempoten via IF NOT EXISTS.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- Grandfather: semua user yang SUDAH ada dianggap terverifikasi supaya
-- tidak terkunci saat login berikutnya (mereka daftar sebelum fitur ini ada).
-- Aman dijalankan berkali-kali (hanya menyentuh yang masih false).
UPDATE users SET email_verified = true WHERE email_verified = false;

-- Anti brute-force OTP: hitung percobaan verify yang gagal per kode.
-- Di-reset natural saat user minta kode baru (kode lama di-set used=true).
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;


