// Sanitizer input untuk filter PostgREST (ilike/or) & kolom sort.
// PostgREST tidak meng-escape wildcard `%_` dan pemisah `,()\"` di dalam
// filter `.or()` — input user mentah bisa merusak filter / probe error.
// Helper ini dipakai semua route yang punya ?search= dan ?sort=.

/** Bersihkan string search agar aman disisipkan ke pola `ilike.%...%`. */
export function sanitizeSearch(raw: unknown, maxLen = 100): string {
  return String(raw ?? "")
    .replace(/[,()\"\\]/g, "")
    .replace(/[%_]/g, (m) => `\\${m}`)
    .trim()
    .slice(0, maxLen);
}

/**
 * Pilih kolom sort dari allowlist. Mendukung prefix `-` untuk descending.
 * Mengembalikan { field, desc }; field selalu anggota allowlist.
 */
export function pickSort(
  raw: unknown,
  allowed: readonly string[],
  fallback: string,
): { field: string; desc: boolean } {
  const v = String(raw ?? "").trim();
  const desc = v.startsWith("-");
  const field = desc ? v.slice(1) : v || fallback;
  if ((allowed as readonly string[]).includes(field)) return { field, desc };
  return { field: fallback, desc: false };
}
