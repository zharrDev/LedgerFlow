// Util validasi form realtime (per-field). Tiap fungsi return "" bila valid,
// atau pesan error ID bila tidak valid — cocok untuk onChange/onBlur.

export function validateName(value: string): string {
  if (!value.trim()) return "Nama wajib diisi.";
  if (value.trim().length < 3) return "Nama minimal 3 karakter.";
  if (value.trim().length > 100) return "Nama maksimal 100 karakter.";
  return "";
}

export function validateEmail(value: string): string {
  if (!value.trim()) return "Email wajib diisi.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
    return "Format email tidak valid.";
  if (value.trim().length > 255) return "Email maksimal 255 karakter.";
  return "";
}

export function validatePhone(value: string): string {
  if (!value.trim()) return "Nomor HP wajib diisi.";
  if (!/^(\+62|62|0)8\d{8,11}$/.test(value.replace(/[\s\-().]/g, "")))
    return "Nomor HP tidak valid (cth. 081234567890).";
  return "";
}

export function validatePassword(value: string): string {
  if (!value) return "Password wajib diisi.";
  if (value.length < 6) return "Password minimal 6 karakter.";
  if (value.length > 128) return "Password maksimal 128 karakter.";
  return "";
}

export function validatePasswordConfirm(password: string, confirm: string): string {
  if (!confirm) return "Konfirmasi password wajib diisi.";
  if (password !== confirm) return "Konfirmasi password tidak cocok.";
  return "";
}

export function validateRequired(value: string, label = "Field"): string {
  if (!value.trim()) return `${label} wajib diisi.`;
  return "";
}

export function validateMinMax(
  value: string,
  min: number,
  max: number,
  label = "Field",
): string {
  const len = value.trim().length;
  if (len < min) return `${label} minimal ${min} karakter.`;
  if (len > max) return `${label} maksimal ${max} karakter.`;
  return "";
}
