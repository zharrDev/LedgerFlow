import { AxiosError } from "axios";

// Util terpusat untuk mengubah error (axios/network/apa pun) menjadi pesan
// yang RAMAH untuk user. Dipakai di interceptor axios (auto-toast) dan
// hook-hook yang menampilkan error ke UI.
//
// Aturan:
//   - 5xx            → pesan generik (pesan teknis backend HANYA untuk
//                      developer, jangan ditampilkan mentah ke user)
//   - 400–499        → pesan `data.error` backend apa adanya (memang
//                      ditujukan untuk user, umumnya Bahasa Indonesia)
//   - tanpa response → masalah koneksi/network/timeout
//   - fallback       → pesan generik terakhir

// Pesan ramah untuk error server (status >= 500).
export const SERVER_ERROR_MESSAGE =
  "Terjadi gangguan pada server. Silakan coba lagi beberapa saat lagi.";

// Pesan untuk error network (tidak ada response sama sekali).
export const NETWORK_ERROR_MESSAGE =
  "Tidak dapat terhubung ke server. Periksa koneksi internet kamu.";

// Pesan fallback untuk kasus yang tidak terdeteksi.
export const UNEXPECTED_ERROR_MESSAGE = "Terjadi kesalahan yang tidak terduga.";

/** Ambil pesan error yang aman untuk ditampilkan ke user. */
export function getErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const status = err.response?.status;

    // Server error — jangan bocorkan pesan teknis backend.
    if (status !== undefined && status >= 500) {
      return SERVER_ERROR_MESSAGE;
    }

    // 429 = rate limit — pesan spesifik (sisa waktu dibaca terpisah di
    // interceptor via header Retry-After).
    if (status === 429) {
      const data = err.response?.data as { error?: unknown } | undefined;
      if (typeof data?.error === "string" && data.error.trim()) return data.error;
      return "Terlalu banyak permintaan. Mohon tunggu sebentar sebelum mencoba lagi.";
    }

    // 401 = sesi berakhir / belum login.
    if (status === 401) {
      return "Sesi Anda telah berakhir. Silakan masuk kembali.";
    }

    // 403 = akses ditolak.
    if (status === 403) {
      return "Anda tidak memiliki akses untuk tindakan ini.";
    }

    // 404 = data/halaman tidak ditemukan.
    if (status === 404) {
      return "Data atau halaman yang diminta tidak ditemukan.";
    }

    // Error 4xx lain — backend mengirim pesan human-readable (pola konsisten
    // di seluruh route: `c.json({ error: "..." })`).
    if (status !== undefined && status >= 400) {
      const data = err.response?.data as { error?: unknown } | undefined;
      if (typeof data?.error === "string" && data.error.trim()) {
        return data.error;
      }
      return "Permintaan gagal. Coba lagi.";
    }

    // Tidak ada response: network error / timeout.
    if (
      err.code === "ERR_NETWORK" ||
      err.code === "ECONNABORTED" ||
      !err.response
    ) {
      return NETWORK_ERROR_MESSAGE;
    }
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }

  return UNEXPECTED_ERROR_MESSAGE;
}

/** Judul toast ringkas berdasarkan jenis error. */
export function errorToastTitle(err: unknown): string {
  if (err instanceof AxiosError) {
    if (!err.response) return "Koneksi Terputus";
    const status = err.response.status;
    // 429 = kena rate limit, bukan kesalahan sistem.
    if (status === 429) return "Terlalu Sering";
    if (status === 401) return "Sesi Berakhir";
    if (status === 403) return "Akses Ditolak";
    if (status === 404) return "Tidak Ditemukan";
    if (status >= 500) return "Server Bermasalah";
  }
  return "Gagal";
}

/** Sisa waktu tunggu (detik) dari header Retry-After pada error 429,
 *  atau null bila tidak ada / tidak bisa dibaca. */
export function rateLimitRetryAfterSec(err: unknown): number | null {
  if (!(err instanceof AxiosError)) return null;
  if (err.response?.status !== 429) return null;
  const header = err.response?.headers?.["retry-after"];
  if (header === undefined) return null;
  const sec = Number(header);
  if (Number.isFinite(sec) && sec > 0) return Math.ceil(sec);
  return null;
}
