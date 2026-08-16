-- ============================================================================
-- MIGRASI: HAPUS ROLE 'admin' PER-COMPANY
-- Jalankan di Supabase SQL Editor untuk database yang SUDAH pernah di-setup.
--
-- Model role baru: per company hanya ada owner & akuntan.
--   - Owner  = akses penuh di company-nya
--   - Akuntan = pencatatan (jurnal, akun)
--   - Admin aplikasi (pemilik aplikasi) masuk lewat gerbang terpisah
--     (/portal-akses), read-only + moderasi — BUKAN role di tabel users.
--
-- Yang dilakukan:
--   1. User yang masih ber-role 'admin' dikonversi jadi 'akuntan'
--      (tetap bisa pakai aplikasi, tapi tidak lagi punya hak kelola
--      periode/anggota — itu sekarang khusus owner).
--   2. Constraint CHECK users.role & company_members.role diperketat
--      menjadi ('akuntan', 'owner').
-- ============================================================================

-- 1) Konversi data lama: admin per-company -> akuntan
UPDATE public.users
SET role = 'akuntan'
WHERE role = 'admin';

UPDATE public.company_members
SET role = 'akuntan'
WHERE role = 'admin';

-- 2) Perketat CHECK constraint (gagal bila masih ada data 'admin')
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role IN ('akuntan', 'owner'));

ALTER TABLE public.company_members
  DROP CONSTRAINT IF EXISTS company_members_role_check;
ALTER TABLE public.company_members
  ADD CONSTRAINT company_members_role_check CHECK (role IN ('akuntan', 'owner'));
