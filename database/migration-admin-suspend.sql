-- ──────────────────────────────────────────────────────────────────────
-- Migrasi: Status akun untuk moderasi admin (suspend / soft delete)
--
-- Admin aplikasi (via admin portal) bisa MENONAKTIFKAN user atau company
-- tanpa menghapus data (soft delete):
--   - users.status      = 'suspended' → user tidak bisa login & semua
--                         request-nya ditolak middleware auth
--   - companies.status  = 'suspended' → seluruh anggota company tersebut
--                         kehilangan akses (data tetap aman tersimpan)
--
-- Jalankan: psql "$DATABASE_URL" -f migration-admin-suspend.sql
-- ──────────────────────────────────────────────────────────────────────

-- Enum status entitas (fail-aman: jika sudah ada, jangan buat ulang)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_status') THEN
    CREATE TYPE entity_status AS ENUM ('active', 'suspended');
  END IF;
END $$;

-- Kolom status pada users & companies (default active = perilaku lama)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status entity_status NOT NULL DEFAULT 'active';

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS status entity_status NOT NULL DEFAULT 'active';
