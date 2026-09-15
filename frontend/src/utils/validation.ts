// Util validasi form realtime (per-field) untuk halaman auth & profile

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string {
  if (!value.trim()) return "Email wajib diisi.";
  if (!EMAIL_RE.test(value.trim())) return "Format email tidak valid.";
  return "";
}

export function validatePassword(value: string): string {
  if (!value) return "Password wajib diisi.";
  if (value.length < 8) return "Password minimal 8 karakter.";
  return "";
}

export function validateName(value: string): string {
  if (!value.trim()) return "Nama wajib diisi.";
  if (value.trim().length < 3) return "Nama minimal 3 karakter.";
  return "";
}

export function validateConfirmPassword(value: string, password: string): string {
  if (!value) return "Konfirmasi password wajib diisi.";
  if (value !== password) return "Konfirmasi password tidak cocok.";
  return "";
}

