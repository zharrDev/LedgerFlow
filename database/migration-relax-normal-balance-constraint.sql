-- Migration: Longgarkan constraint chk_accounts_type_normal_balance agar
-- mengizinkan akun "contra" yang normal-balance-nya berlawanan dengan type,
-- yang merupakan praktik akuntansi sah:
--   * Contra-asset  : Akumulasi Penyusutan (type ASSET, normal_balance CREDIT)
--   * Contra-equity : Prive Owner / Drawing (type EQUITY, normal_balance DEBIT)
--
-- Akun selain dua pengecualian di atas tetap wajib mematuhi pemetaan standar
-- (ASSET/EXPENSE = DEBIT; LIABILITY/REVENUE = CREDIT; EQUITY = CREDIT).
--
-- Idempoten: bisa dijalankan berulang (migrasi diterapkan manual via Supabase
-- SQL editor).

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS chk_accounts_type_normal_balance;

ALTER TABLE accounts ADD CONSTRAINT chk_accounts_type_normal_balance CHECK (
  (
    normal_balance = 'DEBIT'
    AND (
      type IN ('ASSET', 'EXPENSE')
      OR (
        type = 'EQUITY'
        AND (
          name ILIKE '%prive%'
          OR name ILIKE '%drawing%'
          OR name ILIKE '%penarikan%'
        )
      )
    )
  )
  OR
  (
    normal_balance = 'CREDIT'
    AND (
      type IN ('LIABILITY', 'REVENUE')
      OR type = 'EQUITY'
      OR (
        type = 'ASSET'
        AND (
          name ILIKE '%akumulasi%'
          OR name ILIKE '%penyusutan%'
          OR name ILIKE '%accumulated%'
          OR name ILIKE '%depreciation%'
        )
      )
    )
  )
);
