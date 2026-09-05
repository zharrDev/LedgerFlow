-- ============================================================================
-- MIGRASI: UNIFY MEMBERSHIP — company_members jadi SINGLE SOURCE OF TRUTH
-- ============================================================================
-- Status : LAPORAN SAJA — TIDAK dijalankan otomatis. Jalankan manual di
--          Supabase SQL Editor setelah review + backup database.
-- Isi    :
--   1. Kolom status (active/suspended) di company_members  → WAJIB DULU,
--      karena backfill di Blok 2 menyisipkan nilai status.
--   2. Backfill: tiap baris `users` wajib punya baris padanan di
--      company_members (INSERT ... SELECT ... ON CONFLICT DO NOTHING) supaya
--      data lama tidak hilang.
--   3. Kolom void di journal_entries (voided_at, voided_by, void_reason)
--      untuk menggantikan hard-delete jurnal.
--   4. Indeks pendukung query baru.
--
-- CATATAN DESAIN:
--   - Kolom users.company_id & users.role SENGAJA TIDAK dihapus (breaking
--     change besar). Setelah migrasi ini backend BERHENTI MEMBACA kolom itu
--     untuk otorisasi; users murni jadi tabel profil (nama, avatar, phone,
--     email). Kolom legacy tetap diisi sebagai "company default" agar data
--     lama tetap konsisten, tapi tidak pernah dipercaya.
--   - ON CONFLICT DO NOTHING: baris company_members yang sudah ada TIDAK
--     ditimpa dari users — company_members-lah sumber kebenaran ke depan.
-- ============================================================================

-- ============================================================================
-- BLOK 1: TAMBAH KOLOM STATUS KE company_members (harus sebelum Blok 2)
-- ============================================================================
ALTER TABLE public.company_members
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
CHECK (status IN ('active', 'suspended'));

-- ============================================================================
-- BLOK 2: BACKFILL company_members DARI users (data lama tidak hilang)
-- ============================================================================
-- Setiap user yang punya company_id di profil LEGACY wajib punya baris
-- membership. Role non-standar sisa model lama (mis. 'admin' yang sudah
-- dihapus) dipetakan ke 'akuntan' agar tidak melanggar CHECK constraint —
-- role yang benar tetap dibaca dari company_members yang sudah ada
-- (DO NOTHING tidak menimpa baris yang sudah ada).
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

-- ============================================================================
-- BLOK 3: TAMBAH KOLOM VOID KE journal_entries (void/reverse, BAGIAN 7)
-- ============================================================================
ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS void_reason TEXT;

-- ============================================================================
-- BLOK 4: INDEKS PENDUKUNG
-- ============================================================================
-- Lookup membership per (user, company) — dipakai authMiddleware tiap request
CREATE INDEX IF NOT EXISTS idx_company_members_user_active
ON public.company_members(user_id, company_id)
WHERE status = 'active';

-- List anggota per company + hitung owner aktif
CREATE INDEX IF NOT EXISTS idx_company_members_company_active
ON public.company_members(company_id, user_id)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_company_members_status
ON public.company_members(status);

-- Filter jurnal void di laporan (partial index, hanya baris void)
CREATE INDEX IF NOT EXISTS idx_journal_entries_voided
ON public.journal_entries(voided_at)
WHERE voided_at IS NOT NULL;

-- ============================================================================
-- VERIFIKASI SETELAH MIGRASI (jalankan manual):
--   1. Tidak ada user bermembership kurang dari data lama:
--        SELECT count(*) FROM users u
--        WHERE u.company_id IS NOT NULL
--          AND NOT EXISTS (
--            SELECT 1 FROM company_members cm
--            WHERE cm.user_id = u.id AND cm.company_id = u.company_id);
--      Harus 0.
--   2. Kolom status ada & terisi 'active':
--        SELECT status, count(*) FROM company_members GROUP BY status;
--   3. Kolom void ada:
--        SELECT column_name FROM information_schema.columns
--        WHERE table_name = 'journal_entries'
--          AND column_name IN ('voided_at','voided_by','void_reason');
--
-- ROLLBACK: migrasi ini additive — hapus kolom yang ditambahkan bila perlu:
--   ALTER TABLE company_members DROP COLUMN IF EXISTS status;
--   ALTER TABLE journal_entries
--     DROP COLUMN IF EXISTS voided_at,
--     DROP COLUMN IF EXISTS voided_by,
--     DROP COLUMN IF EXISTS void_reason;
-- (Baris hasil backfill dibiarkan — aman karena memang seharusnya ada.)
-- ============================================================================
