const TOKEN_KEY = "token";
const USER_KEY = "user";
// Token gerbang admin — TERPISAH dari token user biasa (AuthContext).
const ADMIN_GATE_TOKEN_KEY = "admin_gate_token";

// Ketentuan S1: token wajib di Local Storage agar session persist antar tab
// dan saat browser di-refresh. Kami tulis ke KEDUANYA (local + session) dan
// membaca local dulu lalu fallback ke session (kompatibel sesi lama).
export function getSessionToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getSessionUser<T = Record<string, unknown>>(): T | null {
  const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setSessionUser(user: unknown): void {
  const raw = JSON.stringify(user);
  localStorage.setItem(USER_KEY, raw);
  sessionStorage.setItem(USER_KEY, raw);
}

export function clearSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  // Cache langganan ikut dibuang — user berikutnya tidak boleh melihat
  // plan/cache milik user sebelumnya.
  sessionStorage.removeItem("subscription_cache");
  localStorage.removeItem("subscription_cache");
}

// ── Admin Gate (dashboard admin khusus) ───────────────────────────────
export function getAdminGateToken(): string | null {
  return sessionStorage.getItem(ADMIN_GATE_TOKEN_KEY);
}

export function setAdminGateToken(token: string): void {
  sessionStorage.setItem(ADMIN_GATE_TOKEN_KEY, token);
}

export function clearAdminGateToken(): void {
  sessionStorage.removeItem(ADMIN_GATE_TOKEN_KEY);
}
