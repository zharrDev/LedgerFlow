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
