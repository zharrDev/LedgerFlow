// Util validasi form realtime (per-field) untuk halaman profile

export function validateName(value: string): string {
  if (!value.trim()) return "Nama wajib diisi.";
  if (value.trim().length < 3) return "Nama minimal 3 karakter.";
  return "";
}

