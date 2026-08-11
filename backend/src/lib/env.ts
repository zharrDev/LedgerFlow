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
  // Default kode: nvidia/nemotron-3-nano-30b-a3b:free (lihat DEFAULT_OPENROUTER_MODEL di provider.ts).
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    console.warn(
      "[env] OPENROUTER_API_KEY belum diset — fitur AI CFO tidak akan berfungsi.",
    );
  }
  if (!process.env.OPENROUTER_MODEL?.trim()) {
    console.info(
      "[env] OPENROUTER_MODEL kosong — memakai default nvidia/nemotron-3-nano-30b-a3b:free.",
    );
  }
}
