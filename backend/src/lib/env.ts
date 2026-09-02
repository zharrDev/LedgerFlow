import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

let loaded = false;

// Muat .env backend secara deterministik (path absolut dari lokasi file ini),
// dengan override agar menang atas env ambient terminal (mis. key basi).
export function loadEnv() {
  if (loaded) return;
  loaded = true;
  const backendRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const result = dotenv.config({
    path: path.join(backendRoot, ".env"),
    override: true,
  });
  if (result.error) {
    console.error("loadEnv: gagal baca .env:", result.error.message);
  }

  // AI CFO (OpenRouter) — opsional; endpoint /api/ai/chat menolak jika key kosong.
  // OPENROUTER_MODEL: ganti manual bila model :free di-deprecate OpenRouter.
  // Default kode: nvidia/nemotron-3-super-120b-a12b:free (lihat DEFAULT_OPENROUTER_MODEL di provider.ts).
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    console.warn(
      "[env] OPENROUTER_API_KEY belum diset — fitur AI CFO tidak akan berfungsi.",
    );
  }
  if (!process.env.OPENROUTER_MODEL?.trim()) {
    console.info(
      "[env] OPENROUTER_MODEL kosong — memakai default nvidia/nemotron-3-super-120b-a12b:free.",
    );
  }
  if (!process.env.FONNTE_TOKEN?.trim()) {
    console.warn(
      "[env] FONNTE_TOKEN belum diset — fitur auth WhatsApp OTP tidak berfungsi.",
    );
  }

  // DEMO MODE — HANYA untuk lingkungan demo/staging (lihat konstanta di bawah).
  // Peringatan keras bila diaktifkan, supaya tidak terlewat di production.
  if (process.env.DEMO_MODE_ENABLED?.trim().toLowerCase() === "true") {
    console.warn(
      "[env] DEMO_MODE_ENABLED=true — bypass OTP AKTIF untuk nomor demo. HANYA untuk lingkungan demo/staging, JANGAN dipakai di production!",
    );
  }
}

// ESM mengeksekusi semua import sebelum tubuh index.ts berjalan, jadi loadEnv()
// dipanggil eksplisit di sini agar konstanta di bawah selalu membaca .env
// (idempotent — aman walau sudah dipanggil di index.ts).
loadEnv();

// DEMO MODE — kontrol login cepat untuk akun demo (lihat lib/demoConfig.ts).
// HANYA untuk lingkungan demo/staging:
//   DEMO_MODE_ENABLED (default "false") — true = kode DEMO_OTP_CODE diterima
//     untuk nomor demo tanpa kirim WhatsApp asli. JANGAN aktifkan di
//     production dengan data user asli.
//   DEMO_OTP_CODE (default "123456") — kode yang diterima sebagai OTP valid.
// Semua kode lain wajib memakai konstanta ini (bukan baca process.env).
export const DEMO_MODE_ENABLED =
  (process.env.DEMO_MODE_ENABLED ?? "false").trim().toLowerCase() === "true";
export const DEMO_OTP_CODE = (process.env.DEMO_OTP_CODE ?? "123456").trim();
