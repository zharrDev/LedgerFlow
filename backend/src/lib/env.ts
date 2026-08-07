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
}
