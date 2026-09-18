// Util validasi form realtime (per-field). Tiap fungsi return "" bila valid,
// atau pesan error ID bila tidak valid — cocok untuk onChange/onBlur.

export function validateName(value: string): string {
  if (!value.trim()) return "Nama wajib diisi.";
  if (value.trim().length < 3) return "Nama minimal 3 karakter.";
  if (value.trim().length > 100) return "Nama maksimal 100 karakter.";
  return "";
}

