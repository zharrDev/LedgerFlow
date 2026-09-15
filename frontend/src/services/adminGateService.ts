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
  role: "akuntan" | "owner";
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

// ── Monitoring akses fitur premium (tab Monitoring) ───────────────────
// Read-only; hanya dengan token admin-gate. Response dinormalisasi agar UI
// tidak crash bila backend mengembalikan bentuk tak terduga.

export type MonitoringRange = "24h" | "7d" | "30d";

export type MonitoringSummary = {
  range: string;
  since: string;
  totals: {
    access: number;
    denied: number;
    rate_limit_events: number;
    blocked_ips: number;
  };
  top_features: { feature: string; count: number }[];
  top_users: { user_id: string; email: string | null; count: number }[];
  peak_hours: { hour: number; count: number }[];
};

export type MonitoringFeatureLog = {
  id: string;
  user_id: string;
  user_email: string | null;
  feature: string;
  plan_at_access: string;
  granted: boolean;
  ip_address: string;
  request_path: string;
  method: string;
  created_at: string;
};

export type MonitoringRateLimitLog = {
  id: string;
  user_id: string;
  reason: string;
  ip_address: string;
  request_path: string;
  method: string;
  created_at: string;
  reset_at: string | null;
};

const EMPTY_MONITORING_SUMMARY: MonitoringSummary = {
  range: "24h",
  since: "",
  totals: { access: 0, denied: 0, rate_limit_events: 0, blocked_ips: 0 },
  top_features: [],
  top_users: [],
  peak_hours: [],
};

export async function fetchMonitoringSummary(range: MonitoringRange = "24h"): Promise<MonitoringSummary> {
  const res = await api.get("/api/admin-gate/monitoring/summary", {
    headers: authHeaders(), skipErrorToast: true,
    params: { range },
  });
  const d = res.data as Partial<MonitoringSummary> | null;
  if (!d || typeof d !== "object") return EMPTY_MONITORING_SUMMARY;
  return {
    range: typeof d.range === "string" ? d.range : "24h",
    since: typeof d.since === "string" ? d.since : "",
    totals: {
      access: Number(d.totals?.access) || 0,
      denied: Number(d.totals?.denied) || 0,
      rate_limit_events: Number(d.totals?.rate_limit_events) || 0,
      blocked_ips: Number(d.totals?.blocked_ips) || 0,
    },
    top_features: Array.isArray(d.top_features) ? d.top_features : [],
    top_users: Array.isArray(d.top_users) ? d.top_users : [],
    peak_hours: Array.isArray(d.peak_hours) ? d.peak_hours : [],
  };
}

export async function fetchMonitoringFeatureLogs(params?: {
  feature?: string;
  granted?: boolean;
  search?: string;
  limit?: number;
  page?: number;
}): Promise<{ data: MonitoringFeatureLog[]; page: number; limit: number }> {
  const res = await api.get("/api/admin-gate/monitoring/feature-logs", {
    headers: authHeaders(), skipErrorToast: true,
    params: {
      feature: params?.feature || undefined,
      granted: params?.granted === undefined ? undefined : String(params.granted),
      search: params?.search || undefined,
      limit: params?.limit,
      page: params?.page,
    },
  });
  const d = res.data as { data?: unknown; page?: unknown; limit?: unknown } | null;
  return {
    data: Array.isArray(d?.data) ? (d.data as MonitoringFeatureLog[]) : [],
    page: Number(d?.page) || 1,
    limit: Number(d?.limit) || 50,
  };
}

export async function fetchMonitoringRateLimitLogs(params?: {
  search?: string;
  limit?: number;
  page?: number;
}): Promise<{ data: MonitoringRateLimitLog[]; page: number; limit: number }> {
  const res = await api.get("/api/admin-gate/monitoring/rate-limit-logs", {
    headers: authHeaders(), skipErrorToast: true,
    params: {
      search: params?.search || undefined,
      limit: params?.limit,
      page: params?.page,
    },
  });
  const d = res.data as { data?: unknown; page?: unknown; limit?: unknown } | null;
  return {
    data: Array.isArray(d?.data) ? (d.data as MonitoringRateLimitLog[]) : [],
    page: Number(d?.page) || 1,
    limit: Number(d?.limit) || 50,
  };
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

// ── Plan Management (CRUD) ───────────────────────────────────────────

export type AdminGatePlan = {
  id: string;
  name: string;
  display_name: string | null;
  price_monthly: number;
  price_yearly: number;
  max_companies: number;
  max_journals: number;
  features: Record<string, any> | null;
  is_active: boolean;
  created_at?: string;
};

export async function fetchAdminGatePlans(): Promise<AdminGatePlan[]> {
  const res = await api.get("/api/admin-gate/plans", {
    headers: authHeaders(), skipErrorToast: true,
  });
  return Array.isArray(res.data) ? (res.data as AdminGatePlan[]) : [];
}

export async function createAdminGatePlan(plan: {
  name: string;
  display_name?: string;
  price_monthly?: number;
  price_yearly?: number;
  max_companies?: number;
  max_journals?: number;
  features?: Record<string, any>;
}): Promise<AdminGatePlan> {
  const res = await api.post("/api/admin-gate/plans", plan, {
    headers: authHeaders(), skipErrorToast: true,
  });
  return res.data as AdminGatePlan;
}

export async function updateAdminGatePlan(
  id: string,
  plan: Partial<AdminGatePlan>,
): Promise<AdminGatePlan> {
  const res = await api.put(`/api/admin-gate/plans/${id}`, plan, {
    headers: authHeaders(), skipErrorToast: true,
  });
  return res.data as AdminGatePlan;
}

export async function deactivateAdminGatePlan(id: string): Promise<void> {
  await api.delete(`/api/admin-gate/plans/${id}`, {
    headers: authHeaders(), skipErrorToast: true,
  });
}

// ── System Health Monitor ─────────────────────────────────────────────

export type HealthStatus = {
  ok: boolean;
  message: string;
  latency_ms?: number;
  details?: any;
};

async function safeHealthCheck(path: string): Promise<HealthStatus> {
  try {
    const res = await api.get(path, {
      headers: authHeaders(), skipErrorToast: true,
    });
    return res.data as HealthStatus;
  } catch (err: any) {
    // axios melempar saat response bukan JSON (mis. 404 HTML "Cannot GET ...")
    return { ok: false, message: err?.response?.data?.message || err?.message || "Endpoint belum tersedia di server" };
  }
}

export function checkSmtpHealth(): Promise<HealthStatus> {
  return safeHealthCheck("/api/admin-gate/health/smtp");
}

export function checkWhatsAppHealth(): Promise<HealthStatus> {
  return safeHealthCheck("/api/admin-gate/health/whatsapp");
}

export function checkDatabaseHealth(): Promise<HealthStatus> {
  return safeHealthCheck("/api/admin-gate/health/database");
}
