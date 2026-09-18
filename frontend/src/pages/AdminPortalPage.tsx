import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  ShieldCheck,
  LogOut,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Ban,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Activity,
  Users,
  Building2,
  Trash2,
  ScrollText,
  AlertTriangle,
  X,
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
  BarChart3,
  FileText,
  UsersRound,
  Landmark,
  Coins,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
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
  fetchMonitoringSummary,
  fetchMonitoringFeatureLogs,
  fetchMonitoringRateLimitLogs,
  type MonitoringRange,
  type MonitoringSummary,
  type MonitoringFeatureLog,
  type MonitoringRateLimitLog,
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
import Spinner from "../components/Spinner";
import ThemeSwitcher from "../components/ThemeSwitcher";
import { useLanguage } from "../hooks/useLanguage";
import { tx } from "../i18n/tx";

type Tab = "overview" | "billing" | "log" | "monitoring" | "users" | "companies" | "plans" | "health";

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

const PAGE_SIZE = 5;

export default function AdminPortalPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [tab, setTab] = useState<Tab>("overview");
  // Sidebar bisa diciutkan jadi ikon saja (konten otomatis memanjang).
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("admin_sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });
  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem("admin_sidebar_collapsed", next ? "1" : "0");
      } catch {
        /* abaikan */
      }
      return next;
    });
  };

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
  const location = useLocation();
  // Mainkan animasi tirai hanya bila datang dari gate (flag sekali pakai).
  const [curtain] = useState(
    () => (location.state as { fromGate?: boolean } | null)?.fromGate === true,
  );
  useEffect(() => {
    if (curtain) window.history.replaceState({}, "");
  }, [curtain]);

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
    const map: Record<AdminGateLog["status"], { label: string; tone: BadgeTone }> = {
      success: { label: tx(language, "Success", "Berhasil"), tone: "emerald" },
      failed: { label: tx(language, "Failed", "Gagal"), tone: "rose" },
      blocked: { label: tx(language, "Blocked", "Diblokir"), tone: "amber" },
    };
    const m = map[status];
    return <Badge label={m.label} tone={m.tone} />;
  };

  // Sidebar desktop gaya solid fill: ikon flat putih, item aktif = pil putih.
  // Field `chip` dipertahankan karena masih dipakai nav mobile di bawah.
  const sidebarTabs: { key: Tab; icon: React.ReactNode; label: string; count?: number; chip: string }[] = [
    { key: "overview", icon: <BarChart3 size={13} />, label: tx(language, "Overview", "Ringkasan"), chip: "from-indigo-500 to-violet-500 text-indigo-500" },
    { key: "billing", icon: <CreditCard size={13} />, label: tx(language, "Billing", "Penagihan"), count: subscriptions.length, chip: "from-emerald-500 to-teal-500 text-emerald-500" },
    { key: "log", icon: <FileText size={13} />, label: tx(language, "Audit Log", "Log Audit"), count: logs.length, chip: "from-amber-500 to-orange-500 text-amber-500" },
    { key: "monitoring", icon: <Activity size={13} />, label: tx(language, "Monitoring", "Monitoring"), chip: "from-sky-500 to-indigo-500 text-sky-500" },
    { key: "users", icon: <UsersRound size={13} />, label: tx(language, "Users", "Pengguna"), count: users.length, chip: "from-cyan-500 to-sky-500 text-cyan-500" },
    { key: "companies", icon: <Landmark size={13} />, label: tx(language, "Companies", "Perusahaan"), count: companies.length, chip: "from-fuchsia-500 to-purple-500 text-fuchsia-500" },
    { key: "plans", icon: <Coins size={13} />, label: tx(language, "Plans", "Paket"), count: plans.length, chip: "from-rose-500 to-pink-500 text-rose-500" },
    { key: "health", icon: <ShieldCheck size={13} />, label: tx(language, "System Health", "Kesehatan Sistem"), chip: "from-lime-500 to-green-500 text-lime-600" },
  ];

  return (
    <MotionConfig reducedMotion="user">
    <div className="relative min-h-screen bg-gray-100 dark:bg-[#0B1120] transition-colors">
      {curtain && <CurtainReveal />}
      {/* Latar mesh lembut — memberi kedalaman tanpa garis batas; gradasi
          radial memudar alami ke warna dasar. */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_-10%,rgba(99,102,241,0.10),transparent_45%),radial-gradient(circle_at_88%_8%,rgba(139,92,246,0.08),transparent_40%),radial-gradient(circle_at_50%_115%,rgba(6,182,212,0.07),transparent_45%)] dark:opacity-100 opacity-70" />
      {/* Desktop: sidebar + konten menyatu dalam satu kartu — satu bayangan
          luar bersama, jadi tidak ada bayangan/garis yang menjorok di garis
          sambung. Pil indikator aktif bisa "tumbuh" dari kartu konten. */}
      <div className="relative hidden lg:flex h-screen p-4 gap-0">
        <div className="flex h-full flex-1 min-w-0 overflow-hidden rounded-3xl shadow-lg dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
        {/* Sidebar card */}
        <aside className={`${collapsed ? "w-[76px]" : "w-64"} shrink-0 h-full bg-indigo-600 dark:bg-indigo-900 overflow-hidden flex flex-col transition-[width] duration-300 ease-in-out`}>
          {/* Sidebar header — wordmark langsung di atas solid fill */}
          <div className="px-3 pt-3 pb-2">
            <div className={`flex items-center px-2.5 py-2 ${collapsed ? "justify-center gap-0 px-1" : "gap-2"}`}>
              <div className={`h-7 rounded-lg bg-white/15 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden transition-all duration-300 ${collapsed ? "w-0 opacity-0" : "w-7 opacity-100"}`}>
                <Terminal size={14} />
              </div>
              <div className={`min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100"}`}>
                <p className="text-xs font-semibold text-white truncate leading-tight">
                  LedgerFlow Ops
                </p>
                <p className="text-[10px] text-white/60 truncate leading-tight mt-0.5">
                  Internal Console
                </p>
              </div>
              <button
                onClick={toggleCollapsed}
                title={collapsed ? tx(language, "Expand sidebar", "Bentangkan sidebar") : tx(language, "Collapse sidebar", "Ciutkan sidebar")}
                className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
              </button>
            </div>
            <div className={`mx-2.5 mt-2 border-b border-white/15 overflow-hidden transition-all duration-300 ${collapsed ? "max-h-0 opacity-0 mt-0" : "max-h-2 opacity-100"}`} aria-hidden />
          </div>

          {/* Navigation — kompak tanpa scroll, ikon glass samar */}
          <nav className="flex-1 flex flex-col justify-center px-3 pt-1 pb-1 overflow-hidden">
            <p className={`px-3 text-[10px] font-semibold text-white/40 uppercase tracking-[0.15em] whitespace-nowrap overflow-hidden transition-all duration-300 ${collapsed ? "max-h-0 opacity-0 mb-0" : "max-h-6 opacity-100 mb-1"}`}>
              Panel
            </p>
            <div className="space-y-1">
              {sidebarTabs.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    title={collapsed ? t.label : undefined}
                    className={`group relative flex items-center gap-2 w-full px-2 py-2 text-[11px] rounded-xl transition-colors duration-300 ease-out text-left ${
                      collapsed ? "justify-center px-1.5" : ""
                    } ${
                      active
                        ? "text-indigo-700 dark:text-white font-semibold"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="admin-nav-pill"
                        className="absolute top-0 bottom-0 left-0 right-[-12px] rounded-l-xl bg-white dark:bg-[#111C33]"
                        transition={{ type: "spring", stiffness: 300, damping: 35 }}
                      >
                        {/* Fillet radius terbalik — lengkung TANGENT (halus,
                            tanpa sudut mati): lingkaran transparan di sudut luar
                            kotak, warna konten memenuhi sisanya. Fillet atas
                            melengkung dari bawah naik menyatu ke konten; fillet
                            bawah melengkung ke atas. Sebelumnya pakai
                            rounded-*-full yang menghasilkan blob dengan kinkan
                            90° di pertemuan garis — itu yang terasa salah. */}
                        {/* Fillet atas — kotak 12×12 nempel di ATAS pil, tepi
                            kanannya pas di garis batas sidebar→konten (ujung
                            kanan pil memang tepat di garis itu). Lingkaran
                            transparan berpusat di sudut kiri-atas kotak; warna
                            konten mengisi sisanya. Arc-nya TANGENT di kedua
                            ujung: menyatu mulus dengan tepi atas pil (horizontal)
                            lalu naik vertikal menyatu ke garis batas — dari sisi
                            konten terlihat seperti lengkung "tertarik dari bawah". */}
                        <span
                          aria-hidden
                          className="pointer-events-none absolute -top-3 right-0 h-3 w-3 [--fillet:#ffffff] dark:[--fillet:#111C33]"
                          style={{ background: "radial-gradient(circle 12px at 0 0, transparent 12px, var(--fillet) 12.5px)" }}
                        />
                        {/* Fillet bawah — cermin vertikalnya: transparan di sudut
                            kiri-bawah, warna konten melengkung NAIK dari bawah
                            menyatu ke tepi bawah pil. */}
                        <span
                          aria-hidden
                          className="pointer-events-none absolute -bottom-3 right-0 h-3 w-3 [--fillet:#ffffff] dark:[--fillet:#111C33]"
                          style={{ background: "radial-gradient(circle 12px at 0 100%, transparent 12px, var(--fillet) 12.5px)" }}
                        />
                      </motion.span>
                    )}
                    <span
                      className={`relative z-10 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors duration-300 ${
                        active
                          ? "text-indigo-700 dark:text-white"
                          : "bg-white/10 backdrop-blur-md ring-1 ring-white/20 text-white/80"
                      }`}
                    >
                      {t.icon}
                    </span>
                    <span className={`relative z-10 truncate whitespace-nowrap overflow-hidden transition-all duration-300 ${collapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"}`}>{t.label}</span>
                    {t.count !== undefined && (
                      <span className={`relative z-10 ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums whitespace-nowrap overflow-hidden transition-all duration-300 ${
                        active ? "bg-indigo-100 text-indigo-700 dark:bg-white/15 dark:text-white" : "bg-white/15 text-white/80"
                      } ${collapsed ? "max-w-0 opacity-0 !px-0 !ml-0" : ""}`}>
                        {t.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Sidebar footer: status + aksi ghost — proporsional, tanpa ruang kosong */}
          <div className="border-t border-white/15 py-3 px-3 space-y-2">
            <div className={`flex items-center gap-2.5 rounded-xl bg-white/[0.06] px-3 py-2.5 overflow-hidden whitespace-nowrap ${collapsed ? "justify-center !px-0 bg-transparent" : ""}`}>
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <p className={`text-xs font-semibold text-white/85 truncate overflow-hidden transition-all duration-300 ${collapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100"}`}>
                {refreshing
                  ? tx(language, "Syncing data…", "Menyinkronkan…")
                  : tx(language, "All systems operational", "Semua sistem normal")}
              </p>
            </div>
            <div className={`grid gap-2 ${collapsed ? "grid-cols-1" : "grid-cols-2"}`}>
              <button
                onClick={load}
                disabled={refreshing}
                title={tx(language, "Reload", "Muat")}
                className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-semibold rounded-xl border border-white/20 text-white/85 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={`shrink-0 ${refreshing ? "animate-spin" : ""}`} />
                <span className={`truncate overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? "max-w-0 opacity-0" : "max-w-[80px] opacity-100"}`}>
                  {tx(language, "Reload", "Muat")}
                </span>
              </button>
              <button
                onClick={handleLogout}
                title={tx(language, "Logout", "Keluar")}
                className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-semibold rounded-xl border border-rose-300/30 text-rose-200 hover:bg-rose-500/20 transition-colors"
              >
                <LogOut size={14} className="shrink-0" />
                <span className={`truncate overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? "max-w-0 opacity-0" : "max-w-[80px] opacity-100"}`}>
                  {tx(language, "Logout", "Keluar")}
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* Content card — solid per mode agar pil aktif bisa sama persis */}
        <div className="flex-1 h-full bg-white dark:bg-[#111C33] border border-gray-200/60 dark:border-white/[0.07] border-l-0 overflow-hidden flex flex-col min-w-0">
          {/* Content header strip */}
          <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3.5 border-b border-gray-100 dark:border-white/[0.06] bg-white/80 dark:bg-white/[0.03] backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-950/20 dark:shadow-indigo-950/50">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                  {tx(language, "Admin Portal", "Admin Portal")}
                </h1>
                <p className="text-xs text-gray-500">
                  {sidebarTabs.find((t) => t.key === tab)?.label || "Dashboard"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-600/20 dark:ring-indigo-500/30 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                <ShieldCheck size={12} />
                {tx(language, "Admin Only", "Khusus Admin")}
              </span>
              <button
                onClick={load}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors disabled:opacity-50"
                title={tx(language, "Reload data", "Muat ulang data")}
              >
                <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? tx(language, "Refreshing…", "Memuat…") : tx(language, "Refresh", "Segarkan")}
              </button>
            </div>
          </header>

          {/* Main scrollable area */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6 scrollbar-admin">
            {loading ? (
              <div className="py-20 flex justify-center">
                <Spinner size={9} />
              </div>
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
            {tab === "overview" ? (
              <OverviewView overview={overview} error={error} />
            ) : tab === "billing" ? (
              <BillingView subscriptions={subscriptions} payments={payments} error={error} />
            ) : tab === "log" ? (
              <AuditLogView statusBadge={statusBadge} stats={stats} error={error} />
            ) : tab === "monitoring" ? (
              <MonitoringView />
            ) : tab === "users" ? (
              <UsersView users={users} error={error} onDelete={requestDeleteUser} onSuspend={requestSuspendUser} onUnsuspend={requestUnsuspendUser} />
            ) : tab === "companies" ? (
              <CompaniesView companies={companies} error={error} onDelete={requestDeleteCompany} onSuspend={requestSuspendCompany} onUnsuspend={requestUnsuspendCompany} onView={openDetail} />
            ) : tab === "plans" ? (
              <PlansView plans={plans} setPlans={setPlans} error={error} />
            ) : (
              <SystemHealthView />
            )}
                </motion.div>
              </AnimatePresence>
            )}
          </main>
          </div>
        </div>
      </div>

      {/* Mobile: simple layout */}
      <div className="relative lg:hidden min-h-screen flex flex-col">
        <header className="border-b border-gray-200 dark:border-white/[0.06] bg-white/80 dark:bg-white/[0.03] backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                <ShieldCheck size={18} />
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{tx(language, "Admin Portal", "Admin Portal")}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} disabled={refreshing} title={tx(language, "Reload", "Muat Ulang")} className="flex items-center gap-1.5 px-2.5 min-[400px]:px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors disabled:opacity-50">
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                <span className="hidden min-[400px]:inline">{tx(language, "Reload", "Muat Ulang")}</span>
              </button>
              <button onClick={handleLogout} title={tx(language, "Logout", "Keluar")} className="flex items-center gap-1.5 px-2.5 min-[400px]:px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                <LogOut size={14} />
                <span className="hidden min-[400px]:inline">{tx(language, "Logout", "Keluar")}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 pb-28 space-y-6 scrollbar-admin">
          {loading ? (
            <div className="py-20 flex justify-center">
              <Spinner size={9} />
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
          {tab === "overview" ? (
            <OverviewView overview={overview} error={error} />
          ) : tab === "billing" ? (
            <BillingView subscriptions={subscriptions} payments={payments} error={error} />
          ) : tab === "log" ? (
            <AuditLogView statusBadge={statusBadge} stats={stats} error={error} />
          ) : tab === "monitoring" ? (
            <MonitoringView />
          ) : tab === "users" ? (
            <UsersView users={users} error={error} onDelete={requestDeleteUser} onSuspend={requestSuspendUser} onUnsuspend={requestUnsuspendUser} />
          ) : tab === "companies" ? (
            <CompaniesView companies={companies} error={error} onDelete={requestDeleteCompany} onSuspend={requestSuspendCompany} onUnsuspend={requestUnsuspendCompany} onView={openDetail} />
          ) : tab === "plans" ? (
            <PlansView plans={plans} setPlans={setPlans} error={error} />
          ) : (
            <SystemHealthView />
          )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        {/* Bottom nav mobile — ala owner/akuntan: ikon + label mikro */}
        <AdminBottomNav tab={tab} setTab={setTab} />
      </div>

      {/* Toggle tema melayang — khas portal admin (bukan di navbar) */}
      <ThemeSwitcher variant="floating" />

      {/* Modals */}
      <ConfirmActionModal confirm={confirm} confirming={confirming} onCancel={() => !confirming && setConfirm(null)} onConfirm={handleConfirmAction} />
      <CompanyDetailModal company={detailOpen} data={detailData} loading={detailLoading} error={detailError} onClose={closeDetail} />
    </div>
    </MotionConfig>
  );
}

// ── Bottom nav mobile ala owner/akuntan ──────────────────────────────
// Ikon di atas label mikro, pil indikator meluncur, bisa scroll horizontal
// karena 8 tab. Hanya tampil di bawah lg (desktop pakai sidebar).
const BOTTOM_TABS: { key: Tab; icon: React.ReactNode }[] = [
  { key: "overview", icon: <BarChart3 size={22} /> },
  { key: "billing", icon: <CreditCard size={22} /> },
  { key: "log", icon: <FileText size={22} /> },
  { key: "monitoring", icon: <Activity size={22} /> },
  { key: "users", icon: <UsersRound size={22} /> },
  { key: "companies", icon: <Landmark size={22} /> },
  { key: "plans", icon: <Coins size={22} /> },
  { key: "health", icon: <ShieldCheck size={22} /> },
];

const BOTTOM_VISIBLE_COUNT = 5;

function AdminBottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { language } = useLanguage();
  const [moreOpen, setMoreOpen] = useState(false);
  const short: Record<Tab, string> = {
    overview: tx(language, "Overview", "Ringkasan"),
    billing: tx(language, "Billing", "Billing"),
    log: tx(language, "Log", "Log"),
    monitoring: tx(language, "Monitor", "Monitor"),
    users: tx(language, "Users", "User"),
    companies: tx(language, "Companies", "Usaha"),
    plans: tx(language, "Plans", "Paket"),
    health: tx(language, "Health", "Sehat"),
  };
  const visible = BOTTOM_TABS.slice(0, BOTTOM_VISIBLE_COUNT);
  const hidden = BOTTOM_TABS.slice(BOTTOM_VISIBLE_COUNT);
  const moreActive = hidden.some((t) => t.key === tab);

  const renderItem = (t: { key: Tab; icon: React.ReactNode }, layoutId: string) => {
    const active = tab === t.key;
    return (
      <motion.button
        key={t.key}
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setTab(t.key);
          setMoreOpen(false);
        }}
        aria-label={short[t.key]}
        aria-current={active ? "page" : undefined}
        className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 pb-1 pt-2 outline-none transition-colors duration-200 ${
          active
            ? "text-indigo-600 dark:text-indigo-300"
            : "text-gray-400 dark:text-gray-500 active:text-indigo-500"
        }`}
      >
        {active && (
          <motion.span
            layoutId={layoutId}
            transition={{ type: "spring", stiffness: 300, damping: 35 }}
            className="absolute top-0 left-1/2 h-[3px] w-7 -translate-x-1/2 rounded-full bg-indigo-500"
          />
        )}
        <span className="flex items-center justify-center">
          {t.icon}
        </span>
        <span className={`text-[9px] leading-none whitespace-nowrap ${active ? "font-semibold" : "font-medium"}`}>
          {short[t.key]}
        </span>
      </motion.button>
    );
  };

  return (
    <>
      <nav
        aria-label={tx(language, "Admin navigation", "Navigasi admin")}
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      >
        <div className="border-t border-indigo-500/15 bg-white/85 dark:bg-[#0B1120]/85 backdrop-blur-xl shadow-[0_-8px_30px_rgba(2,6,23,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.45)]">
          <div className="flex px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {visible.map((t) => renderItem(t, "admin-bottomnav-pill"))}
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => setMoreOpen((v) => !v)}
              aria-label={tx(language, "More", "Lainnya")}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 pb-1 pt-2 outline-none transition-colors duration-200 ${
                moreActive || moreOpen
                  ? "text-indigo-600 dark:text-indigo-300"
                  : "text-gray-400 dark:text-gray-500 active:text-indigo-500"
              }`}
            >
              {(moreActive || moreOpen) && (
                <motion.span
                  layoutId="admin-bottomnav-pill"
                  transition={{ type: "spring", stiffness: 300, damping: 35 }}
                  className="absolute top-0 left-1/2 h-[3px] w-7 -translate-x-1/2 rounded-full bg-indigo-500"
                />
              )}
              <span className="flex h-[22px] w-[22px] items-center justify-center">
                <MoreHorizontal size={22} />
              </span>
              <span className={`text-[9px] leading-none whitespace-nowrap ${(moreActive || moreOpen) ? "font-semibold" : "font-medium"}`}>
                {tx(language, "More", "Lainnya")}
              </span>
            </motion.button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={() => setMoreOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white dark:bg-[#141b2e] border-t border-gray-200/70 dark:border-white/10 shadow-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 dark:bg-white/15" />
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                {tx(language, "More menus", "Menu lainnya")}
              </p>
              <div className="space-y-1">
                {hidden.map((t) => {
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setTab(t.key);
                        setMoreOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        active
                          ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 font-semibold"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <span className={active ? "text-indigo-600 dark:text-indigo-300" : "text-gray-400"}>
                        {t.icon}
                      </span>
                      {short[t.key]}
                      {active && <CheckCircle2 size={15} className="ml-auto text-indigo-500" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Tirai pembuka portal ─────────────────────────────────────────────
// Dua panel indigo terbelah dari tengah lalu meluncur keluar (kiri/kanan)
// seperti tirai teater. Hanya dipasang saat datang dari gate; unmount
// sendiri setelah selesai. Nonaktif bila reduced-motion.
function CurtainReveal() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setDone(true);
      return;
    }
    const t = setTimeout(() => setDone(true), 850);
    return () => clearTimeout(t);
  }, []);

  if (done) return null;

  const panel = "h-full w-1/2 bg-indigo-600 dark:bg-indigo-900";
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex" aria-hidden>
      <motion.div
        className={panel}
        initial={{ x: 0 }}
        animate={{ x: "-100%" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className={panel}
        initial={{ x: 0 }}
        animate={{ x: "100%" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
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
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Kartu Revenue (hero) ── satu-satunya gradient penuh yang
            layak: pusat visual Overview. Mesh gelap + ring halus. */}
        <div className="relative lg:col-span-2 overflow-hidden rounded-2xl bg-indigo-950 p-6 text-white ring-1 ring-indigo-400/20 shadow-xl shadow-indigo-950/40 min-h-[220px] flex flex-col justify-between">
          {/* Dekorasi: mesh + ring transparan, masked agar tak terpotong kasar */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_-10%,rgba(129,140,248,0.35),transparent_55%),radial-gradient(circle_at_10%_110%,rgba(6,182,212,0.18),transparent_50%)]" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border-[22px] border-white/[0.06]" />
          <div className="pointer-events-none absolute -right-6 -bottom-20 h-44 w-44 rounded-full border-[16px] border-white/[0.04]" />
          <div className="relative flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
              <Wallet size={15} />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-200/70">MRR</p>
          </div>
          <div className="relative mt-6">
            <p className="text-4xl sm:text-[2.6rem] leading-none font-bold tabular-nums tracking-tight">{formatRp(overview.mrr)}</p>
            <div className="mt-3.5 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium ring-1 ring-white/15">
                <Users size={11} /> {totalActives} {tx(language, "active subscriptions", "subscription aktif")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium ring-1 ring-white/15">
                <CreditCard size={11} /> {overview.plan_distribution.length} {tx(language, "plans", "plan")}
              </span>
            </div>
          </div>
        </div>
        <div className="lg:col-span-3 min-w-0">
          <PlanDistributionChart data={overview.plan_distribution} />
        </div>
      </div>
    </div>
  );
}

const PLAN_COLORS = ["#6366f1", "#818cf8", "#a5b4fc", "#8b5cf6", "#64748b", "#475569"];

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
  const totalUsers = data.reduce((s, p) => s + p.users, 0);

  return (
    <Card>
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{tx(language, "User Distribution per Plan", "Distribusi User per Plan")}</span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">{tx(language, "Based on active subscriptions", "Berdasarkan subscription aktif")}</span>
      </div>
      <div className="p-5">
        {data.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">{tx(language, "No active subscriptions yet.", "Belum ada subscription aktif.")}</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 items-center">
            {/* Donut + total di tengah */}
            <div className="relative">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={data} dataKey="users" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={4} cornerRadius={6} strokeWidth={2} stroke={isDark ? "#111827" : "#ffffff"}>
                    {data.map((_, i) => <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [`${value} user`, name as string]} contentStyle={{ background: isDark ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.95)", border: isDark ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(99,102,241,0.15)", borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">{totalUsers}</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">{tx(language, "Active users", "User aktif")}</p>
              </div>
            </div>

            {/* Daftar plan dengan bar persentase */}
            <div className="space-y-3.5">
              {data.map((p, i) => {
                const pct = totalUsers > 0 ? Math.round((p.users / totalUsers) * 100) : 0;
                const color = PLAN_COLORS[i % PLAN_COLORS.length];
                return (
                  <div key={p.name}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 capitalize truncate">{p.name}</span>
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums shrink-0">
                        {p.users} {tx(language, "users", "user")} · <span className="font-semibold text-gray-600 dark:text-gray-300">{pct}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{tx(language, "Payment & Subscription Data", "Data Pembayaran & Langganan")}</span>
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
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 dark:border-white/[0.06]">
                    <tr>{[tx(language, "User", "User"), tx(language, "Plan", "Paket"), tx(language, "Cycle", "Siklus"), tx(language, "Status", "Status"), tx(language, "Period Ends", "Periode Berakhir")].map((h) => <th key={h} className="text-left py-2.5 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-[0.14em]">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {subPagination.pageItems.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03]">
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

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-100 dark:divide-white/[0.05]">
                {subPagination.pageItems.map((s) => (
                  <div key={s.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{s.users?.name || "—"}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{s.users?.email || s.users?.phone || ""}</p>
                      </div>
                      <SubBadge status={s.status} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        {s.plans?.display_name || s.plans?.name || "—"} · {s.billing_cycle === "yearly" ? tx(language, "Yearly", "Tahunan") : tx(language, "Monthly", "Bulanan")}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 shrink-0">
                        {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString(language === "id" ? "id-ID" : "en-US") : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <TablePagination page={subPagination.page} totalPages={subPagination.totalPages} totalItems={subPagination.totalItems} startIndex={subPagination.startIndex} endIndex={subPagination.endIndex} canPrev={subPagination.canPrev} canNext={subPagination.canNext} onPrev={subPagination.prev} onNext={subPagination.next} onGoTo={subPagination.goTo} itemLabel="subscription" />
            </>
          )
        ) : payments.length === 0 ? <EmptyState error={error} text={tx(language, "No payments yet.", "Belum ada pembayaran.")} /> : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 dark:border-white/[0.06]">
                  <tr>{[tx(language, "Order ID", "Order ID"), tx(language, "User", "User"), tx(language, "Amount", "Jumlah"), tx(language, "Status", "Status"), tx(language, "Time", "Waktu")].map((h) => <th key={h} className="text-left py-2.5 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-[0.14em]">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {payPagination.pageItems.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03]">
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

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-100 dark:divide-white/[0.05]">
              {payPagination.pageItems.map((p) => (
                <div key={p.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.users?.name || "—"}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{p.users?.email || p.users?.phone || ""}</p>
                      <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{p.order_id}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 tabular-nums">{formatRp(p.amount, p.currency)}</p>
                      <div className="mt-1"><PayBadge status={p.status} /></div>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">{new Date(p.paid_at || p.created_at).toLocaleString(language === "id" ? "id-ID" : "en-US")}</p>
                </div>
              ))}
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
  const map: Record<string, { label: string; tone: BadgeTone }> = {
    active: { label: tx(language, "Active", "Aktif"), tone: "emerald" },
    trialing: { label: "Trial", tone: "indigo" },
    past_due: { label: tx(language, "Overdue", "Tunggakan"), tone: "rose" },
    canceled: { label: tx(language, "Canceled", "Dibatalkan"), tone: "slate" },
    expired: { label: tx(language, "Expired", "Kedaluwarsa"), tone: "slate" },
  };
  const m = map[status] || map.canceled;
  return <Badge label={m.label} tone={m.tone} />;
}

function PayBadge({ status }: { status: string }) {
  const { language } = useLanguage();
  const map: Record<string, { label: string; tone: BadgeTone }> = {
    paid: { label: tx(language, "Paid", "Lunas"), tone: "emerald" },
    pending: { label: tx(language, "Pending", "Menunggu"), tone: "amber" },
    failed: { label: tx(language, "Failed", "Gagal"), tone: "rose" },
    expired: { label: tx(language, "Expired", "Kedaluwarsa"), tone: "slate" },
    refunded: { label: "Refund", tone: "violet" },
  };
  const m = map[status] || map.expired;
  return <Badge label={m.label} tone={m.tone} />;
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
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{tx(language, "Gateway Login Attempt History", "Riwayat Percobaan Login Gerbang")}</span>
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
            accent="indigo"
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
            <button onClick={resetFilters} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition">
              <X size={14} /> {tx(language, "Reset", "Reset")}
            </button>
          )}
        </div>
        {loading ? (
          <div className="py-12 flex justify-center"><Spinner /></div>
        ) : logs.length === 0 ? (
          <EmptyState error={fetchError || error} text={query || statusFilter ? tx(language, "No matching records.", "Tidak ada catatan yang cocok.") : tx(language, "No recorded attempts yet.", "Belum ada percobaan tercatat.")} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 dark:border-white/[0.06]"><tr>{[tx(language, "Time", "Waktu"), "IP", tx(language, "Status", "Status")].map((h) => <th key={h} className="text-left py-2.5 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-[0.14em]">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {pagination.pageItems.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">{new Date(log.created_at).toLocaleString(language === "id" ? "id-ID" : "en-US")}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">{log.ip}</td>
                      <td className="px-4 py-2.5">{statusBadge(log.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-100 dark:divide-white/[0.05]">
              {pagination.pageItems.map((log) => (
                <div key={log.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-gray-600 dark:text-gray-300 break-all">{log.ip}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(log.created_at).toLocaleString(language === "id" ? "id-ID" : "en-US")}</p>
                    </div>
                    <span className="shrink-0">{statusBadge(log.status)}</span>
                  </div>
                </div>
              ))}
            </div>
            <TablePagination page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} startIndex={pagination.startIndex} endIndex={pagination.endIndex} canPrev={pagination.canPrev} canNext={pagination.canNext} onPrev={pagination.prev} onNext={pagination.next} onGoTo={pagination.goTo} itemLabel="percobaan" />
          </>
        )}
      </Card>
    </div>
  );
}

// ── Users ──────────────────────────────────────────────────────────
function UsersView({ users, error, onDelete, onSuspend, onUnsuspend }: { users: AdminGateUser[]; error: string; onDelete: (u: AdminGateUser) => void; onSuspend: (u: AdminGateUser) => void; onUnsuspend: (u: AdminGateUser) => void }) {
  const { language } = useLanguage();
  const pagination = usePagination(users, PAGE_SIZE);
  return (
    <Card>
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{tx(language, "All Users (cross-company)", "Semua User (lintas company)")}</span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">{tx(language, "Moderation: suspend or delete", "Moderasi: suspend atau hapus")}</span>
      </div>
      {users.length === 0 ? <EmptyState error={error} text={tx(language, "No users yet.", "Belum ada user.")} /> : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 dark:border-white/[0.06]"><tr>{[tx(language, "Name", "Nama"), "Email / No. HP", tx(language, "Company", "Company"), tx(language, "Role", "Role"), tx(language, "Status", "Status"), tx(language, "Actions", "Aksi")].map((h) => <th key={h} className="text-left py-2.5 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-[0.14em]">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {pagination.pageItems.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} size="sm" />
                        <span className="font-medium text-gray-800 dark:text-gray-200">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{u.email || u.phone || "—"}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{u.companies?.name || "—"}</td>
                    <td className="px-4 py-2.5"><Badge label={u.role} tone={u.role === "owner" ? "violet" : "indigo"} /></td>
                    <td className="px-4 py-2.5">{entityStatusBadge(u.status, language)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {u.status === "suspended" ? (
                          <button onClick={() => onUnsuspend(u)} title={tx(language, "Reactivate", "Aktifkan kembali")} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition"><RotateCcw size={14} /></button>
                        ) : (
                          <button onClick={() => onSuspend(u)} title={tx(language, "Suspend", "Suspend")} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 transition"><Ban size={14} /></button>
                        )}
                        <button onClick={() => onDelete(u)} title={tx(language, "Delete permanently", "Hapus permanen")} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 transition"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100 dark:divide-white/[0.05]">
            {pagination.pageItems.map((u) => (
              <div key={u.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <Avatar name={u.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{u.name}</p>
                      <p className="font-mono text-[11px] text-gray-400 dark:text-gray-500 truncate">{u.email || u.phone || "—"}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{u.companies?.name || "—"}</p>
                    </div>
                  </div>
                  {entityStatusBadge(u.status, language)}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Badge label={u.role} tone={u.role === "owner" ? "violet" : "indigo"} />
                  <div className="flex items-center gap-1">
                    {u.status === "suspended" ? (
                      <button onClick={() => onUnsuspend(u)} title={tx(language, "Reactivate", "Aktifkan kembali")} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition"><RotateCcw size={14} /></button>
                    ) : (
                      <button onClick={() => onSuspend(u)} title={tx(language, "Suspend", "Suspend")} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 transition"><Ban size={14} /></button>
                    )}
                    <button onClick={() => onDelete(u)} title={tx(language, "Delete permanently", "Hapus permanen")} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 transition"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
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
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{tx(language, "All Companies", "Semua Company")}</span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">{tx(language, "Moderation: suspend or delete", "Moderasi: suspend atau hapus")}</span>
      </div>
      {companies.length === 0 ? <EmptyState error={error} text={tx(language, "No companies yet.", "Belum ada company.")} /> : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 dark:border-white/[0.06]"><tr>{[tx(language, "Name", "Nama"), tx(language, "Currency", "Mata Uang"), tx(language, "Created", "Dibuat"), tx(language, "Status", "Status"), tx(language, "Actions", "Aksi")].map((h) => <th key={h} className="text-left py-2.5 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-[0.14em]">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {pagination.pageItems.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03]">
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

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100 dark:divide-white/[0.05]">
            {pagination.pageItems.map((c) => (
              <div key={c.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {c.currency} · {new Date(c.created_at).toLocaleDateString(language === "id" ? "id-ID" : "en-US")}
                    </p>
                  </div>
                  {entityStatusBadge(c.status, language)}
                </div>
                <div className="mt-2 flex items-center justify-end gap-1">
                  <button onClick={() => onView(c)} title={tx(language, "View detail", "Lihat detail")} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"><Eye size={14} /></button>
                  {c.status === "suspended" ? (
                    <button onClick={() => onUnsuspend(c)} title={tx(language, "Activate", "Aktifkan")} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"><RotateCcw size={14} /></button>
                  ) : (
                    <button onClick={() => onSuspend(c)} title={tx(language, "Suspend", "Suspend")} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"><Ban size={14} /></button>
                  )}
                  <button onClick={() => onDelete(c)} title={tx(language, "Delete permanently", "Hapus permanen")} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
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
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{tx(language, "Subscription Plan List", "Daftar Plan Langganan")}</span>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">
            <Plus size={14} /> {tx(language, "Add Plan", "Tambah Plan")}
          </button>
        </div>
        {plans.length === 0 ? <EmptyState error={error} text={tx(language, "No plans yet.", "Belum ada plan.")} /> : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 dark:border-white/[0.06]">
                  <tr>{[tx(language, "Name", "Nama"), tx(language, "Monthly Price", "Harga Bulanan"), tx(language, "Yearly Price", "Harga Tahunan"), tx(language, "Max Companies", "Max perusahaan"), tx(language, "Max Journals", "Max jurnal"), tx(language, "Status", "Status"), tx(language, "Actions", "Aksi")].map((h) => <th key={h} className="text-left py-2.5 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-[0.14em]">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {pagination.pageItems.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03]">
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

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-100 dark:divide-white/[0.05]">
              {pagination.pageItems.map((p) => (
                <div key={p.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.display_name || p.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate">{p.name}</p>
                    </div>
                    {p.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 shrink-0"><Power size={10} /> {tx(language, "Active", "Aktif")}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400 shrink-0"><PowerOff size={10} /> {tx(language, "Inactive", "Nonaktif")}</span>
                    )}
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="tabular-nums truncate">{tx(language, "Monthly:", "Bulanan:")} {formatRp(p.price_monthly)}</span>
                    <span className="tabular-nums truncate">{tx(language, "Yearly:", "Tahunan:")} {formatRp(p.price_yearly)}</span>
                    <span>{tx(language, "Companies:", "Company:")} {p.max_companies}</span>
                    <span>{tx(language, "Journals:", "Jurnal:")} {p.max_journals}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(p)} title={tx(language, "Edit", "Edit")} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"><Pencil size={14} /></button>
                    {p.is_active && (
                      <button onClick={() => handleDeactivate(p)} title={tx(language, "Deactivate", "Nonaktifkan")} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"><PowerOff size={14} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <TablePagination page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} startIndex={pagination.startIndex} endIndex={pagination.endIndex} canPrev={pagination.canPrev} canNext={pagination.canNext} onPrev={pagination.prev} onNext={pagination.next} onGoTo={pagination.goTo} itemLabel="plan" />
          </>
        )}
      </Card>

      {/* Modal create/edit plan */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !submitting && setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white dark:bg-[#141b2e] rounded-2xl border border-gray-200/70 dark:border-white/10 shadow-2xl dark:shadow-black/50 overflow-hidden">
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
              <div className="flex items-center justify-end gap-3 px-6 py-5 bg-gray-50/60 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/[0.06]">
                <button onClick={() => setShowModal(false)} disabled={submitting} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-white/5 transition disabled:opacity-40">{tx(language, "Cancel", "Batal")}</button>
                <button onClick={handleSubmit} disabled={submitting} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${ACCENT.btn}`}>
                  {submitting ? <><Spinner size={4} colorClass="bg-white" /> {tx(language, "Saving...", "Menyimpan...")}</> : editingPlan ? tx(language, "Save Changes", "Simpan Perubahan") : tx(language, "Create Plan", "Buat Plan")}
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
    { key: "smtp", label: "SMTP (Email)", icon: <Mail size={18} />, status: smtp, loading: !!loading.smtp, check: () => checkOne("smtp", () => checkSmtpHealth(true), setSmtp) },
    { key: "whatsapp", label: "WhatsApp / Fonnte", icon: <MessageSquare size={18} />, status: whatsapp, loading: !!loading.whatsapp, check: () => checkOne("whatsapp", () => checkWhatsAppHealth(true), setWhatsapp) },
    { key: "database", label: "Database (Supabase)", icon: <Database size={18} />, status: database, loading: !!loading.database, check: () => checkOne("database", () => checkDatabaseHealth(true), setDatabase) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{tx(language, "System Health", "System Health")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{tx(language, "Real-time system component status", "Status komponen sistem secara real-time")}</p>
        </div>
        <button onClick={checkAll} disabled={Object.values(loading).some(Boolean)} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors disabled:opacity-50">
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
                {item.status !== null && !item.loading && (
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${item.status.ok ? "bg-emerald-400" : "bg-rose-400"}`} />
                    <span className={`relative inline-flex h-3 w-3 rounded-full ${item.status.ok ? "bg-emerald-500" : "bg-rose-500"}`} />
                  </span>
                )}
              </div>
              {item.status && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{item.status.message}</p>
              )}
              <button onClick={item.check} disabled={item.loading} className="w-full px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors disabled:opacity-50">
                {item.loading ? tx(language, "Testing...", "Menguji...") : tx(language, "Test Again", "Test Ulang")}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Monitoring akses fitur premium ────────────────────────────────────
// Self-fetching seperti SystemHealthView: ringkasan + 2 tabel log (fitur &
// rate-limit) dengan filter dan pagination server-side.
const MONITOR_FEATURES = [
  "income_statement",
  "balance_sheet",
  "cash_flow",
  "export_pdf",
  "export_csv",
  "unlimited_journals",
  "multi_company",
  "multi_user",
  "api_access",
];
const MONITOR_PAGE_SIZE = 20;

// Ubah snake_case jadi label rapi: income_statement -> Income Statement.
function humanizeFeature(value: string): string {
  return value
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function MonitoringView() {
  const { language } = useLanguage();
  const [range, setRange] = useState<MonitoringRange>("24h");
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [sumLoading, setSumLoading] = useState(true);
  const [sumError, setSumError] = useState("");

  const [featFilter, setFeatFilter] = useState("");
  const [grantedFilter, setGrantedFilter] = useState<"" | "true" | "false">("");
  const [featSearch, setFeatSearch] = useState("");
  const [featPage, setFeatPage] = useState(1);
  const [featLogs, setFeatLogs] = useState<MonitoringFeatureLog[]>([]);
  const [featLoading, setFeatLoading] = useState(false);
  const [featError, setFeatError] = useState("");

  const [rlSearch, setRlSearch] = useState("");
  const [rlPage, setRlPage] = useState(1);
  const [rlLogs, setRlLogs] = useState<MonitoringRateLimitLog[]>([]);
  const [rlLoading, setRlLoading] = useState(false);
  const [rlError, setRlError] = useState("");

  const loadSummary = useCallback(async (r: MonitoringRange) => {
    setSumLoading(true);
    setSumError("");
    try {
      setSummary(await fetchMonitoringSummary(r));
    } catch (err) {
      setSumError(getErrorMessage(err));
    } finally {
      setSumLoading(false);
    }
  }, []);

  const loadFeatLogs = useCallback(async (page: number) => {
    setFeatLoading(true);
    setFeatError("");
    try {
      const res = await fetchMonitoringFeatureLogs({
        feature: featFilter || undefined,
        granted: grantedFilter === "" ? undefined : grantedFilter === "true",
        search: featSearch.trim() || undefined,
        limit: MONITOR_PAGE_SIZE,
        page,
      });
      setFeatLogs(res.data);
      setFeatPage(res.page);
    } catch (err) {
      setFeatError(getErrorMessage(err));
    } finally {
      setFeatLoading(false);
    }
  }, [featFilter, grantedFilter, featSearch]);

  const loadRlLogs = useCallback(async (page: number) => {
    setRlLoading(true);
    setRlError("");
    try {
      const res = await fetchMonitoringRateLimitLogs({
        search: rlSearch.trim() || undefined,
        limit: MONITOR_PAGE_SIZE,
        page,
      });
      setRlLogs(res.data);
      setRlPage(res.page);
    } catch (err) {
      setRlError(getErrorMessage(err));
    } finally {
      setRlLoading(false);
    }
  }, [rlSearch]);

  useEffect(() => { loadSummary(range); }, [range, loadSummary]);
  useEffect(() => { loadFeatLogs(1); }, [loadFeatLogs]);
  useEffect(() => { loadRlLogs(1); }, [loadRlLogs]);

  const fmtTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(language === "id" ? "id-ID" : "en-US", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const ranges: MonitoringRange[] = ["24h", "7d", "30d"];
  const topFeatTotal = (summary?.top_features ?? []).reduce((s, f) => s + f.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{tx(language, "Feature Monitoring", "Monitoring Fitur")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{tx(language, "Premium feature access & rate-limit activity", "Aktivitas akses fitur premium & rate-limit")}</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-gray-200 dark:border-white/10 p-1">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${range === r ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}
            >
              {r === "24h" ? tx(language, "24h", "24 jam") : r === "7d" ? tx(language, "7d", "7 hari") : tx(language, "30d", "30 hari")}
            </button>
          ))}
        </div>
      </div>

      {sumLoading ? (
        <div className="py-16 flex justify-center"><Spinner size={9} /></div>
      ) : !summary ? (
        <EmptyState error={sumError} text={tx(language, "No monitoring data yet.", "Belum ada data monitoring.")} />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={<Activity size={15} />} label={tx(language, "Feature Access", "Akses Fitur")} value={summary.totals.access} />
            <StatCard icon={<XCircle size={15} />} label={tx(language, "Denied", "Ditolak")} value={summary.totals.denied} accent="rose" />
            <StatCard icon={<AlertTriangle size={15} />} label={tx(language, "Rate-limit Events", "Event Rate-limit")} value={summary.totals.rate_limit_events} accent="amber" />
            <StatCard icon={<Ban size={15} />} label={tx(language, "Blocked IPs", "IP Diblokir")} value={summary.totals.blocked_ips} accent="emerald" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02]">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{tx(language, "Top Features", "Fitur Teratas")}</span>
              </div>
              <div className="p-5 space-y-3.5">
                {summary.top_features.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">{tx(language, "No access yet in this range.", "Belum ada akses pada rentang ini.")}</p>
                ) : (
                  summary.top_features.map((f) => {
                    const pct = topFeatTotal > 0 ? Math.round((f.count / topFeatTotal) * 100) : 0;
                    return (
                      <div key={f.feature}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{humanizeFeature(f.feature)}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums shrink-0">{f.count} · <span className="font-semibold text-gray-600 dark:text-gray-300">{pct}%</span></span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-700" style={{ width: `${Math.max(pct, 3)}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            <Card>
              <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{tx(language, "Most Active Users", "User Paling Aktif")}</span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500">{tx(language, "Peak hours", "Jam tersibuk")}: {(summary.peak_hours ?? []).map((p) => `${String(p.hour).padStart(2, "0")}:00`).join(", ") || "—"}</span>
              </div>
              <div className="p-5 space-y-3">
                {(summary.top_users ?? []).length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">{tx(language, "No active users in this range.", "Belum ada user aktif pada rentang ini.")}</p>
                ) : (
                  summary.top_users.map((u) => (
                    <div key={u.user_id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 dark:border-white/[0.06] px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{u.email || u.user_id.slice(0, 8)}</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{u.email ? u.user_id.slice(0, 8) : tx(language, "no email", "tanpa email")}</p>
                      </div>
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-300 tabular-nums shrink-0">{u.count}×</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      <Card>
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 mr-auto">{tx(language, "Feature Access Logs", "Log Akses Fitur")}</span>
          <HoverDropdown
            value={featFilter}
            onChange={setFeatFilter}
            accent="indigo"
            minWidth={170}
            labelRenderer={(v) =>
              v ? humanizeFeature(v) : tx(language, "All features", "Semua fitur")
            }
            options={[
              { value: "", label: tx(language, "All features", "Semua fitur") },
              ...MONITOR_FEATURES.map((f) => ({ value: f, label: humanizeFeature(f) })),
            ]}
          />
          <HoverDropdown
            value={grantedFilter}
            onChange={(v) => setGrantedFilter(v as "" | "true" | "false")}
            accent="indigo"
            minWidth={150}
            options={[
              { value: "", label: tx(language, "Granted + denied", "Diizinkan + ditolak") },
              { value: "true", label: tx(language, "Granted", "Diizinkan") },
              { value: "false", label: tx(language, "Denied", "Ditolak") },
            ]}
          />
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={featSearch} onChange={(e) => setFeatSearch(e.target.value)} placeholder={tx(language, "Search email / IP / feature…", "Cari email / IP / fitur…")} className="text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 pl-8 pr-2.5 py-1.5 text-gray-700 dark:text-gray-200 outline-none w-52" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead>
              <tr className="text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3 font-semibold">{tx(language, "Time", "Waktu")}</th>
                <th className="px-3 py-3 font-semibold">{tx(language, "Feature", "Fitur")}</th>
                <th className="px-3 py-3 font-semibold">{tx(language, "User", "User")}</th>
                <th className="px-3 py-3 font-semibold">{tx(language, "Plan", "Paket")}</th>
                <th className="px-3 py-3 font-semibold">{tx(language, "Status", "Status")}</th>
                <th className="px-3 py-3 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody>
              {featLoading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center"><Spinner size={6} /></td></tr>
              ) : featError ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-rose-500 text-sm">{featError}</td></tr>
              ) : featLogs.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500">{tx(language, "No logs found.", "Tidak ada log.")}</td></tr>
              ) : (
                featLogs.map((l) => (
                  <tr key={l.id} className="border-t border-gray-100 dark:border-white/[0.05] hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                    <td className="px-5 py-2.5 text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">{fmtTime(l.created_at)}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-700 dark:text-gray-200">{humanizeFeature(l.feature)}</td>
                    <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 truncate max-w-[180px]">{l.user_email || l.user_id.slice(0, 8)}</td>
                    <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 capitalize">{l.plan_at_access}</td>
                    <td className="px-3 py-2.5"><Badge label={l.granted ? tx(language, "Granted", "Diizinkan") : tx(language, "Denied", "Ditolak")} tone={l.granted ? "emerald" : "rose"} dot={false} /></td>
                    <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 tabular-nums">{l.ip_address}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 dark:border-white/[0.06]">
          <button onClick={() => loadFeatLogs(Math.max(featPage - 1, 1))} disabled={featPage <= 1 || featLoading} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-white/5">←</button>
          <span className="text-xs text-gray-400 tabular-nums">{tx(language, "Page", "Halaman")} {featPage}</span>
          <button onClick={() => loadFeatLogs(featPage + 1)} disabled={featLogs.length < MONITOR_PAGE_SIZE || featLoading} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-white/5">→</button>
        </div>
      </Card>

      <Card>
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 mr-auto">{tx(language, "Rate-limit Logs", "Log Rate-limit")}</span>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={rlSearch} onChange={(e) => setRlSearch(e.target.value)} placeholder={tx(language, "Search IP / path…", "Cari IP / path…")} className="text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 pl-8 pr-2.5 py-1.5 text-gray-700 dark:text-gray-200 outline-none w-52" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead>
              <tr className="text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3 font-semibold">{tx(language, "Time", "Waktu")}</th>
                <th className="px-3 py-3 font-semibold">IP</th>
                <th className="px-3 py-3 font-semibold">{tx(language, "Path", "Path")}</th>
                <th className="px-3 py-3 font-semibold">{tx(language, "Reason", "Alasan")}</th>
              </tr>
            </thead>
            <tbody>
              {rlLoading ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center"><Spinner size={6} /></td></tr>
              ) : rlError ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-rose-500 text-sm">{rlError}</td></tr>
              ) : rlLogs.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500">{tx(language, "No rate-limit events.", "Tidak ada event rate-limit.")}</td></tr>
              ) : (
                rlLogs.map((l) => (
                  <tr key={l.id} className="border-t border-gray-100 dark:border-white/[0.05] hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                    <td className="px-5 py-2.5 text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">{fmtTime(l.created_at)}</td>
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-200 tabular-nums">{l.ip_address}</td>
                    <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 truncate max-w-[260px]">{l.request_path}</td>
                    <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{l.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 dark:border-white/[0.06]">
          <button onClick={() => loadRlLogs(Math.max(rlPage - 1, 1))} disabled={rlPage <= 1 || rlLoading} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-white/5">←</button>
          <span className="text-xs text-gray-400 tabular-nums">{tx(language, "Page", "Halaman")} {rlPage}</span>
          <button onClick={() => loadRlLogs(rlPage + 1)} disabled={rlLogs.length < MONITOR_PAGE_SIZE || rlLoading} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-white/5">→</button>
        </div>
      </Card>
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
    ? { icon: <AlertTriangle size={22} />, iconBox: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-600/20 dark:ring-rose-500/25", title: `${tx(language, "Delete", "Hapus")} ${isUser ? "User" : "Company"}?`, body: isUser ? <><span className="font-medium text-gray-700 dark:text-gray-300">{name}</span>{detail && <span className="text-gray-400 dark:text-gray-500"> ({detail})</span>} {tx(language, "will be", "akan")} <span className="font-semibold text-rose-600 dark:text-rose-400">{tx(language, "permanently deleted", "dihapus permanen")}</span>.</> : <><span className="font-medium text-gray-700 dark:text-gray-300">{name}</span> {tx(language, "will be", "akan")} <span className="font-semibold text-rose-600 dark:text-rose-400">{tx(language, "permanently deleted", "dihapus permanen")}</span> {tx(language, "along with its data", "beserta datanya")}.</>, button: tx(language, "Yes, Delete", "Ya, Hapus"), buttonCls: "bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/25" }
    : isSuspend
      ? { icon: <Ban size={22} />, iconBox: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-600/20 dark:ring-amber-500/25", title: `${tx(language, "Suspend", "Suspend")} ${isUser ? "User" : "Company"}?`, body: <><span className="font-medium text-gray-700 dark:text-gray-300">{name}</span> {tx(language, "will be temporarily deactivated.", "akan dinonaktifkan sementara.")} <span className="font-semibold text-amber-600 dark:text-amber-400">{tx(language, "Data is not deleted.", "Data tidak dihapus.")}</span></>, button: tx(language, "Yes, Suspend", "Ya, Suspend"), buttonCls: "bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/25" }
      : isUnsuspend
        ? { icon: <CheckCircle2 size={22} />, iconBox: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-600/20 dark:ring-emerald-500/25", title: `${tx(language, "Reactivate", "Aktifkan Kembali")} ${isUser ? "User" : "Company"}?`, body: <><span className="font-medium text-gray-700 dark:text-gray-300">{name}</span> {tx(language, "will be reactivated.", "akan diaktifkan kembali.")}</>, button: tx(language, "Yes, Activate", "Ya, Aktifkan"), buttonCls: "bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/25" }
        : null;

  return (
    <AnimatePresence>
      {confirm && meta && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white dark:bg-[#141b2e] rounded-2xl border border-gray-200/70 dark:border-white/10 shadow-2xl dark:shadow-black/50 overflow-hidden">
            <div className="flex items-start gap-4 px-6 pt-6">
              <div className={`shrink-0 p-3 rounded-2xl ${meta.iconBox}`}>{meta.icon}</div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{meta.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">{meta.body}</p>
              </div>
              <button onClick={onCancel} disabled={confirming} className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition disabled:opacity-40"><X size={16} /></button>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-5 mt-4 bg-gray-50/60 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/[0.06]">
              <button onClick={onCancel} disabled={confirming} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-white/5 transition disabled:opacity-40">{tx(language, "Cancel", "Batal")}</button>
              <button onClick={onConfirm} disabled={confirming} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${meta.buttonCls}`}>
                {confirming ? <><Spinner size={4} colorClass="bg-white" /> {tx(language, "Processing...", "Memproses...")}</> : <>{meta.icon} {meta.button}</>}
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
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-white dark:bg-[#141b2e] rounded-2xl border border-gray-200/70 dark:border-white/10 shadow-2xl dark:shadow-black/50 overflow-hidden">
            <div className="flex items-start gap-4 px-6 pt-6">
              <div className="shrink-0 p-3 rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-950/40"><Building2 size={22} /></div>
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
                <div className="py-14 flex justify-center"><Spinner size={8} /></div>
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
            <div className="flex items-center justify-end px-6 py-5 mt-5 bg-gray-50/60 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/[0.06]">
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
  return <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200/70 dark:border-white/5 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] overflow-hidden">{children}</div>;
}

function EmptyState({ error, text }: { error: string; text: string }) {
  return (
    <div className="py-20 text-center">
      {error ? (
        <><div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/20 flex items-center justify-center mb-4"><XCircle size={26} className="text-rose-400" /></div><p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs mx-auto">{error}</p></>
      ) : (
        <><div className="mx-auto w-14 h-14 rounded-2xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center mb-4"><Activity size={26} className="text-gray-500" /></div><p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs mx-auto">{text}</p></>
      )}
    </div>
  );
}

// Badge kecil: dot + label, bg very subtle. Satu sistem untuk semua status
// (user/company/sub/payment/plan/role) — bukan blok warna penuh yang ramai.
type BadgeTone = "indigo" | "emerald" | "amber" | "rose" | "slate" | "violet";
function Badge({ label, tone = "slate", dot = true }: { label: string; tone?: BadgeTone; dot?: boolean }) {
  const map: Record<BadgeTone, string> = {
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30",
    amber: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30",
    rose: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/30",
    violet: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30",
    slate: "bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-white/5 dark:text-gray-400 dark:ring-white/10",
  };
  const dotMap: Record<BadgeTone, string> = {
    indigo: "bg-indigo-400",
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    rose: "bg-rose-400",
    violet: "bg-violet-400",
    slate: "bg-gray-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${map[tone]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotMap[tone]}`} />}
      {label}
    </span>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: "emerald" | "rose" | "amber" }) {
  // Accent hanya via warna chip icon (semantic), bukan garis gradient penuh.
  const chip = accent === "emerald"
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : accent === "rose"
      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
      : accent === "amber"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300";
  const numColor = accent === "emerald"
    ? "text-emerald-600 dark:text-emerald-400"
    : accent === "rose"
      ? "text-rose-600 dark:text-rose-400"
      : accent === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : "text-gray-900 dark:text-gray-100";
  return (
    <div className="group relative rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200/70 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 px-4 py-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/30 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.10),transparent_70%)]" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2.5">
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${chip}`}>{icon}</span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">{label}</p>
        </div>
        <p className={`text-[1.7rem] leading-none font-bold tabular-nums ${numColor}`}>{value}</p>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200/70 dark:border-white/5 bg-gray-50/70 dark:bg-white/[0.02] px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-gray-800 dark:text-gray-200">{value}</p>
    </div>
  );
}

// Avatar inisial deterministik dari nama — 5 rona redup (bukan pelangi
// cerah) agar terlihat seperti produk matang: indigo/violet/slate/cyan/emerald.
const AVATAR_TONES = [
  "bg-indigo-500/15 text-indigo-400",
  "bg-violet-500/15 text-violet-300",
  "bg-cyan-500/15 text-cyan-400",
  "bg-emerald-500/15 text-emerald-400",
  "bg-slate-500/15 text-slate-300",
] as const;
function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const tone = AVATAR_TONES[hash % AVATAR_TONES.length];
  const box = size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${box} ${tone}`}>
      {initials}
    </span>
  );
}

function entityStatusBadge(status?: "active" | "suspended", language?: "en" | "id") {
  if (status === "suspended") return <Badge label={tx(language || "en", "Suspended", "Ditangguhkan")} tone="amber" />;
  return <Badge label={tx(language || "en", "Active", "Aktif")} tone="emerald" />;
}
