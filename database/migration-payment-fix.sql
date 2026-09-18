-- ============================================================================
-- MIGRASI: FIX PEMBAYARAN (subscription_id nullable + plan/cycle di payment)
-- Jalankan manual di Supabase SQL Editor (blok semua → Run). Idempoten.
-- ============================================================================
-- KONTEKS:
--   Sebelumnya POST /api/payments/subscribe selalu GAGAL insert payment record
--   karena kolom payments.subscription_id NOT NULL padahal diisi null (belum
--   ada subscription saat checkout). Akibatnya: record tidak tersimpan →
--   test-complete 404 "Payment tidak ditemukan" → upgrade tidak berfungsi.
--
--   Selain itu aktivasi plan (webhook/test-complete) perlu tahu plan & cycle
--   yang DIBAYAR — sekarang disimpan di baris payment itu sendiri.
-- ============================================================================

-- 1. subscription_id boleh null (diisi setelah pembayaran sukses)
ALTER TABLE payments ALTER COLUMN subscription_id DROP NOT NULL;

-- 2. Plan & billing cycle yang dibayar (sumber kebenaran saat aktivasi)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS plan_name TEXT NOT NULL DEFAULT 'pro';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly'
  CHECK (billing_cycle IN ('monthly', 'yearly'));

-- 3. Index lookup webhook (by order_id sudah UNIQUE; tambah status untuk query admin)
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 4. Catatan data lama: record lama (yang gagal tersimpan) tidak bisa dipulihkan —
--    user yang pernah "checkout gagal" cukup checkout ulang setelah migrasi ini.
