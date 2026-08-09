-- =====================================================================
-- MIGRASI: section 14 (CHECK normal_balance) + 15 (RPC jurnal atomik)
--          + 16 (verifikasi email saat register)
-- ---------------------------------------------------------------------
-- CARA PAKAI DI SUPABASE SQL EDITOR:
--   1. Buka file ini, blok SELURUH isi (Ctrl+A).
--   2. Klik Run. JANGAN menyeleksi sebagian — Run hanya menjalankan teks
--      yang ter-highlight, dan itulah yang memotong badan fungsi $$...$$
--      sehingga muncul "unterminated dollar-quoted string".
-- Semua statement di bawah idempoten (aman dijalankan berkali-kali).
-- =====================================================================

-- ─── PRASYARAT: tabel OTP & password reset ───────────────────────────
-- Dibuat di sini karena DB ini belum punya tabel tersebut (error
-- "relation otp_codes does not exist"). IF NOT EXISTS → aman bila sudah ada.
CREATE TABLE IF NOT EXISTS password_resets (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  used       BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,
  purpose    TEXT NOT NULL CHECK (purpose IN ('register_verification', 'forgot_password')),
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_user_purpose ON otp_codes(user_id, purpose);
GRANT ALL PRIVILEGES ON TABLE public.password_resets TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.otp_codes TO service_role;

-- ─── 14. CONSTRAINT: normal_balance harus konsisten dengan type ──────
-- Rapikan data lama DULU (Postgres memvalidasi semua baris saat CHECK
-- dipasang) lalu pasang constraint-nya.
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

CREATE INDEX IF NOT EXISTS idx_journal_entries_company_status
  ON journal_entries(company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account
  ON journal_entry_lines(account_id);

-- ─── 15. RPC ATOMIK: buat & update jurnal dalam satu transaksi ───────
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

  SELECT
    COALESCE(SUM((l->>'debit')::NUMERIC), 0),
    COALESCE(SUM((l->>'credit')::NUMERIC), 0)
  INTO v_total_debit, v_total_credit
  FROM jsonb_array_elements(p_lines) AS l;

  IF abs(v_total_debit - v_total_credit) > 0.005 THEN
    RAISE EXCEPTION 'Debit (%) tidak sama dengan Kredit (%)', v_total_debit, v_total_credit;
  END IF;

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
-- email_verified: register membuat akun dengan false; login diblokir
-- sampai OTP diverifikasi. Grandfather user lama supaya tidak terkunci.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
UPDATE users SET email_verified = true WHERE email_verified = false;

-- Anti brute-force OTP: hitung percobaan verify yang gagal per kode.
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;
