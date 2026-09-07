// Auto-heal untuk "auth yatim": user Supabase Auth yang nomornya terdaftar
// di auth.users TETAPI tidak punya profil di tabel public.users — biasanya
// sisa penghapusan akun yang tidak bersih (profil ter-CASCADE, auth
// tertinggal). Tanpa heal, register ulang dengan nomor yang sama gagal 500:
// admin.createUser menolak nomor duplikat padahal profilnya sudah tidak ada.
import { supabase } from "./supabase.js";

/** Cocokkan nomor auth user dgn E.164 (Supabase kadang simpan tanpa "+"). */
function phoneMatches(authPhone: string | undefined, phoneE164: string): boolean {
  if (!authPhone) return false;
  return authPhone.replace(/^\+/, "") === phoneE164.replace(/^\+/, "");
}

/**
 * Hapus auth user Supabase yang nomornya `phoneE164` dan TIDAK punya profil
 * di tabel users. Hanya aman dipanggil SETELAH profil users untuk nomor itu
 * dipastikan tidak ada (register/verify sudah mengeceknya sebelum memanggil).
 *
 * Return true bila ada auth yatim yang berhasil dihapus — pemanggil boleh
 * retry createUser. Return false bila tidak ada yatim / terjadi kegagalan
 * (biarkan error asli yang naik ke caller).
 */
export async function deleteOrphanAuthUserByPhone(
  phoneE164: string,
): Promise<boolean> {
  // listUsers tidak mendukung filter phone — paging & cocokkan manual.
  // Jumlah user autentikasi aplikasi masih kecil; guard halaman menjaga
  // aman bila suatu saat sudah ribuan.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) {
      console.error("[auth-heal] listUsers gagal:", error.message);
      return false;
    }
    const users = data?.users ?? [];
    for (const u of users) {
      if (!phoneMatches(u.phone, phoneE164)) continue;

      // Proteksi ganda: jangan pernah hapus bila profil ternyata ada
      // (berarti user sah, bukan yatim — mis. race dengan registrasi lain).
      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("phone", phoneE164)
        .maybeSingle();
      if (profile) {
        console.warn(
          `[auth-heal] skip: profil users untuk ${phoneE164} ada — bukan yatim.`,
        );
        return false;
      }

      const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
      if (delErr) {
        console.error("[auth-heal] deleteUser gagal:", delErr.message);
        return false;
      }
      console.log(
        `[auth-heal] auth yatim dihapus: phone=${phoneE164} id=${u.id}`,
      );
      return true;
    }
    if (users.length < 1000) return false; // halaman terakhir
  }
  return false;
}
