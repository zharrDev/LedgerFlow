-- 002_add_performance_indexes.sql
-- Performance indexes untuk query yang paling sering dipanggil.
-- Jalankan: psql "$DATABASE_URL" -f database/migrations/002_add_performance_indexes.sql
--
-- Catatan: Supabase (PostgreSQL) tidak punya Prisma — indexes dibuat
-- langsung via SQL. Setelah migrasi ini, query pada tabel journal_entries,
-- journal_entry_lines, accounts, periods, dan users akan lebih cepat.

-- ── journal_entries ──────────────────────────────────────────────
-- Query paling umum: list entries per company, urutkan by entry_number/date.
CREATE INDEX IF NOT EXISTS idx_je_company_status_date
  ON journal_entries (company_id, status, entry_date DESC);

-- Soft-delete filter: query WHERE deleted_at IS NULL sangat umum.
CREATE INDEX IF NOT EXISTS idx_je_company_deleted
  ON journal_entries (company_id, deleted_at)
  WHERE deleted_at IS NULL;

-- Entry number lookup per company (prefix search, quota check).
CREATE INDEX IF NOT EXISTS idx_je_company_entry_number
  ON journal_entries (company_id, entry_number DESC);

-- Period-based filter.
CREATE INDEX IF NOT EXISTS idx_je_period_id
  ON journal_entries (period_id);

-- ── journal_entry_lines ──────────────────────────────────────────
-- Filter by account_id (ledger/buku besar) — query paling berat.
CREATE INDEX IF NOT EXISTS idx_jel_account_id
  ON journal_entry_lines (account_id);

-- Filter by journal_entry_id (detail jurnal, report aggregation).
CREATE INDEX IF NOT EXISTS idx_jel_entry_id
  ON journal_entry_lines (journal_entry_id);

-- Composite: account + debit/credit untuk aggregate saldo akun.
CREATE INDEX IF NOT EXISTS idx_jel_account_debit_credit
  ON journal_entry_lines (account_id, debit, credit);

-- ── accounts ─────────────────────────────────────────────────────
-- List akun per company, urutkan by code.
CREATE INDEX IF NOT EXISTS idx_accounts_company_code
  ON accounts (company_id, code);

-- Filter by type per company (laporan butuh semua REVENUE, EXPENSE, dll).
CREATE INDEX IF NOT EXISTS idx_accounts_company_type
  ON accounts (company_id, type);

-- ── periods ──────────────────────────────────────────────────────
-- Lookup period by company + year + month (auto-detect saat buat jurnal).
CREATE INDEX IF NOT EXISTS idx_periods_company_year_month
  ON periods (company_id, year, month);

-- ── users ────────────────────────────────────────────────────────
-- Auth lookup by email (login).
CREATE INDEX IF NOT EXISTS idx_users_email
  ON users (email);

-- Status check per company (user-management, admin).
CREATE INDEX IF NOT EXISTS idx_users_company_status
  ON users (company_id, status);

-- ── subscriptions ────────────────────────────────────────────────
-- Quota check: find plan by user_id.
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON subscriptions (user_id);

-- ── password_resets ──────────────────────────────────────────────
-- Token lookup: token + used + expires_at.
CREATE INDEX IF NOT EXISTS idx_password_resets_token
  ON password_resets (token, used, expires_at);
