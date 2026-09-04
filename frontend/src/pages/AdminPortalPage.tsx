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
  Eye,
  ListTree,
  ListFilter,
  UserCheck,
  Database,
  Terminal,
  Plus,
  Pencil,
  Power,
  PowerOff,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  fetchAdminGateLogs,
  fetchAdminGateUsers,
  fetchAdminGateCompanies,
  fetchAdminGateOverview,
  fetchAdminGateSubscriptions,
  fetchAdminGatePayments,
  fetchAdminGateCompanyDetail,
  fetchAdminGatePlans,
  createAdminGatePlan,
  updateAdminGatePlan,
  deactivateAdminGatePlan,
  checkSmtpHealth,
  checkWhatsAppHealth,
  checkDatabaseHealth,
  deleteAdminGateUser,
  deleteAdminGateCompany,
  setAdminGateUserStatus,
  setAdminGateCompanyStatus,
  logoutAdminGate,
  type AdminGateLog,
  type AdminGateUser,
  type AdminGateCompany,
  type AdminGateCompanyDetail,
  type AdminGateOverview,
  type AdminGateSubscription,
  type AdminGatePayment,
  type AdminGatePlan,
  type HealthStatus,
} from "../services/adminGateService";
import { getAdminGateToken } from "../lib/session";
import { useToast } from "../context/ToastContext";
import { usePagination } from "../hooks/usePagination";
import { getErrorMessage } from "../lib/errorMessage";
import { TablePagination } from "../components/TablePagination";
import { HoverDropdown } from "../components/HoverDropdown";
import { useLanguage } from "../hooks/useLanguage";
import { tx } from "../i18n/tx";

type Tab = "overview" | "billing" | "log" | "users" | "companies" | "plans" | "health";

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

// Neutral indigo/violet palette — BUKAN cyan (customer) supaya jelas beda dunia
const ACCENT = {
  badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  icon: "text-indigo-500",
  active: "border-indigo-500 text-indigo-600 dark:text-indigo-400",
  activeBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  ring: "focus:ring-indigo-500/40",
  btn: "bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25",
  spinner: "border-indigo-500",
};

const roleBadge: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  akuntan: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

const PAGE_SIZE = 5;

export default function AdminPortalPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [tab, setTab] = useState<Tab>("overview");

  const [logs, setLogs] = useState<AdminGateLog[]>([]);
  const [users, setUsers] = useState<AdminGateUser[]>([]);
  const [companies, setCompanies] = useState<AdminGateCompany[]>([]);
  const [overview, setOverview] = useState<AdminGateOverview | null>(null);
  const [subscriptions, setSubscriptions] = useState<AdminGateSubscription[]>([]);
  const [payments, setPayments] = useState<AdminGatePayment[]>([]);
  const [plans, setPlans] = useState<AdminGatePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [confirming, setConfirming] = useState(false);
  const [detailOpen, setDetailOpen] = useState<AdminGateCompany | null>(null);
  const [detailData, setDetailData] = useState<AdminGateCompanyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const hasToken = !!getAdminGateToken();

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  const load = useCallback(async () => {
    if (!hasToken) return;
    setRefreshing(true);
    setError("");
    try {
      const [logData, userData, companyData, overviewData, subData, payData, planData] =
        await Promise.all([
          fetchAdminGateLogs(),
          fetchAdminGateUsers(),
          fetchAdminGateCompanies(),
          fetchAdminGateOverview(),
          fetchAdminGateSubscriptions(),
          fetchAdminGatePayments(),
          fetchAdminGatePlans(),
        ]);
      setLogs(logData);
      setUsers(userData);
      setCompanies(companyData);
      setOverview(overviewData);
      setSubscriptions(subData);
      setPayments(payData);
      setPlans(planData);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        logoutAdminGate();
        navigate("/portal-akses", { replace: true });
        return;
      }
      setError(tx(language, "Failed to load dashboard data.", "Gagal memuat data dashboard."));
      toast({ variant: "error", title: tx(language, "Failed to load data", "Gagal memuat data"), message: tx(language, "Cannot fetch dashboard data. Please reload.", "Tidak bisa mengambil data dashboard. Coba muat ulang.") });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasToken, navigate, toast]);

  useEffect(() => { load(); }, [load]);

  const handleLogout = () => {
    logoutAdminGate();
    navigate("/login", { replace: true });
  };

  const openDetail = async (c: AdminGateCompany) => {
    setDetailOpen(c);
    setDetailData(null);
    setDetailLoading(true);
    setDetailError("");
    try { setDetailData(await fetchAdminGateCompanyDetail(c.id)); }
    catch (err: any) { setDetailError(getErrorMessage(err)); }
    finally { setDetailLoading(false); }
  };

  const closeDetail = () => { setDetailOpen(null); setDetailData(null); setDetailError(""); };

  const requestDeleteUser = (u: AdminGateUser) => setConfirm({ type: "deleteUser", item: u });
  const requestDeleteCompany = (c: AdminGateCompany) => setConfirm({ type: "deleteCompany", item: c });
  const requestSuspendUser = (u: AdminGateUser) => setConfirm({ type: "suspendUser", item: u });
  const requestUnsuspendUser = (u: AdminGateUser) => setConfirm({ type: "unsuspendUser", item: u });
  const requestSuspendCompany = (c: AdminGateCompany) => setConfirm({ type: "suspendCompany", item: c });
  const requestUnsuspendCompany = (c: AdminGateCompany) => setConfirm({ type: "unsuspendCompany", item: c });

  const handleConfirmAction = async () => {
    if (!confirm) return;
    setConfirming(true);
    try {
      if (confirm.type === "deleteUser") {
        const u = confirm.item as AdminGateUser;
        await deleteAdminGateUser(u.id);
        setUsers((prev) => prev.filter((x) => x.id !== u.id));
        toast({ variant: "success", title: tx(language, "User deleted", "User dihapus"), message: `${u.name} ${tx(language, "successfully deleted.", "berhasil dihapus.")}` });
      } else if (confirm.type === "deleteCompany") {
        const c = confirm.item as AdminGateCompany;
        await deleteAdminGateCompany(c.id);
        setCompanies((prev) => prev.filter((x) => x.id !== c.id));
        toast({ variant: "success", title: tx(language, "Company deleted", "Company dihapus"), message: `${c.name} ${tx(language, "successfully deleted.", "berhasil dihapus.")}` });
      } else if (confirm.type === "suspendUser" || confirm.type === "unsuspendUser") {
        const u = confirm.item as AdminGateUser;
        const suspended = confirm.type === "suspendUser";
        await setAdminGateUserStatus(u.id, suspended);
        setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, status: suspended ? "suspended" : "active" } : x));
        toast({ variant: "success", title: suspended ? tx(language, "User suspended", "User disuspend") : tx(language, "User activated", "User diaktifkan"), message: suspended ? `${u.name} ${tx(language, "deactivated.", "dinonaktifkan.")}` : `${u.name} ${tx(language, "reactivated.", "diaktifkan kembali.")}` });
      } else {
        const c = confirm.item as AdminGateCompany;
        const suspended = confirm.type === "suspendCompany";
        await setAdminGateCompanyStatus(c.id, suspended);
        setCompanies((prev) => prev.map((x) => x.id === c.id ? { ...x, status: suspended ? "suspended" : "active" } : x));
        toast({ variant: "success", title: suspended ? tx(language, "Company suspended", "Company disuspend") : tx(language, "Company activated", "Company diaktifkan"), message: suspended ? `${c.name} ${tx(language, "deactivated.", "dinonaktifkan.")}` : `${c.name} ${tx(language, "reactivated.", "diaktifkan kembali.")}` });
      }
      setConfirm(null);
    } catch (err: any) {
      toast({ variant: "error", title: tx(language, "Failed", "Gagal"), message: getErrorMessage(err) });
    } finally {
      setConfirming(false);
    }
  };

  if (!hasToken) return <Navigate to="/portal-akses" replace />;

  const stats = {
    total: logs.length,
    success: logs.filter((l) => l.status === "success").length,
    failed: logs.filter((l) => l.status === "failed").length,
    blocked: logs.filter((l) => l.status === "blocked").length,
  };

  const statusBadge = (status: AdminGateLog["status"]) => {
    const map = {
      success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
      failed: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
      blocked: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    } as const;
    const label = { success: tx(language, "Success", "Berhasil"), failed: tx(language, "Failed", "Gagal"), blocked: tx(language, "Blocked", "Diblokir") } as const;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
        {label[status]}
      </span>
    );
  };

  const sidebarTabs: { key: Tab; icon: React.ReactNode; label: string; count?: number }[] = [
    { key: "overview", icon: <LayoutDashboard size={16} />, label: tx(language, "Overview", "Ringkasan") },
    { key: "billing", icon: <CreditCard size={16} />, label: tx(language, "Billing", "Penagihan"), count: subscriptions.length },
    { key: "log", icon: <ScrollText size={16} />, label: tx(language, "Audit Log", "Log Audit"), count: logs.length },
    { key: "users", icon: <Users size={16} />, label: tx(language, "Users", "Pengguna"), count: users.length },
    { key: "companies", icon: <Building2 size={16} />, label: tx(language, "Companies", "Perusahaan"), count: companies.length },
    { key: "plans", icon: <Wallet size={16} />, label: tx(language, "Plans", "Paket"), count: plans.length },
    { key: "health", icon: <Activity size={16} />, label: tx(language, "System Health", "Kesehatan Sistem") },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0B1120] transition-colors">
      {/* Desktop: 2 floating cards */}
      <div className="hidden lg:flex h-screen p-4 gap-4">
        {/* Sidebar card */}
        <aside className="w-64 shrink-0 h-full rounded-3xl bg-white dark:bg-darkCard shadow-lg border border-gray-200/60 dark:border-gray-700/30 overflow-hidden flex flex-col">
          {/* Sidebar header */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50/50 dark:from-indigo-900/20 dark:to-violet-900/10 border border-indigo-200/50 dark:border-indigo-800/30">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                <Terminal size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate leading-tight">
                  LedgerFlow Ops
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate leading-tight mt-0.5">
                  Internal Console
                </p>
              </div>
              <ShieldCheck size={14} className="text-indigo-400 shrink-0" />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 flex flex-col px-3 pt-1 pb-1 overflow-y-auto scrollbar-thin">
            <p className="px-3 mb-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">
              Panel
            </p>
            <div className="space-y-1.5">
              {sidebarTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`group relative flex items-center gap-2.5 w-full pl-4 pr-3 py-2 text-xs rounded-xl transition-all duration-200 text-left ${
                    tab === t.key
                      ? "bg-gradient-to-r from-indigo-500/10 to-indigo-500/5 text-indigo-600 dark:text-indigo-400 font-medium shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-darkCard/50"
                  }`}
                >
                  <span
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-200 ${
                      tab === t.key ? "h-5 bg-indigo-500" : "h-0 bg-transparent group-hover:h-2 group-hover:bg-indigo-300 dark:group-hover:bg-indigo-700"
                    }`}
                  />
                  {t.icon}
                  <span className="truncate">{t.label}</span>
                  {t.count !== undefined && (
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      tab === t.key ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500"
                    }`}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </nav>

          {/* Sidebar footer: refresh + logout */}
          <div className="border-t border-gray-100 dark:border-gray-800 py-2 px-3 space-y-1">
            <button
              onClick={load}
              disabled={refreshing}
              className="flex items-center gap-2.5 w-full pl-4 pr-3 py-2 text-xs rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-darkCard/50 transition-colors"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              <span>{tx(language, "Reload", "Muat Ulang")}</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full pl-4 pr-3 py-2 text-xs rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
            >
              <LogOut size={16} />
              <span>{tx(language, "Logout", "Keluar")}</span>
            </button>
          </div>
        </aside>

        {/* Content card */}
        <div className="flex-1 h-full rounded-3xl bg-white dark:bg-darkCard shadow-lg border border-gray-200/60 dark:border-gray-700/30 overflow-hidden flex flex-col min-w-0">
          {/* Content header strip */}
          <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-darkCard/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  {tx(language, "Admin Portal", "Admin Portal")}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {sidebarTabs.find((t) => t.key === tab)?.label || "Dashboard"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                <ShieldCheck size={12} />
                {tx(language, "Admin Only", "Khusus Admin")}
              </span>
            </div>
          </header>

          {/* Main scrollable area */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
            {loading ? (
              <div className="py-20 flex justify-center">
                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${ACCENT.spinner}`} />
              </div>
            ) : tab === "overview" ? (
              <OverviewView overview={overview} error={error} />
            ) : tab === "billing" ? (
              <BillingView subscriptions={subscriptions} payments={payments} error={error} />
            ) : tab === "log" ? (
              <AuditLogView statusBadge={statusBadge} stats={stats} error={error} />
            ) : tab === "users" ? (
              <UsersView users={users} roleBadge={roleBadge} error={error} onDelete={requestDeleteUser} onSuspend={requestSuspendUser} onUnsuspend={requestUnsuspendUser} />
            ) : tab === "companies" ? (
              <CompaniesView companies={companies} error={error} onDelete={requestDeleteCompany} onSuspend={requestSuspendCompany} onUnsuspend={requestUnsuspendCompany} onView={openDetail} />
            ) : tab === "plans" ? (
              <PlansView plans={plans} setPlans={setPlans} error={error} />
            ) : (
              <SystemHealthView />
            )}
          </main>
        </div>
      </div>

      {/* Mobile: simple layout */}
      <div className="lg:hidden min-h-screen flex flex-col">
        <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#111827]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                <ShieldCheck size={18} />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white text-sm">{tx(language, "Admin Portal", "Admin Portal")}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} disabled={refreshing} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50">
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                {tx(language, "Reload", "Muat Ulang")}
              </button>
              <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <LogOut size={14} />
                {tx(language, "Logout", "Keluar")}
              </button>
            </div>
          </div>
          {/* Mobile tabs */}
          <div className="flex gap-1 px-4 pb-3 overflow-x-auto scrollbar-thin">
            {sidebarTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  tab === t.key
                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t.icon}
                {t.label}
                {t.count !== undefined && (
                  <span className={`text-[10px] px-1 py-0.5 rounded-full font-semibold ${
                    tab === t.key ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" : "bg-gray-100 dark:bg-white/5 text-gray-400"
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex justify-center">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${ACCENT.spinner}`} />
            </div>
          ) : tab === "overview" ? (
            <OverviewView overview={overview} error={error} />
          ) : tab === "billing" ? (
            <BillingView subscriptions={subscriptions} payments={payments} error={error} />
          ) : tab === "log" ? (
            <AuditLogView statusBadge={statusBadge} stats={stats} error={error} />
          ) : tab === "users" ? (
            <UsersView users={users} roleBadge={roleBadge} error={error} onDelete={requestDeleteUser} onSuspend={requestSuspendUser} onUnsuspend={requestUnsuspendUser} />
          ) : tab === "companies" ? (
            <CompaniesView companies={companies} error={error} onDelete={requestDeleteCompany} onSuspend={requestSuspendCompany} onUnsuspend={requestUnsuspendCompany} onView={openDetail} />
          ) : tab === "plans" ? (
            <PlansView plans={plans} setPlans={setPlans} error={error} />
          ) : (
            <SystemHealthView />
          )}
        </main>
      </div>

      {/* Modals */}
      <ConfirmActionModal confirm={confirm} confirming={confirming} onCancel={() => !confirming && setConfirm(null)} onConfirm={handleConfirmAction} />
      <CompanyDetailModal company={detailOpen} data={detailData} loading={detailLoading} error={detailError} onClose={closeDetail} />
    </div>
  );
}

// ── Overview ────────────────────────────────────────────────────────
function OverviewView({ overview, error }: { overview: AdminGateOverview | null; error: string }) {
  const { language } = useLanguage();
  if (!overview) return <EmptyState error={error} text={tx(language, "No summary data yet.", "Belum ada data ringkasan.")} />;
  const totalActives = overview.plan_distribution.reduce((s, p) => s + p.users, 0);
  const formatRp = (v: number) => v.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Users size={15} />} label={tx(language, "Total Users", "Total User")} value={overview.total_users} />
        <StatCard icon={<Building2 size={15} />} label={tx(language, "Total Companies", "Total Company")} value={overview.total_companies} />
        <StatCard icon={<TrendingUp size={15} />} label={tx(language, "New Users 30 Days", "User Baru 30 Hari")} value={overview.users_growth_30d} accent="emerald" />
        <StatCard icon={<UserMinus size={15} />} label={tx(language, "Churn 30 Days", "Churn 30 Hari")} value={overview.churn_30d} accent="rose" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-1.5 mb-1 text-indigo-500">
              <Wallet size={15} />
              <p className="text-[11px] font-medium uppercase tracking-wider opacity-80">MRR</p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tabular-nums">{formatRp(overview.mrr)}</p>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{tx(language, "From", "Dari")} {totalActives} {tx(language, "active subscriptions", "subscription aktif")}</p>
          </div>
        </Card>
        <PlanDistributionChart data={overview.plan_distribution} />
      </div>
    </div>
  );
}

const PLAN_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e"];

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

function PlanDistributionChart({ data }: { data: { name: string; users: number }[] }) {
  const isDark = useIsDark();
  const { language } = useLanguage();
  const textColor = isDark ? "#94a3b8" : "#64748b";
  return (
    <Card>
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{tx(language, "User Distribution per Plan", "Distribusi User per Plan")}</span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">{tx(language, "Based on active subscriptions", "Berdasarkan subscription aktif")}</span>
      </div>
      <div className="p-4">
        {data.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">{tx(language, "No active subscriptions yet.", "Belum ada subscription aktif.")}</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data} dataKey="users" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3} strokeWidth={2} stroke={isDark ? "#111827" : "#ffffff"}>
                {data.map((_, i) => <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value: any, name: any) => [`${value} user`, name as string]} contentStyle={{ background: isDark ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.95)", border: isDark ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(99,102,241,0.15)", borderRadius: 12, fontSize: 12 }} />
              <Legend iconType="circle" formatter={(value: any) => <span style={{ color: textColor, fontSize: 12 }}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

// ── Billing ────────────────────────────────────────────────────────
function BillingView({ subscriptions, payments, error }: { subscriptions: AdminGateSubscription[]; payments: AdminGatePayment[]; error: string }) {
  const { language } = useLanguage();
  const [subTab, setSubTab] = useState<"subs" | "payments">("subs");
  const subPagination = usePagination(subscriptions, PAGE_SIZE);
  const payPagination = usePagination(payments, PAGE_SIZE);
  const formatRp = (v: number, currency: string) => v.toLocaleString("id-ID", { style: "currency", currency, maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <Card>
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{tx(language, "Payment & Subscription Data", "Data Pembayaran & Langganan")}</span>
          <div className="flex gap-1">
            {[{ key: "subs" as const, label: tx(language, "Subscriptions", "Langganan") }, { key: "payments" as const, label: tx(language, "Payment History", "Riwayat Pembayaran") }].map((t) => (
              <button key={t.key} onClick={() => setSubTab(t.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${subTab === t.key ? ACCENT.activeBg : "text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {subTab === "subs" ? (
          subscriptions.length === 0 ? <EmptyState error={error} text={tx(language, "No subscriptions yet.", "Belum ada subscription.")} /> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/30">
                    <tr>{[tx(language, "User", "User"), tx(language, "Plan", "Paket"), tx(language, "Cycle", "Siklus"), tx(language, "Status", "Status"), tx(language, "Period Ends", "Periode Berakhir")].map((h) => <th key={h} className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                    {subPagination.pageItems.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-4 py-2.5"><p className="font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{s.users?.name || "—"}</p><p className="text-xs text-gray-400 dark:text-gray-500">{s.users?.email || s.users?.phone || ""}</p></td>
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">{s.plans?.display_name || s.plans?.name || "—"}</td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{s.billing_cycle === "yearly" ? tx(language, "Yearly", "Tahunan") : tx(language, "Monthly", "Bulanan")}</td>
                        <td className="px-4 py-2.5">{<SubBadge status={s.status} />}</td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString(language === "id" ? "id-ID" : "en-US") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination page={subPagination.page} totalPages={subPagination.totalPages} totalItems={subPagination.totalItems} startIndex={subPagination.startIndex} endIndex={subPagination.endIndex} canPrev={subPagination.canPrev} canNext={subPagination.canNext} onPrev={subPagination.prev} onNext={subPagination.next} onGoTo={subPagination.goTo} itemLabel="subscription" />
            </>
          )
        ) : payments.length === 0 ? <EmptyState error={error} text={tx(language, "No payments yet.", "Belum ada pembayaran.")} /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/30">
                  <tr>{[tx(language, "Order ID", "Order ID"), tx(language, "User", "User"), tx(language, "Amount", "Jumlah"), tx(language, "Status", "Status"), tx(language, "Time", "Waktu")].map((h) => <th key={h} className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  {payPagination.pageItems.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{p.order_id}</td>
                      <td className="px-4 py-2.5"><p className="font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{p.users?.name || "—"}</p><p className="text-xs text-gray-400 dark:text-gray-500">{p.users?.email || p.users?.phone || ""}</p></td>
                      <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap tabular-nums">{formatRp(p.amount, p.currency)}</td>
                        <td className="px-4 py-2.5">{<PayBadge status={p.status} />}</td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(p.paid_at || p.created_at).toLocaleString(language === "id" ? "id-ID" : "en-US")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={payPagination.page} totalPages={payPagination.totalPages} totalItems={payPagination.totalItems} startIndex={payPagination.startIndex} endIndex={payPagination.endIndex} canPrev={payPagination.canPrev} canNext={payPagination.canNext} onPrev={payPagination.prev} onNext={payPagination.next} onGoTo={payPagination.goTo} itemLabel="pembayaran" />
          </>
        )}
      </Card>
    </div>
  );
}

function SubBadge({ status }: { status: string }) {
  const { language } = useLanguage();
  const map: Record<string, string> = { active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", trialing: "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400", past_due: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400", canceled: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400", expired: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400" };
  const label: Record<string, string> = { active: tx(language, "Active", "Aktif"), trialing: "Trial", past_due: tx(language, "Overdue", "Tunggakan"), canceled: tx(language, "Canceled", "Dibatalkan"), expired: tx(language, "Expired", "Kedaluwarsa") };
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || map.canceled}`}>{label[status] || status}</span>;
}

function PayBadge({ status }: { status: string }) {
  const { language } = useLanguage();
  const map: Record<string, string> = { paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", failed: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400", expired: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400", refunded: "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400" };
  const label: Record<string, string> = { paid: tx(language, "Paid", "Lunas"), pending: tx(language, "Pending", "Menunggu"), failed: tx(language, "Failed", "Gagal"), expired: tx(language, "Expired", "Kedaluwarsa"), refunded: "Refund" };
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || map.expired}`}>{label[status] || status}</span>;
}

// ── Audit Log ──────────────────────────────────────────────────────
function AuditLogView({ statusBadge, stats, error }: { statusBadge: (s: AdminGateLog["status"]) => React.ReactNode; stats: { total: number; success: number; failed: number; blocked: number }; error: string }) {
  const { language } = useLanguage();
  const [logs, setLogs] = useState<AdminGateLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const pagination = usePagination(logs, PAGE_SIZE);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      (async () => {
          try {
            const data = await fetchAdminGateLogs({ status: statusFilter || undefined, ip: query.trim() || undefined });
            setLogs(data);
            setFetchError("");
          } catch { setFetchError(tx(language, "Failed to load log.", "Gagal memuat log.")); }
        finally { setLoading(false); }
      })();
    }, 400);
    return () => clearTimeout(t);
  }, [query, statusFilter]);

  const resetFilters = () => { setQuery(""); setStatusFilter(""); };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Activity size={15} />} label={tx(language, "Total Attempts", "Total Percobaan")} value={stats.total} />
        <StatCard icon={<CheckCircle2 size={15} />} label={tx(language, "Success", "Berhasil")} value={stats.success} accent="emerald" />
        <StatCard icon={<XCircle size={15} />} label={tx(language, "Failed", "Gagal")} value={stats.failed} accent="rose" />
        <StatCard icon={<Ban size={15} />} label={tx(language, "Blocked", "Diblokir")} value={stats.blocked} accent="amber" />
      </div>
      <Card>
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{tx(language, "Gateway Login Attempt History", "Riwayat Percobaan Login Gerbang")}</span>
          {!loading && logs.length > 0 && <span className="text-[11px] text-gray-400 dark:text-gray-500">{logs.length} {tx(language, "records", "catatan")}</span>}
        </div>
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tx(language, "Search IP...", "Cari IP...")} className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition" />
          </div>
          <HoverDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            icon={<ListFilter size={14} />}
            minWidth={150}
            options={[
              { value: "", label: tx(language, "All Status", "Semua Status") },
              { value: "success", label: tx(language, "Success", "Berhasil") },
              { value: "failed", label: tx(language, "Failed", "Gagal") },
              { value: "blocked", label: tx(language, "Blocked", "Diblokir") },
            ]}
          />
          {(query || statusFilter) && (
            <button onClick={resetFilters} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 transition">
              <X size={14} /> {tx(language, "Reset", "Reset")}
            </button>
          )}
        </div>
        {loading ? (
          <div className="py-12 flex justify-center"><div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${ACCENT.spinner}`} /></div>
        ) : logs.length === 0 ? (
          <EmptyState error={fetchError || error} text={query || statusFilter ? tx(language, "No matching records.", "Tidak ada catatan yang cocok.") : tx(language, "No recorded attempts yet.", "Belum ada percobaan tercatat.")} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/30"><tr>{[tx(language, "Time", "Waktu"), "IP", tx(language, "Status", "Status")].map((h) => <th key={h} className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  {pagination.pageItems.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">{new Date(log.created_at).toLocaleString(language === "id" ? "id-ID" : "en-US")}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">{log.ip}</td>
                      <td className="px-4 py-2.5">{statusBadge(log.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} startIndex={pagination.startIndex} endIndex={pagination.endIndex} canPrev={pagination.canPrev} canNext={pagination.canNext} onPrev={pagination.prev} onNext={pagination.next} onGoTo={pagination.goTo} itemLabel="percobaan" />
          </>
        )}
      </Card>
    </div>
  );
}

// ── Users ──────────────────────────────────────────────────────────
function UsersView({ users, roleBadge, error, onDelete, onSuspend, onUnsuspend }: { users: AdminGateUser[]; roleBadge: Record<string, string>; error: string; onDelete: (u: AdminGateUser) => void; onSuspend: (u: AdminGateUser) => void; onUnsuspend: (u: AdminGateUser) => void }) {
  const { language } = useLanguage();
  const pagination = usePagination(users, PAGE_SIZE);
  return (
    <Card>
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{tx(language, "All Users (cross-company)", "Semua User (lintas company)")}</span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">{tx(language, "Moderation: suspend or delete", "Moderasi: suspend atau hapus")}</span>
      </div>
      {users.length === 0 ? <EmptyState error={error} text={tx(language, "No users yet.", "Belum ada user.")} /> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/30"><tr>{[tx(language, "Name", "Nama"), "Email / No. HP", tx(language, "Company", "Company"), tx(language, "Role", "Role"), tx(language, "Status", "Status"), tx(language, "Actions", "Aksi")].map((h) => <th key={h} className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {pagination.pageItems.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{u.name}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{u.email || u.phone || "—"}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{u.companies?.name || "—"}</td>
                    <td className="px-4 py-2.5"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge[u.role] || ""}`}>{u.role}</span></td>
                    <td className="px-4 py-2.5">{entityStatusBadge(u.status, language)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {u.status === "suspended" ? (
                          <button onClick={() => onUnsuspend(u)} title={tx(language, "Reactivate", "Aktifkan kembali")} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"><RotateCcw size={14} /></button>
                        ) : (
                          <button onClick={() => onSuspend(u)} title={tx(language, "Suspend", "Suspend")} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"><Ban size={14} /></button>
                        )}
                        <button onClick={() => onDelete(u)} title={tx(language, "Delete permanently", "Hapus permanen")} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} startIndex={pagination.startIndex} endIndex={pagination.endIndex} canPrev={pagination.canPrev} canNext={pagination.canNext} onPrev={pagination.prev} onNext={pagination.next} onGoTo={pagination.goTo} itemLabel="user" />
        </>
      )}
    </Card>
  );
}

// ── Companies ──────────────────────────────────────────────────────
function CompaniesView({ companies, error, onDelete, onSuspend, onUnsuspend, onView }: { companies: AdminGateCompany[]; error: string; onDelete: (c: AdminGateCompany) => void; onSuspend: (c: AdminGateCompany) => void; onUnsuspend: (c: AdminGateCompany) => void; onView: (c: AdminGateCompany) => void }) {
  const { language } = useLanguage();
  const pagination = usePagination(companies, PAGE_SIZE);
  return (
    <Card>
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{tx(language, "All Companies", "Semua Company")}</span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">{tx(language, "Moderation: suspend or delete", "Moderasi: suspend atau hapus")}</span>
      </div>
      {companies.length === 0 ? <EmptyState error={error} text={tx(language, "No companies yet.", "Belum ada company.")} /> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/30"><tr>{[tx(language, "Name", "Nama"), tx(language, "Currency", "Mata Uang"), tx(language, "Created", "Dibuat"), tx(language, "Status", "Status"), tx(language, "Actions", "Aksi")].map((h) => <th key={h} className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {pagination.pageItems.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">{c.name}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{c.currency}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(c.created_at).toLocaleDateString(language === "id" ? "id-ID" : "en-US")}</td>
                    <td className="px-4 py-2.5">{entityStatusBadge(c.status, language)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => onView(c)} title={tx(language, "View detail", "Lihat detail")} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"><Eye size={14} /></button>
                        {c.status === "suspended" ? (
                          <button onClick={() => onUnsuspend(c)} title={tx(language, "Activate", "Aktifkan")} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"><RotateCcw size={14} /></button>
                        ) : (
                          <button onClick={() => onSuspend(c)} title={tx(language, "Suspend", "Suspend")} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"><Ban size={14} /></button>
                        )}
                        <button onClick={() => onDelete(c)} title={tx(language, "Delete permanently", "Hapus permanen")} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} startIndex={pagination.startIndex} endIndex={pagination.endIndex} canPrev={pagination.canPrev} canNext={pagination.canNext} onPrev={pagination.prev} onNext={pagination.next} onGoTo={pagination.goTo} itemLabel="company" />
        </>
      )}
    </Card>
  );
}

// ── Plans Management (CRUD) ────────────────────────────────────────
function PlansView({ plans, setPlans, error }: { plans: AdminGatePlan[]; setPlans: React.Dispatch<React.SetStateAction<AdminGatePlan[]>>; error: string }) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminGatePlan | null>(null);
  const [form, setForm] = useState({ name: "", display_name: "", price_monthly: 0, price_yearly: 0, max_companies: 1, max_journals: 50 });
  const [submitting, setSubmitting] = useState(false);
  const pagination = usePagination(plans, PAGE_SIZE);

  const openCreate = () => {
    setEditingPlan(null);
    setForm({ name: "", display_name: "", price_monthly: 0, price_yearly: 0, max_companies: 1, max_journals: 50 });
    setShowModal(true);
  };

  const openEdit = (p: AdminGatePlan) => {
    setEditingPlan(p);
    setForm({ name: p.name, display_name: p.display_name || "", price_monthly: p.price_monthly, price_yearly: p.price_yearly, max_companies: p.max_companies, max_journals: p.max_journals });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast({ variant: "error", title: tx(language, "Error", "Error"), message: tx(language, "Plan name is required", "Nama plan wajib diisi") }); return; }
    setSubmitting(true);
    try {
      if (editingPlan) {
        const updated = await updateAdminGatePlan(editingPlan.id, form);
        setPlans((prev) => prev.map((p) => p.id === editingPlan.id ? { ...p, ...updated } : p));
        toast({ variant: "success", title: tx(language, "Plan updated", "Plan diperbarui"), message: `${form.name} ${tx(language, "successfully updated.", "berhasil diubah.")}` });
      } else {
        const created = await createAdminGatePlan(form);
        setPlans((prev) => [...prev, created]);
        toast({ variant: "success", title: tx(language, "Plan created", "Plan dibuat"), message: `${form.name} ${tx(language, "successfully added.", "berhasil ditambahkan.")}` });
      }
      setShowModal(false);
    } catch (err: any) {
      toast({ variant: "error", title: tx(language, "Failed", "Gagal"), message: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (p: AdminGatePlan) => {
    try {
      await deactivateAdminGatePlan(p.id);
      setPlans((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: false } : x));
      toast({ variant: "success", title: tx(language, "Plan deactivated", "Plan dinonaktifkan"), message: `${p.name} ${tx(language, "successfully deactivated.", "berhasil dinonaktifkan.")}` });
    } catch (err: any) {
      toast({ variant: "error", title: tx(language, "Failed", "Gagal"), message: getErrorMessage(err) });
    }
  };

  const formatRp = (v: number) => v.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <Card>
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{tx(language, "Subscription Plan List", "Daftar Plan Langganan")}</span>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">
            <Plus size={14} /> {tx(language, "Add Plan", "Tambah Plan")}
          </button>
        </div>
        {plans.length === 0 ? <EmptyState error={error} text={tx(language, "No plans yet.", "Belum ada plan.")} /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/30">
                  <tr>{[tx(language, "Name", "Nama"), tx(language, "Monthly Price", "Harga Bulanan"), tx(language, "Yearly Price", "Harga Tahunan"), tx(language, "Max Companies", "Max perusahaan"), tx(language, "Max Journals", "Max jurnal"), tx(language, "Status", "Status"), tx(language, "Actions", "Aksi")].map((h) => <th key={h} className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  {pagination.pageItems.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-800 dark:text-gray-200">{p.display_name || p.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{p.name}</p>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 tabular-nums">{formatRp(p.price_monthly)}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 tabular-nums">{formatRp(p.price_yearly)}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-center">{p.max_companies}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-center">{p.max_journals}</td>
                      <td className="px-4 py-2.5">
                        {p.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"><Power size={10} /> {tx(language, "Active", "Aktif")}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400"><PowerOff size={10} /> {tx(language, "Inactive", "Nonaktif")}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(p)} title={tx(language, "Edit", "Edit")} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"><Pencil size={14} /></button>
                          {p.is_active && (
                            <button onClick={() => handleDeactivate(p)} title={tx(language, "Deactivate", "Nonaktifkan")} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"><PowerOff size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} startIndex={pagination.startIndex} endIndex={pagination.endIndex} canPrev={pagination.canPrev} canNext={pagination.canNext} onPrev={pagination.prev} onNext={pagination.next} onGoTo={pagination.goTo} itemLabel="plan" />
          </>
        )}
      </Card>

      {/* Modal create/edit plan */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !submitting && setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 pt-6 pb-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editingPlan ? tx(language, "Edit Plan", "Edit Plan") : tx(language, "New Plan", "Tambah Plan Baru")}</h3>
                <button onClick={() => setShowModal(false)} disabled={submitting} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition"><X size={16} /></button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{tx(language, "Internal Name", "Internal Name")} *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. pro, enterprise" className="w-full px-3 py-2 rounded-xl text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{tx(language, "Display Name", "Display Name")}</label>
                  <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="e.g. Pro Plan" className="w-full px-3 py-2 rounded-xl text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{tx(language, "Monthly Price (IDR)", "Harga Bulanan (IDR)")}</label>
                    <input type="number" value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{tx(language, "Yearly Price (IDR)", "Harga Tahunan (IDR)")}</label>
                    <input type="number" value={form.price_yearly} onChange={(e) => setForm({ ...form, price_yearly: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition tabular-nums" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{tx(language, "Max Companies", "Max Perusahaan")}</label>
                    <input type="number" value={form.max_companies} onChange={(e) => setForm({ ...form, max_companies: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{tx(language, "Max Journals", "Max Jurnal")}</label>
                    <input type="number" value={form.max_journals} onChange={(e) => setForm({ ...form, max_journals: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition tabular-nums" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-5 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => setShowModal(false)} disabled={submitting} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-white/5 transition disabled:opacity-40">{tx(language, "Cancel", "Batal")}</button>
                <button onClick={handleSubmit} disabled={submitting} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${ACCENT.btn}`}>
                  {submitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {tx(language, "Saving...", "Menyimpan...")}</> : editingPlan ? tx(language, "Save Changes", "Simpan Perubahan") : tx(language, "Create Plan", "Buat Plan")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── System Health Monitor ──────────────────────────────────────────
function SystemHealthView() {
  const { language } = useLanguage();
  const [smtp, setSmtp] = useState<HealthStatus | null>(null);
  const [whatsapp, setWhatsapp] = useState<HealthStatus | null>(null);
  const [database, setDatabase] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const checkAll = useCallback(async () => {
    setLoading({ smtp: true, whatsapp: true, database: true });
    const [s, w, d] = await Promise.allSettled([checkSmtpHealth(), checkWhatsAppHealth(), checkDatabaseHealth()]);
    setSmtp(s.status === "fulfilled" ? s.value : { ok: false, message: tx(language, "Probe failed", "Probe gagal") });
    setWhatsapp(w.status === "fulfilled" ? w.value : { ok: false, message: tx(language, "Probe failed", "Probe gagal") });
    setDatabase(d.status === "fulfilled" ? d.value : { ok: false, message: tx(language, "Probe failed", "Probe gagal") });
    setLoading({});
  }, []);

  useEffect(() => { checkAll(); }, [checkAll]);

  const checkOne = async (name: string, fn: () => Promise<HealthStatus>, setter: (s: HealthStatus) => void) => {
    setLoading((prev) => ({ ...prev, [name]: true }));
    try { setter(await fn()); }
    catch { setter({ ok: false, message: tx(language, "Probe failed", "Probe gagal") }); }
    setLoading((prev) => ({ ...prev, [name]: false }));
  };

  const items: { key: string; label: string; icon: React.ReactNode; status: HealthStatus | null; loading: boolean; check: () => void }[] = [
    { key: "smtp", label: "SMTP (Email)", icon: <Mail size={18} />, status: smtp, loading: !!loading.smtp, check: () => checkOne("smtp", checkSmtpHealth, setSmtp) },
    { key: "whatsapp", label: "WhatsApp / Fonnte", icon: <MessageSquare size={18} />, status: whatsapp, loading: !!loading.whatsapp, check: () => checkOne("whatsapp", checkWhatsAppHealth, setWhatsapp) },
    { key: "database", label: "Database (Supabase)", icon: <Database size={18} />, status: database, loading: !!loading.database, check: () => checkOne("database", checkDatabaseHealth, setDatabase) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{tx(language, "System Health", "System Health")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{tx(language, "Real-time system component status", "Status komponen sistem secara real-time")}</p>
        </div>
        <button onClick={checkAll} disabled={Object.values(loading).some(Boolean)} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={Object.values(loading).some(Boolean) ? "animate-spin" : ""} /> {tx(language, "Test All Again", "Test Ulang Semua")}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {items.map((item) => (
          <Card key={item.key}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${item.status?.ok ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : item.status === null ? "bg-gray-100 dark:bg-gray-800 text-gray-400" : "bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.label}</p>
                    <p className={`text-xs font-medium ${item.status?.ok ? "text-emerald-600 dark:text-emerald-400" : item.status === null ? "text-gray-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {item.loading ? tx(language, "Testing...", "Menguji...") : item.status?.ok ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
                {item.status !== null && (
                  <span className={`w-3 h-3 rounded-full ${item.status.ok ? "bg-emerald-500" : "bg-rose-500"}`} />
                )}
              </div>
              {item.status && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{item.status.message}</p>
              )}
              <button onClick={item.check} disabled={item.loading} className="w-full px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50">
                {item.loading ? tx(language, "Testing...", "Menguji...") : tx(language, "Test Again", "Test Ulang")}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Lazy icon imports for SystemHealthView
import { Mail, MessageSquare } from "lucide-react";

// ── Confirm Action Modal ───────────────────────────────────────────
function ConfirmActionModal({ confirm, confirming, onCancel, onConfirm }: { confirm: ConfirmState; confirming: boolean; onCancel: () => void; onConfirm: () => void }) {
  const { language } = useLanguage();
  const type = confirm?.type;
  const isUser = type?.endsWith("User") ?? false;
  const isDelete = type?.startsWith("delete") ?? false;
  const isSuspend = type?.startsWith("suspend") ?? false;
  const isUnsuspend = type?.startsWith("unsuspend") ?? false;
  const name = confirm ? (isUser ? (confirm.item as AdminGateUser).name : (confirm.item as AdminGateCompany).name) : "";
  const detail = confirm && isUser ? (confirm.item as AdminGateUser).email || (confirm.item as AdminGateUser).phone || "" : "";

  const meta = isDelete
    ? { icon: <AlertTriangle size={22} />, iconBox: "bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400", title: `${tx(language, "Delete", "Hapus")} ${isUser ? "User" : "Company"}?`, body: isUser ? <><span className="font-medium text-gray-700 dark:text-gray-300">{name}</span>{detail && <span className="text-gray-400 dark:text-gray-500"> ({detail})</span>} {tx(language, "will be", "akan")} <span className="font-semibold text-rose-600 dark:text-rose-400">{tx(language, "permanently deleted", "dihapus permanen")}</span>.</> : <><span className="font-medium text-gray-700 dark:text-gray-300">{name}</span> {tx(language, "will be", "akan")} <span className="font-semibold text-rose-600 dark:text-rose-400">{tx(language, "permanently deleted", "dihapus permanen")}</span> {tx(language, "along with its data", "beserta datanya")}.</>, button: tx(language, "Yes, Delete", "Ya, Hapus"), buttonCls: "bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/25" }
    : isSuspend
      ? { icon: <Ban size={22} />, iconBox: "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400", title: `${tx(language, "Suspend", "Suspend")} ${isUser ? "User" : "Company"}?`, body: <><span className="font-medium text-gray-700 dark:text-gray-300">{name}</span> {tx(language, "will be temporarily deactivated.", "akan dinonaktifkan sementara.")} <span className="font-semibold text-amber-600 dark:text-amber-400">{tx(language, "Data is not deleted.", "Data tidak dihapus.")}</span></>, button: tx(language, "Yes, Suspend", "Ya, Suspend"), buttonCls: "bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/25" }
      : isUnsuspend
        ? { icon: <CheckCircle2 size={22} />, iconBox: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", title: `${tx(language, "Reactivate", "Aktifkan Kembali")} ${isUser ? "User" : "Company"}?`, body: <><span className="font-medium text-gray-700 dark:text-gray-300">{name}</span> {tx(language, "will be reactivated.", "akan diaktifkan kembali.")}</>, button: tx(language, "Yes, Activate", "Ya, Aktifkan"), buttonCls: "bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/25" }
        : null;

  return (
    <AnimatePresence>
      {confirm && meta && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-2xl overflow-hidden">
            <div className="flex items-start gap-4 px-6 pt-6">
              <div className={`shrink-0 p-3 rounded-2xl ${meta.iconBox}`}>{meta.icon}</div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{meta.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">{meta.body}</p>
              </div>
              <button onClick={onCancel} disabled={confirming} className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition disabled:opacity-40"><X size={16} /></button>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-5 mt-4 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800">
              <button onClick={onCancel} disabled={confirming} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-white/5 transition disabled:opacity-40">{tx(language, "Cancel", "Batal")}</button>
              <button onClick={onConfirm} disabled={confirming} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${meta.buttonCls}`}>
                {confirming ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {tx(language, "Processing...", "Memproses...")}</> : <>{meta.icon} {meta.button}</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Company Detail Modal ───────────────────────────────────────────
function CompanyDetailModal({ company, data, loading, error, onClose }: { company: AdminGateCompany | null; data: AdminGateCompanyDetail | null; loading: boolean; error: string; onClose: () => void }) {
  const { language } = useLanguage();
  const formatDate = (d: string) => new Date(d).toLocaleDateString(language === "id" ? "id-ID" : "en-US");
  return (
    <AnimatePresence>
      {company && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-2xl overflow-hidden">
            <div className="flex items-start gap-4 px-6 pt-6">
              <div className="shrink-0 p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25"><Building2 size={22} /></div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white break-words">{company.name}</h3>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {entityStatusBadge(company.status, language)}
                  {data?.code && <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500">{tx(language, "Code: ", "Kode: ")}{data.code}</span>}
                </div>
              </div>
              <button onClick={onClose} className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition"><X size={16} /></button>
            </div>
            <div className="px-6 pt-5">
              {loading ? (
                <div className="py-14 flex justify-center"><div className={`animate-spin rounded-full h-7 w-7 border-b-2 ${ACCENT.spinner}`} /></div>
              ) : error ? (
                <div className="py-14 text-center"><XCircle size={36} className="mx-auto mb-3 opacity-40 text-rose-400" /><p className="text-sm text-gray-400 dark:text-gray-500">{error}</p></div>
              ) : data ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCell label={tx(language, "Currency", "Mata Uang")} value={data.currency} />
                    <InfoCell label={tx(language, "Created", "Dibuat")} value={formatDate(data.created_at)} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <StatCard icon={<Users size={15} />} label={tx(language, "User", "User")} value={data.total_users} />
                    <StatCard icon={<UserCheck size={15} />} label={tx(language, "Member", "Member")} value={data.total_members} />
                    <StatCard icon={<ListTree size={15} />} label={tx(language, "Account", "Akun")} value={data.total_accounts} />
                    <StatCard icon={<ScrollText size={15} />} label={tx(language, "Journal", "Jurnal")} value={data.total_journals} />
                  </div>
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-gray-50/70 dark:bg-white/[0.03] px-4 py-3.5">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">{tx(language, "Active Subscription", "Subscription Aktif")}</p>
                    {data.subscription ? (
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <CreditCard size={15} className="text-indigo-500" />
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{data.subscription.plan_name || "—"}</span>
                          <SubBadge status={data.subscription.status} />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {data.subscription.billing_cycle === "yearly" ? tx(language, "Yearly", "Tahunan") : tx(language, "Monthly", "Bulanan")}
                          {data.subscription.current_period_end ? ` · ${tx(language, "ends", "berakhir")} ${formatDate(data.subscription.current_period_end)}` : ""}
                        </span>
                      </div>
                    ) : <p className="text-sm text-gray-400 dark:text-gray-500">{tx(language, "No subscriptions yet.", "Belum ada subscription.")}</p>}
                  </div>
                </div>
              ) : <div className="py-14 text-center"><p className="text-sm text-gray-400 dark:text-gray-500">{tx(language, "No data.", "Tidak ada data.")}</p></div>}
            </div>
            <div className="flex items-center justify-end px-6 py-5 mt-5 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-white/5 transition">{tx(language, "Close", "Tutup")}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Shared UI ──────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-md overflow-hidden">{children}</div>;
}

function EmptyState({ error, text }: { error: string; text: string }) {
  return (
    <div className="py-16 text-center">
      {error ? <><XCircle size={40} className="mx-auto mb-3 opacity-40 text-rose-400" /><p className="text-gray-400 dark:text-gray-500 text-sm">{error}</p></> : <p className="text-gray-400 dark:text-gray-500 text-sm">{text}</p>}
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: "emerald" | "rose" | "amber" }) {
  const accentCls = accent === "emerald" ? "text-emerald-500" : accent === "rose" ? "text-rose-500" : accent === "amber" ? "text-amber-500" : "text-indigo-500";
  return (
    <div className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-sm px-4 py-3.5">
      <div className={`flex items-center gap-1.5 mb-1 ${accentCls}`}>
        {icon}
        <p className="text-[11px] font-medium uppercase tracking-wider opacity-80">{label}</p>
      </div>
      <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-gray-50/70 dark:bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-gray-800 dark:text-gray-200">{value}</p>
    </div>
  );
}

function entityStatusBadge(status?: "active" | "suspended", language?: "en" | "id") {
  if (status === "suspended") return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"><Ban size={10} /> Suspend</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"><CheckCircle2 size={10} /> {tx(language || "en", "Active", "Aktif")}</span>;
}
