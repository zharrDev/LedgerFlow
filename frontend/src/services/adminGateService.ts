import { api } from "../lib/api";
import {
  getAdminGateToken,
  setAdminGateToken,
  clearAdminGateToken,
} from "../lib/session";

export type AdminGateLog = {
  id: string;
  ip: string;
  status: "success" | "failed" | "blocked";
  created_at: string;
};

// Verifikasi password gerbang admin. Sukses → simpan token admin-gate
// (terpisah dari token user biasa) dan kembalikan token.
export async function verifyAdminGatePassword(
  password: string,
): Promise<string> {
  const res = await api.post("/api/admin-gate/verify", { password });
  const token: string = res.data.token;
  setAdminGateToken(token);
  return token;
}

// Ambil audit log percobaan (dashboard admin). Hanya berhasil dengan token
// admin-gate — token user biasa ditolak backend (401).
export async function fetchAdminGateLogs(): Promise<AdminGateLog[]> {
  const token = getAdminGateToken();
  if (!token) throw new Error("Belum terautentikasi sebagai admin");
  const res = await api.get("/api/admin-gate/logs", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(res.data) ? (res.data as AdminGateLog[]) : [];
}

export function logoutAdminGate(): void {
  clearAdminGateToken();
}

// ── Pandangan read-only global — hanya dengan token admin-gate ──
// Admin (pemilik aplikasi) hanya boleh MELIHAT, tidak mengubah/menginput.

function authHeaders(): Record<string, string> {
  const token = getAdminGateToken();
  if (!token) throw new Error("Belum terautentikasi sebagai admin");
  return { Authorization: `Bearer ${token}` };
}

export type AdminGateUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: "admin" | "akuntan" | "owner";
  company_id: string;
  created_at: string;
  companies?: { name: string } | null;
};

export type AdminGateCompany = {
  id: string;
  name: string;
  currency: string;
  created_at: string;
};

export async function fetchAdminGateUsers(): Promise<AdminGateUser[]> {
  const res = await api.get("/api/admin-gate/users", {
    headers: authHeaders(),
  });
  return Array.isArray(res.data) ? (res.data as AdminGateUser[]) : [];
}

export async function fetchAdminGateCompanies(): Promise<AdminGateCompany[]> {
  const res = await api.get("/api/admin-gate/companies", {
    headers: authHeaders(),
  });
  return Array.isArray(res.data) ? (res.data as AdminGateCompany[]) : [];
}

// ── Moderasi (satu-satunya aksi mutasi admin — hapus user/company) ─────

export async function deleteAdminGateUser(id: string): Promise<void> {
  await api.delete(`/api/admin-gate/users/${id}`, { headers: authHeaders() });
}

export async function deleteAdminGateCompany(id: string): Promise<void> {
  await api.delete(`/api/admin-gate/companies/${id}`, { headers: authHeaders() });
}
