-- ============================================================================
-- MIGRASI: SINKRONKAN ROLE company_members DENGAN users
-- Jalankan di Supabase SQL Editor untuk database yang sudah terpakai.
--
-- Latar belakang:
--   Role user tersimpan di DUA tabel: users.role dan company_members.role.
--   Sebelumnya, endpoint PUT role (ubah role anggota) HANYA meng-update
--   users.role, TIDAK meng-update company_members.role. Akibatnya keduanya
--   bisa tidak sinkron, dan perhitungan "jumlah owner" (countOwners) bisa
--   salah → user yang BUKAN owner terakhir ikut terblokir saat dihapus
--   (pesan: "Tidak bisa menghapus owner terakhir").
--
-- Yang dilakukan:
--   1. Sinkronkan company_members.role = users.role untuk semua baris.
--   2. Buat trigger agar update role di users otomatis ikut meng-update
--      company_members (mencegah desinkron di masa depan, lapisan kedua
--      selain perbaikan di kode backend).
-- ============================================================================

-- 1) Sinkronkan data lama: samakan company_members.role dengan users.role
UPDATE public.company_members cm
SET role = u.role
FROM public.users u
WHERE cm.user_id = u.id;

-- 2) Trigger: setiap role di users diubah, company_members ikut diubah.
--    (Backend sudah meng-update keduanya; trigger ini menjaga kalau ada
--    jalur lain yang lupa menyinkronkan.)
CREATE OR REPLACE FUNCTION sync_company_members_role()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.company_members
  SET role = NEW.role
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_company_members_role ON public.users;
CREATE TRIGGER trg_sync_company_members_role
AFTER UPDATE OF role ON public.users
FOR EACH ROW
EXECUTE FUNCTION sync_company_members_role();
