// Errores PostgREST/Supabase → pesan ramah pengguna.
// Multiplex error.code (bukan pesan mentah berbahasa Inggris / detail internal)
// agar client tidak menerima bocoran struktur DB.

import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

type DbErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

// Beberapa kode PostgREST yang umum + pesan default per kategori.
const CODE_TO_ERROR: Record<string, { status: number; message: string }> = {
  "23505": { status: 409, message: "Data tersebut sudah ada." },
  "23503": { status: 400, message: "Data sedang dipakai data lain." },
  "23514": { status: 400, message: "Data tidak memenuhi aturan validasi." },
  "23502": { status: 400, message: "Masih ada kolom wajib yang kosong." },
  "22001": { status: 400, message: "Nilai terlalu panjang." },
  "22P02": { status: 400, message: "Identitas (ID) tidak valid." },
  "42501": { status: 403, message: "Anda tidak memiliki izin untuk aksi ini." },
  "40001": { status: 409, message: "Terjadi konflik data. Coba lagi." },
  P0001: { status: 400, message: "Operasi ditolak oleh sistem." },
};

const DEFAULT_500 = "Terjadi kesalahan pada server. Coba lagi beberapa saat.";

/**
 * Ubah error PostgREST (atau objek { code, message }) menjadi respons JSON
 * generik dengan status HTTP yang sesuai. Fallback: 500 generic (jangan
 * pernah membocorkan pesan/teknikal mentah ke client).
 */
export function dbErrorResponse(
  c: Context,
  err: unknown,
  fallback: string = DEFAULT_500,
) {
  const e = (err ?? null) as DbErrorLike | null;
  const mapped = e?.code ? CODE_TO_ERROR[e.code] : undefined;
  const status: ContentfulStatusCode = (mapped?.status ?? 500) as ContentfulStatusCode;
  const message = mapped?.message ?? fallback;

  if (status >= 500) {
    // Log detail lengkap di server untuk debugging, jangan ke client.
    console.error("[dbError] code:", e?.code, "message:", e?.message);
  }

  return c.json({ error: message }, status);
}

/**
 * Ekstrak kode error dari error yang mungkin berbentuk objek Supabase.
 * Berguna bila error tidak selalu punya .code.
 */
export function getErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as Record<string, unknown>;
  return typeof e.code === "string" ? e.code : undefined;
}
