const TOKEN_KEY = "token";
const USER_KEY = "user";
// Token gerbang admin — TERPISAH dari token user biasa (AuthContext).
const ADMIN_GATE_TOKEN_KEY = "admin_gate_token";

export function getSessionToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getSessionUser<T = Record<string, unknown>>(): T | null {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setSessionUser(user: unknown): void {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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