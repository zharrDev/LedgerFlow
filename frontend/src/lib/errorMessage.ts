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

    // Error 4xx — backend mengirim pesan human-readable (pola konsisten
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
    if (err.response.status >= 500) return "Server Bermasalah";
  }
  return "Gagal";
}
