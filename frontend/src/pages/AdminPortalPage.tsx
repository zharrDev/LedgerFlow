import { useEffect, useState, useCallback } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  LogOut,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Ban,
  Activity,
  Users,
  Building2,
  Trash2,
  ScrollText,
  AlertTriangle,
  X,
  LayoutDashboard,
  TrendingUp,
  UserMinus,
  Wallet,
  CreditCard,
  RotateCcw,
  Search,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  fetchAdminGateLogs,
  fetchAdminGateUsers,
  fetchAdminGateCompanies,
  fetchAdminGateOverview,
  fetchAdminGateSubscriptions,
  fetchAdminGatePayments,
  deleteAdminGateUser,
  deleteAdminGateCompany,
  setAdminGateUserStatus,
  setAdminGateCompanyStatus,
  logoutAdminGate,
  type AdminGateLog,
  type AdminGateUser,
  type AdminGateCompany,
  type AdminGateOverview,
  type AdminGateSubscription,
  type AdminGatePayment,
} from "../services/adminGateService";
import { getAdminGateToken } from "../lib/session";
import { useToast } from "../context/ToastContext";
import { usePagination } from "../hooks/usePagination";
import { TablePagination } from "../components/TablePagination";
import logo from "../assets/ledgerflow.png";

type Tab = "overview" | "billing" | "log" | "users" | "companies";

type ConfirmState = {
  type:
    | "deleteUser"
    | "deleteCompany"
    | "suspendUser"
    | "suspendCompany"
    | "unsuspendUser"
    | "unsuspendCompany";
  item: AdminGateUser | AdminGateCompany;
} | null;

const roleBadge: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  akuntan: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

const PAGE_SIZE = 5;

// Dashboard admin khusus — hanya bisa diakses dengan token admin-gate
// (token user biasa ditolak oleh backend). Terpisah total dari aplikasi
// utama user biasa. Menyediakan: audit log gerbang, daftar user global
// (read-only + moderasi), dan daftar company.
export default function AdminPortalPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("overview");

  const [logs, setLogs] = useState<AdminGateLog[]>([]);
  const [users, setUsers] = useState<AdminGateUser[]>([]);
  const [companies, setCompanies] = useState<AdminGateCompany[]>([]);
  const [overview, setOverview] = useState<AdminGateOverview | null>(null);
  const [subscriptions, setSubscriptions] = useState<AdminGateSubscription[]>([]);
  const [payments, setPayments] = useState<AdminGatePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [confirming, setConfirming] = useState(false);

  const hasToken = !!getAdminGateToken();

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  const load = useCallback(async () => {
    if (!hasToken) return;
    setRefreshing(true);
    setError("");
    try {
      const [logData, userData, companyData, overviewData, subData, payData] =
        await Promise.all([
          fetchAdminGateLogs(),
          fetchAdminGateUsers(),
          fetchAdminGateCompanies(),
          fetchAdminGateOverview(),
          fetchAdminGateSubscriptions(),
          fetchAdminGatePayments(),
        ]);
      setLogs(logData);
      setUsers(userData);
      setCompanies(companyData);
      setOverview(overviewData);
      setSubscriptions(subData);
      setPayments(payData);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        // Token admin-gate expired/ditolak → kembali ke gerbang.
        logoutAdminGate();
        navigate("/portal-akses", { replace: true });
        return;
      }
      setError("Gagal memuat data dashboard.");
      toast({
        variant: "error",
        title: "Gagal memuat data",
        message: "Tidak bisa mengambil data dashboard. Coba muat ulang.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasToken, navigate, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = () => {
    logoutAdminGate();
    navigate("/login", { replace: true });
  };

  // ── Moderasi: buka modal konfirmasi dulu, baru eksekusi ──
  const requestDeleteUser = (u: AdminGateUser) =>
    setConfirm({ type: "deleteUser", item: u });
  const requestDeleteCompany = (c: AdminGateCompany) =>
    setConfirm({ type: "deleteCompany", item: c });
  const requestSuspendUser = (u: AdminGateUser) =>
    setConfirm({ type: "suspendUser", item: u });
  const requestUnsuspendUser = (u: AdminGateUser) =>
    setConfirm({ type: "unsuspendUser", item: u });
  const requestSuspendCompany = (c: AdminGateCompany) =>
    setConfirm({ type: "suspendCompany", item: c });
  const requestUnsuspendCompany = (c: AdminGateCompany) =>
    setConfirm({ type: "unsuspendCompany", item: c });

  const handleConfirmAction = async () => {
    if (!confirm) return;
    setConfirming(true);
    try {
      if (confirm.type === "deleteUser") {
        const u = confirm.item as AdminGateUser;
        await deleteAdminGateUser(u.id);
        setUsers((prev) => prev.filter((x) => x.id !== u.id));
        toast({
          variant: "success",
          title: "User dihapus",
          message: `${u.name} (${u.email || u.phone || "-"}) berhasil dihapus.`,
        });
      } else if (confirm.type === "deleteCompany") {
        const c = confirm.item as AdminGateCompany;
        await deleteAdminGateCompany(c.id);
        setCompanies((prev) => prev.filter((x) => x.id !== c.id));
        toast({
          variant: "success",
          title: "Company dihapus",
          message: `${c.name} beserta seluruh datanya berhasil dihapus.`,
        });
      } else if (
        confirm.type === "suspendUser" ||
        confirm.type === "unsuspendUser"
      ) {
        const u = confirm.item as AdminGateUser;
        const suspended = confirm.type === "suspendUser";
        await setAdminGateUserStatus(u.id, suspended);
        setUsers((prev) =>
          prev.map((x) =>
            x.id === u.id
              ? { ...x, status: suspended ? "suspended" : "active" }
              : x,
          ),
        );
        toast({
          variant: "success",
          title: suspended ? "User disuspend" : "User diaktifkan",
          message: suspended
            ? `${u.name} dinonaktifkan sementara.`
            : `${u.name} diaktifkan kembali.`,
        });
      } else {
        const c = confirm.item as AdminGateCompany;
        const suspended = confirm.type === "suspendCompany";
        await setAdminGateCompanyStatus(c.id, suspended);
        setCompanies((prev) =>
          prev.map((x) =>
            x.id === c.id
              ? { ...x, status: suspended ? "suspended" : "active" }
              : x,
          ),
        );
        toast({
          variant: "success",
          title: suspended ? "Company disuspend" : "Company diaktifkan",
          message: suspended
            ? `${c.name} dinonaktifkan sementara (semua anggota kehilangan akses).`
            : `${c.name} diaktifkan kembali.`,
        });
      }
      setConfirm(null);
    } catch (err: any) {
      toast({
        variant: "error",
        title: "Gagal",
        message: err?.response?.data?.error || "Terjadi kesalahan.",
      });
    } finally {
      setConfirming(false);
    }
  };

  if (!hasToken) {
    return <Navigate to="/portal-akses" replace />;
  }

  const stats = {
    total: logs.length,
    success: logs.filter((l) => l.status === "success").length,
    failed: logs.filter((l) => l.status === "failed").length,
    blocked: logs.filter((l) => l.status === "blocked").length,
  };

  const statusBadge = (status: AdminGateLog["status"]) => {
    const map = {
      success:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
      failed: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
      blocked:
        "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    } as const;
    const label = {
      success: "Berhasil",
      failed: "Gagal",
      blocked: "Diblokir",
    } as const;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status]}`}
      >
        {label[status]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-darkBg">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#111827]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="LedgerFlow" className="w-7 h-7" />
            <span className="font-semibold text-gray-900 dark:text-white text-sm">
              Admin Portal
            </span>
            <span className="text-[11px] font-medium text-primary-600 dark:text-primary-400 bg-primary-500/10 border border-primary-500/20 px-2 py-0.5 rounded-full">
              Khusus Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Muat Ulang
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <LogOut size={14} />
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Dashboard Admin
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pantau seluruh sistem + moderasi (hapus user/company bermasalah)
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 pb-0 overflow-x-auto">
          <TabButton
            active={tab === "overview"}
            onClick={() => setTab("overview")}
            icon={<LayoutDashboard size={14} />}
            label="Overview"
          />
          <TabButton
            active={tab === "billing"}
            onClick={() => setTab("billing")}
            icon={<CreditCard size={14} />}
            label="Billing"
            count={subscriptions.length}
          />
          <TabButton
            active={tab === "log"}
            onClick={() => setTab("log")}
            icon={<ScrollText size={14} />}
            label="Audit Log Gerbang"
            count={logs.length}
          />
          <TabButton
            active={tab === "users"}
            onClick={() => setTab("users")}
            icon={<Users size={14} />}
            label="User"
            count={users.length}
          />
          <TabButton
            active={tab === "companies"}
            onClick={() => setTab("companies")}
            icon={<Building2 size={14} />}
            label="Company"
            count={companies.length}
          />
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : tab === "overview" ? (
          <OverviewView overview={overview} error={error} />
        ) : tab === "billing" ? (
          <BillingView subscriptions={subscriptions} payments={payments} error={error} />
        ) : tab === "log" ? (
          <AuditLogView statusBadge={statusBadge} stats={stats} error={error} />
        ) : tab === "users" ? (
          <UsersView
            users={users}
            roleBadge={roleBadge}
            error={error}
            onDelete={requestDeleteUser}
            onSuspend={requestSuspendUser}
            onUnsuspend={requestUnsuspendUser}
          />
        ) : (
          <CompaniesView
            companies={companies}
            error={error}
            onDelete={requestDeleteCompany}
            onSuspend={requestSuspendCompany}
            onUnsuspend={requestUnsuspendCompany}
          />
        )}
      </main>

      {/* Modal konfirmasi aksi moderasi (hapus permanen / suspend / aktifkan) */}
      <ConfirmActionModal
        confirm={confirm}
        confirming={confirming}
        onCancel={() => !confirming && setConfirm(null)}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────
function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
        active
          ? "border-primary-500 text-primary-600 dark:text-primary-400"
          : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      }`}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
            active
              ? "bg-primary-500/10 text-primary-600 dark:text-primary-400"
              : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ── Overview view (ringkasan statistik global) ────────────────────────
function OverviewView({
  overview,
  error,
}: {
  overview: AdminGateOverview | null;
  error: string;
}) {
  if (!overview) {
    return <EmptyState error={error} text="Belum ada data ringkasan." />;
  }

  const totalActives = overview.plan_distribution.reduce(
    (s, p) => s + p.users,
    0,
  );
  const formatRp = (v: number) =>
    v.toLocaleString("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Users size={15} />}
          label="Total User"
          value={overview.total_users}
        />
        <StatCard
          icon={<Building2 size={15} />}
          label="Total Company"
          value={overview.total_companies}
        />
        <StatCard
          icon={<TrendingUp size={15} />}
          label="User Baru 30 Hari"
          value={overview.users_growth_30d}
          accent="emerald"
        />
        <StatCard
          icon={<UserMinus size={15} />}
          label="Churn 30 Hari"
          value={overview.churn_30d}
          accent="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MRR */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-1.5 mb-1 text-primary-500">
              <Wallet size={15} />
              <p className="text-[11px] font-medium uppercase tracking-wider opacity-80">
                MRR · Pendapatan Berulang Bulanan
              </p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
              {formatRp(overview.mrr)}
            </p>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Dari {totalActives} subscription aktif (tahunan dihitung per
              bulan)
            </p>
          </div>
        </Card>

        {/* Distribusi plan */}
        <PlanDistributionChart data={overview.plan_distribution} />
      </div>
    </div>
  );
}

// ── Chart distribusi user per plan (recharts, selaras tema gelap) ─────
const PLAN_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e"];

// Hook kecil untuk menyesuaikan warna chart saat mode gelap (gaya sama
// seperti CashFlowChart).
function useIsDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const check = () => setIsDark(el.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

function PlanDistributionChart({
  data,
}: {
  data: { name: string; users: number }[];
}) {
  const isDark = useIsDark();
  const textColor = isDark ? "#94a3b8" : "#64748b";

  return (
    <Card>
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Distribusi User per Plan
        </span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          Berdasarkan subscription aktif
        </span>
      </div>
      <div className="p-4">
        {data.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
            Belum ada subscription aktif.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                dataKey="users"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                strokeWidth={2}
                stroke={isDark ? "#111827" : "#ffffff"}
              >
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={PLAN_COLORS[i % PLAN_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any, name: any) => [
                  `${value} user`,
                  name as string,
                ]}
                contentStyle={{
                  background: isDark
                    ? "rgba(15,23,42,0.92)"
                    : "rgba(255,255,255,0.95)",
                  border: isDark
                    ? "1px solid rgba(99,102,241,0.25)"
                    : "1px solid rgba(99,102,241,0.15)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Legend
                iconType="circle"
                formatter={(value: any) => (
                  <span style={{ color: textColor, fontSize: 12 }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

// ── Billing view (subscription & riwayat pembayaran global) ───────────
function BillingView({
  subscriptions,
  payments,
  error,
}: {
  subscriptions: AdminGateSubscription[];
  payments: AdminGatePayment[];
  error: string;
}) {
  const [subTab, setSubTab] = useState<"subs" | "payments">("subs");
  const subPagination = usePagination(subscriptions, PAGE_SIZE);
  const payPagination = usePagination(payments, PAGE_SIZE);

  const formatRp = (v: number, currency: string) =>
    v.toLocaleString("id-ID", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });

  return (
    <div className="space-y-6">
      <Card>
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Data Pembayaran & Langganan
          </span>
          {/* Sub-tab di dalam tab Billing */}
          <div className="flex gap-1">
            {(
              [
                { key: "subs", label: "Subscriptions" },
                { key: "payments", label: "Riwayat Pembayaran" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setSubTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  subTab === t.key
                    ? "bg-primary-500/10 text-primary-600 dark:text-primary-400"
                    : "text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {subTab === "subs" ? (
          subscriptions.length === 0 ? (
            <EmptyState error={error} text="Belum ada subscription." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/30">
                    <tr>
                      {["User", "Plan", "Siklus", "Status", "Periode Berakhir"].map(
                        (h) => (
                          <th
                            key={h}
                            className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                    {subPagination.pageItems.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-gray-50 dark:hover:bg-white/5"
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                            {s.users?.name || "—"}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {s.users?.email || s.users?.phone || ""}
                          </p>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {s.plans?.display_name || s.plans?.name || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {s.billing_cycle === "yearly" ? "Tahunan" : "Bulanan"}
                        </td>
                        <td className="px-4 py-2.5">{subBadge(s.status)}</td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {s.current_period_end
                            ? new Date(s.current_period_end).toLocaleDateString(
                                "id-ID",
                              )
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={subPagination.page}
                totalPages={subPagination.totalPages}
                totalItems={subPagination.totalItems}
                startIndex={subPagination.startIndex}
                endIndex={subPagination.endIndex}
                canPrev={subPagination.canPrev}
                canNext={subPagination.canNext}
                onPrev={subPagination.prev}
                onNext={subPagination.next}
                onGoTo={subPagination.goTo}
                itemLabel="subscription"
              />
            </>
          )
        ) : payments.length === 0 ? (
          <EmptyState error={error} text="Belum ada pembayaran." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/30">
                  <tr>
                    {["Order ID", "User", "Jumlah", "Status", "Waktu"].map((h) => (
                      <th
                        key={h}
                        className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  {payPagination.pageItems.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {p.order_id}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                          {p.users?.name || "—"}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {p.users?.email || p.users?.phone || ""}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap tabular-nums">
                        {formatRp(p.amount, p.currency)}
                      </td>
                      <td className="px-4 py-2.5">{payBadge(p.status)}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(p.paid_at || p.created_at).toLocaleString(
                          "id-ID",
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={payPagination.page}
              totalPages={payPagination.totalPages}
              totalItems={payPagination.totalItems}
              startIndex={payPagination.startIndex}
              endIndex={payPagination.endIndex}
              canPrev={payPagination.canPrev}
              canNext={payPagination.canNext}
              onPrev={payPagination.prev}
              onNext={payPagination.next}
              onGoTo={payPagination.goTo}
              itemLabel="pembayaran"
            />
          </>
        )}
      </Card>
    </div>
  );
}

// Badge status subscription — warna mengikuti arti status.
function subBadge(status: string) {
  const map: Record<string, string> = {
    active:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    trialing: "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    past_due:
      "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    canceled:
      "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400",
    expired:
      "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400",
  };
  const label: Record<string, string> = {
    active: "Aktif",
    trialing: "Trial",
    past_due: "Tunggakan",
    canceled: "Dibatalkan",
    expired: "Kedaluwarsa",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || map.canceled}`}
    >
      {label[status] || status}
    </span>
  );
}

// Badge status pembayaran.
function payBadge(status: string) {
  const map: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    pending:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    failed: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    expired:
      "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400",
    refunded:
      "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
  };
  const label: Record<string, string> = {
    paid: "Lunas",
    pending: "Menunggu",
    failed: "Gagal",
    expired: "Kedaluwarsa",
    refunded: "Refund",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || map.expired}`}
    >
      {label[status] || status}
    </span>
  );
}

// ── Audit Log view (filter status + cari IP, fetch di sisi server) ────
function AuditLogView({
  statusBadge,
  stats,
  error,
}: {
  statusBadge: (s: AdminGateLog["status"]) => React.ReactNode;
  stats: { total: number; success: number; failed: number; blocked: number };
  error: string;
}) {
  const [logs, setLogs] = useState<AdminGateLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const pagination = usePagination(logs, PAGE_SIZE);

  // Debounce pencarian: tunggu 400ms setelah berhenti mengetik sebelum
  // fetch ulang ke server dengan filter status & IP.
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      (async () => {
        try {
          const data = await fetchAdminGateLogs({
            status: statusFilter || undefined,
            ip: query.trim() || undefined,
          });
          setLogs(data);
          setFetchError("");
        } catch {
          setFetchError("Gagal memuat log.");
        } finally {
          setLoading(false);
        }
      })();
    }, 400);
    return () => clearTimeout(t);
  }, [query, statusFilter]);

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Activity size={15} />}
          label="Total Percobaan"
          value={stats.total}
        />
        <StatCard
          icon={<CheckCircle2 size={15} />}
          label="Berhasil"
          value={stats.success}
          accent="emerald"
        />
        <StatCard
          icon={<XCircle size={15} />}
          label="Gagal"
          value={stats.failed}
          accent="rose"
        />
        <StatCard
          icon={<Ban size={15} />}
          label="Diblokir"
          value={stats.blocked}
          accent="amber"
        />
      </div>

      <Card>
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Riwayat Percobaan Login Gerbang
          </span>
          {!loading && logs.length > 0 && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {logs.length} catatan
            </span>
          )}
        </div>

        {/* Filter bar: cari IP + dropdown status */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari IP... (mis. 182.16.1.25)"
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition"
          >
            <option value="">Semua Status</option>
            <option value="success">Berhasil</option>
            <option value="failed">Gagal</option>
            <option value="blocked">Diblokir</option>
          </select>
          {(query || statusFilter) && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 transition"
            >
              <X size={14} />
              Reset
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            error={fetchError || error}
            text={
              query || statusFilter
                ? "Tidak ada catatan yang cocok dengan filter."
                : "Belum ada percobaan tercatat."
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/30">
                  <tr>
                    {["Waktu", "IP", "Status"].map((h) => (
                      <th
                        key={h}
                        className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  {pagination.pageItems.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">
                        {log.ip}
                      </td>
                      <td className="px-4 py-2.5">{statusBadge(log.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              canPrev={pagination.canPrev}
              canNext={pagination.canNext}
              onPrev={pagination.prev}
              onNext={pagination.next}
              onGoTo={pagination.goTo}
              itemLabel="percobaan"
            />
          </>
        )}
      </Card>
    </div>
  );
}

// ── Users view (read-only + moderasi: suspend & hapus permanen) ────────
function UsersView({
  users,
  roleBadge,
  error,
  onDelete,
  onSuspend,
  onUnsuspend,
}: {
  users: AdminGateUser[];
  roleBadge: Record<string, string>;
  error: string;
  onDelete: (u: AdminGateUser) => void;
  onSuspend: (u: AdminGateUser) => void;
  onUnsuspend: (u: AdminGateUser) => void;
}) {
  const pagination = usePagination(users, PAGE_SIZE);

  return (
    <Card>
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Semua User (lintas company)
        </span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          Hanya tampilan · moderasi: suspend atau hapus permanen
        </span>
      </div>
      {users.length === 0 ? (
        <EmptyState error={error} text="Belum ada user." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/30">
                <tr>
                  {["Nama", "Email / No. HP", "Company", "Role", "Status", "Aksi"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {pagination.pageItems.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {u.name}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                      {u.email || u.phone || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                      {u.companies?.name || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge[u.role] || ""}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">{entityStatusBadge(u.status)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {u.status === "suspended" ? (
                          <button
                            onClick={() => onUnsuspend(u)}
                            title="Aktifkan kembali (unsuspend)"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"
                          >
                            <RotateCcw size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => onSuspend(u)}
                            title="Suspend (soft delete — data aman)"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"
                          >
                            <Ban size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(u)}
                          title="Hapus permanen (moderasi)"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            canPrev={pagination.canPrev}
            canNext={pagination.canNext}
            onPrev={pagination.prev}
            onNext={pagination.next}
            onGoTo={pagination.goTo}
            itemLabel="user"
          />
        </>
      )}
    </Card>
  );
}

// ── Companies view (read-only + moderasi: suspend & hapus permanen) ────
function CompaniesView({
  companies,
  error,
  onDelete,
  onSuspend,
  onUnsuspend,
}: {
  companies: AdminGateCompany[];
  error: string;
  onDelete: (c: AdminGateCompany) => void;
  onSuspend: (c: AdminGateCompany) => void;
  onUnsuspend: (c: AdminGateCompany) => void;
}) {
  const pagination = usePagination(companies, PAGE_SIZE);

  return (
    <Card>
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Semua Company
        </span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          Hanya tampilan · moderasi: suspend atau hapus permanen
        </span>
      </div>
      {companies.length === 0 ? (
        <EmptyState error={error} text="Belum ada company." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/30">
                <tr>
                  {["Nama", "Mata Uang", "Dibuat", "Status", "Aksi"].map((h) => (
                    <th
                      key={h}
                      className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {pagination.pageItems.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">
                      {c.name}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                      {c.currency}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-2.5">{entityStatusBadge(c.status)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {c.status === "suspended" ? (
                          <button
                            onClick={() => onUnsuspend(c)}
                            title="Aktifkan kembali (unsuspend)"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"
                          >
                            <RotateCcw size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => onSuspend(c)}
                            title="Suspend (soft delete — data aman)"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"
                          >
                            <Ban size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(c)}
                          title="Hapus permanen (data ikut terhapus)"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            canPrev={pagination.canPrev}
            canNext={pagination.canNext}
            onPrev={pagination.prev}
            onNext={pagination.next}
            onGoTo={pagination.goTo}
            itemLabel="company"
          />
        </>
      )}
    </Card>
  );
}

// ── Modal konfirmasi aksi moderasi (hapus permanen / suspend / aktifkan) ─
function ConfirmActionModal({
  confirm,
  confirming,
  onCancel,
  onConfirm,
}: {
  confirm: ConfirmState;
  confirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const type = confirm?.type;
  const isUser = type?.endsWith("User") ?? false;
  const isDelete = type?.startsWith("delete") ?? false;
  const isSuspend = type?.startsWith("suspend") ?? false;
  const isUnsuspend = type?.startsWith("unsuspend") ?? false;

  const name = confirm
    ? isUser
      ? (confirm.item as AdminGateUser).name
      : (confirm.item as AdminGateCompany).name
    : "";
  const detail =
    confirm && isUser
      ? (confirm.item as AdminGateUser).email ||
        (confirm.item as AdminGateUser).phone ||
        ""
      : "";

  // Meta per varian aksi: warna, judul, ikon, dan teks tombol.
  const meta = isDelete
    ? {
        icon: <AlertTriangle size={22} />,
        iconBox:
          "bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
        title: `Hapus ${isUser ? "User" : "Company"}?`,
        body: isUser ? (
          <>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {name}
            </span>
            {detail && (
              <span className="text-gray-400 dark:text-gray-500">
                {" "}
                ({detail})
              </span>
            )}{" "}
            akan dihapus <span className="font-semibold text-rose-600 dark:text-rose-400">permanen</span> beserta
            seluruh datanya. Tindakan ini tidak bisa dibatalkan.
          </>
        ) : (
          <>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {name}
            </span>{" "}
            akan dihapus <span className="font-semibold text-rose-600 dark:text-rose-400">permanen</span> beserta
            seluruh datanya (user, akun, periode, jurnal, dll.). Tindakan ini
            tidak bisa dibatalkan.
          </>
        ),
        button: "Ya, Hapus",
        buttonCls:
          "bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/25",
      }
    : isSuspend
      ? {
          icon: <Ban size={22} />,
          iconBox:
            "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
          title: `Suspend ${isUser ? "User" : "Company"}?`,
          body: isUser ? (
            <>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {name}
              </span>
              {detail && (
                <span className="text-gray-400 dark:text-gray-500">
                  {" "}
                  ({detail})
                </span>
              )}{" "}
              akan dinonaktifkan sementara — tidak bisa login & semua akses
              ditolak. <span className="font-semibold text-amber-600 dark:text-amber-400">Data tidak dihapus</span> dan
              bisa diaktifkan kembali.
            </>
          ) : (
            <>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {name}
              </span>{" "}
              akan dinonaktifkan sementara — seluruh anggotanya kehilangan
              akses. <span className="font-semibold text-amber-600 dark:text-amber-400">Data tidak dihapus</span> dan
              bisa diaktifkan kembali.
            </>
          ),
          button: "Ya, Suspend",
          buttonCls:
            "bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/25",
        }
      : isUnsuspend
        ? {
            icon: <CheckCircle2 size={22} />,
            iconBox:
              "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            title: `Aktifkan Kembali ${isUser ? "User" : "Company"}?`,
            body: isUser ? (
              <>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {name}
                </span>
                {detail && (
                  <span className="text-gray-400 dark:text-gray-500">
                    {" "}
                    ({detail})
                  </span>
                )}{" "}
                akan diaktifkan kembali — bisa login seperti biasa.
              </>
            ) : (
              <>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {name}
                </span>{" "}
                akan diaktifkan kembali — seluruh anggotanya bisa mengakses
                seperti biasa.
              </>
            ),
            button: "Ya, Aktifkan",
            buttonCls:
              "bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/25",
          }
        : null;

  return (
    <AnimatePresence>
      {confirm && meta && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-2xl overflow-hidden"
          >
            {/* Header sesuai varian */}
            <div className="flex items-start gap-4 px-6 pt-6">
              <div className={`shrink-0 p-3 rounded-2xl ${meta.iconBox}`}>
                {meta.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {meta.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
                  {meta.body}
                </p>
              </div>
              <button
                onClick={onCancel}
                disabled={confirming}
                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-5 mt-4 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={onCancel}
                disabled={confirming}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-white/5 transition disabled:opacity-40"
              >
                Batal
              </button>
              <button
                onClick={onConfirm}
                disabled={confirming}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${meta.buttonCls}`}
              >
                {confirming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    {meta.icon}
                    {meta.button}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Badge status entitas (user/company): active / suspended ───────────
function entityStatusBadge(status?: "active" | "suspended") {
  if (status === "suspended") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
        <Ban size={10} />
        Suspend
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
      <CheckCircle2 size={10} />
      Aktif
    </span>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-md overflow-hidden">
      {children}
    </div>
  );
}

function EmptyState({ error, text }: { error: string; text: string }) {
  return (
    <div className="py-16 text-center">
      {error ? (
        <>
          <XCircle size={40} className="mx-auto mb-3 opacity-40 text-rose-400" />
          <p className="text-gray-400 dark:text-gray-500 text-sm">{error}</p>
        </>
      ) : (
        <p className="text-gray-400 dark:text-gray-500 text-sm">{text}</p>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: "emerald" | "rose" | "amber";
}) {
  const accentCls =
    accent === "emerald"
      ? "text-emerald-500"
      : accent === "rose"
        ? "text-rose-500"
        : accent === "amber"
          ? "text-amber-500"
          : "text-primary-500";
  return (
    <div className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-sm px-4 py-3.5">
      <div className={`flex items-center gap-1.5 mb-1 ${accentCls}`}>
        {icon}
        <p className="text-[11px] font-medium uppercase tracking-wider opacity-80">
          {label}
        </p>
      </div>
      <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
        {value}
      </p>
    </div>
  );
}
