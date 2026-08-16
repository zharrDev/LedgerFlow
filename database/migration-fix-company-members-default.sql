-- Perbaikan: DEFAULT 'member' pada company_members.role MELANGGAR CHECK
-- constraint (CHECK hanya mengizinkan admin/akuntan/owner). Kode aplikasi
-- selalu menyetel role eksplisit, jadi default tidak pernah dipakai — tapi
-- default yang invalid membuat insert tanpa role gagal dengan error samar.
-- Solusi: hapus default; insert tanpa role akan gagal eksplisit (NOT NULL).

ALTER TABLE public.company_members ALTER COLUMN role DROP DEFAULT;
