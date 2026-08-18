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
  const res = await api.post("/api/admin-gate/verify", { password }, { skipErrorToast: true });
  const token: string = res.data.token;
  setAdminGateToken(token);
  return token;
}

// Ambil audit log percobaan (dashboard admin). Hanya berhasil dengan token
// admin-gate — token user biasa ditolak backend (401).
// Filter opsional: status (success|failed|blocked) & pencarian IP.
export async function fetchAdminGateLogs(params?: {
  status?: string;
  ip?: string;
}): Promise<AdminGateLog[]> {
  const token = getAdminGateToken();
  if (!token) throw new Error("Belum terautentikasi sebagai admin");
  const res = await api.get("/api/admin-gate/logs", {
    headers: { Authorization: `Bearer ${token}` }, skipErrorToast: true,
    params: {
      status: params?.status || undefined,
      ip: params?.ip || undefined,
    },
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
  status?: "active" | "suspended";
  created_at: string;
  companies?: { name: string } | null;
};

export type AdminGateCompany = {
  id: string;
  name: string;
  currency: string;
  status?: "active" | "suspended";
  created_at: string;
};

export async function fetchAdminGateUsers(): Promise<AdminGateUser[]> {
  const res = await api.get("/api/admin-gate/users", {
    headers: authHeaders(), skipErrorToast: true,
  });
  return Array.isArray(res.data) ? (res.data as AdminGateUser[]) : [];
}

export async function fetchAdminGateCompanies(): Promise<AdminGateCompany[]> {
  const res = await api.get("/api/admin-gate/companies", {
    headers: authHeaders(), skipErrorToast: true,
  });
  return Array.isArray(res.data) ? (res.data as AdminGateCompany[]) : [];
}

// ── Detail satu company (modal "Lihat Detail" di tab Company) ──────────

export type AdminGateCompanyDetail = {
  id: string;
  name: string;
  code: string | null;
  currency: string;
  status?: "active" | "suspended";
  created_at: string;
  total_users: number;
  total_members: number;
  total_accounts: number;
  total_journals: number;
  subscription: {
    billing_cycle: string;
    status: string;
    current_period_end: string | null;
    plan_name: string | null;
  } | null;
};

export async function fetchAdminGateCompanyDetail(
  id: string,
): Promise<AdminGateCompanyDetail> {
  const res = await api.get(`/api/admin-gate/companies/${id}/detail`, {
    headers: authHeaders(), skipErrorToast: true,
  });
  const raw = res.data as any;
  // Join `plans` dari PostgREST bisa berbentuk objek tunggal (to-one) —
  // normalisasi ke nama plan agar konsisten di UI.
  const planRaw = raw?.subscription?.plans;
  const plan = Array.isArray(planRaw) ? planRaw[0] : planRaw;
  return {
    ...raw,
    subscription: raw?.subscription
      ? {
          billing_cycle: raw.subscription.billing_cycle,
          status: raw.subscription.status,
          current_period_end: raw.subscription.current_period_end,
          plan_name: plan?.display_name || plan?.name || null,
        }
      : null,
  } as AdminGateCompanyDetail;
}

// ── Ringkasan global untuk tab Overview ────────────────────────────────

export type AdminGateOverview = {
  total_users: number;
  total_companies: number;
  users_growth_30d: number;
  churn_30d: number;
  mrr: number;
  plan_distribution: { name: string; users: number }[];
};

export async function fetchAdminGateOverview(): Promise<AdminGateOverview> {
  const res = await api.get("/api/admin-gate/overview", {
    headers: authHeaders(), skipErrorToast: true,
  });
  return res.data as AdminGateOverview;
}

// ── Billing: subscription & pembayaran global (tab Billing) ────────────

export type AdminGateSubscription = {
  id: string;
  status: string;
  billing_cycle: "monthly" | "yearly";
  current_period_end: string | null;
  canceled_at: string | null;
  users?: { name: string | null; email: string | null; phone: string | null } | null;
  plans?: { name: string | null; display_name: string | null } | null;
};

export type AdminGatePayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  users?: { name: string | null; email: string | null; phone: string | null } | null;
};

export async function fetchAdminGateSubscriptions(): Promise<AdminGateSubscription[]> {
  const res = await api.get("/api/admin-gate/subscriptions", {
    headers: authHeaders(), skipErrorToast: true,
  });
  return Array.isArray(res.data) ? (res.data as AdminGateSubscription[]) : [];
}

export async function fetchAdminGatePayments(): Promise<AdminGatePayment[]> {
  const res = await api.get("/api/admin-gate/payments", {
    headers: authHeaders(), skipErrorToast: true,
  });
  return Array.isArray(res.data) ? (res.data as AdminGatePayment[]) : [];
}

// ── Moderasi (satu-satunya aksi mutasi admin — hapus user/company) ─────

export async function deleteAdminGateUser(id: string): Promise<void> {
  await api.delete(`/api/admin-gate/users/${id}`, {
    headers: authHeaders(),
    skipErrorToast: true,
  });
}

export async function deleteAdminGateCompany(id: string): Promise<void> {
  await api.delete(`/api/admin-gate/companies/${id}`, {
    headers: authHeaders(),
    skipErrorToast: true,
  });
}

// ── Moderasi: suspend / unsuspend (soft delete) ───────────────────────
// Dinonaktifkan sementara tanpa menghapus data. Backend otomatis menolak
// login & semua akses user (atau seluruh anggota company) yang di-suspend.

export async function setAdminGateUserStatus(
  id: string,
  suspended: boolean,
): Promise<void> {
  await api.patch(
    `/api/admin-gate/users/${id}/status`,
    { suspended },
    { headers: authHeaders(), skipErrorToast: true },
  );
}

export async function setAdminGateCompanyStatus(
  id: string,
  suspended: boolean,
): Promise<void> {
  await api.patch(
    `/api/admin-gate/companies/${id}/status`,
    { suspended },
    { headers: authHeaders(), skipErrorToast: true },
  );
}
