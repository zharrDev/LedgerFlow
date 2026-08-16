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
} from "lucide-react";
import {
  fetchAdminGateLogs,
  fetchAdminGateUsers,
  fetchAdminGateCompanies,
  deleteAdminGateUser,
  deleteAdminGateCompany,
  logoutAdminGate,
  type AdminGateLog,
  type AdminGateUser,
  type AdminGateCompany,
} from "../services/adminGateService";
import { getAdminGateToken } from "../lib/session";
import { useToast } from "../context/ToastContext";
import { usePagination } from "../hooks/usePagination";
import { TablePagination } from "../components/TablePagination";
import logo from "../assets/ledgerflow.png";

type Tab = "log" | "users" | "companies";

type ConfirmState = {
  type: "user" | "company";
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
  const [tab, setTab] = useState<Tab>("log");

  const [logs, setLogs] = useState<AdminGateLog[]>([]);
  const [users, setUsers] = useState<AdminGateUser[]>([]);
  const [companies, setCompanies] = useState<AdminGateCompany[]>([]);
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
      const [logData, userData, companyData] = await Promise.all([
        fetchAdminGateLogs(),
        fetchAdminGateUsers(),
        fetchAdminGateCompanies(),
      ]);
      setLogs(logData);
      setUsers(userData);
      setCompanies(companyData);
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
  const requestDeleteUser = (u: AdminGateUser) => setConfirm({ type: "user", item: u });
  const requestDeleteCompany = (c: AdminGateCompany) =>
    setConfirm({ type: "company", item: c });

  const handleConfirmDelete = async () => {
    if (!confirm) return;
    setConfirming(true);
    try {
      if (confirm.type === "user") {
        const u = confirm.item as AdminGateUser;
        await deleteAdminGateUser(u.id);
        setUsers((prev) => prev.filter((x) => x.id !== u.id));
        toast({
          variant: "success",
          title: "User dihapus",
          message: `${u.name} (${u.email || u.phone || "-"}) berhasil dihapus.`,
        });
      } else {
        const c = confirm.item as AdminGateCompany;
        await deleteAdminGateCompany(c.id);
        setCompanies((prev) => prev.filter((x) => x.id !== c.id));
        toast({
          variant: "success",
          title: "Company dihapus",
          message: `${c.name} beserta seluruh datanya berhasil dihapus.`,
        });
      }
      setConfirm(null);
    } catch (err: any) {
      toast({
        variant: "error",
        title: "Gagal menghapus",
        message: err?.response?.data?.error || "Terjadi kesalahan saat menghapus.",
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
        ) : tab === "log" ? (
          <AuditLogView logs={logs} statusBadge={statusBadge} stats={stats} error={error} />
        ) : tab === "users" ? (
          <UsersView
            users={users}
            roleBadge={roleBadge}
            error={error}
            onDelete={requestDeleteUser}
          />
        ) : (
          <CompaniesView
            companies={companies}
            error={error}
            onDelete={requestDeleteCompany}
          />
        )}
      </main>

      {/* Modal konfirmasi hapus */}
      <ConfirmDeleteModal
        confirm={confirm}
        confirming={confirming}
        onCancel={() => !confirming && setConfirm(null)}
        onConfirm={handleConfirmDelete}
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
  count: number;
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
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
          active
            ? "bg-primary-500/10 text-primary-600 dark:text-primary-400"
            : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// ── Audit Log view ────────────────────────────────────────────────────
function AuditLogView({
  logs,
  statusBadge,
  stats,
  error,
}: {
  logs: AdminGateLog[];
  statusBadge: (s: AdminGateLog["status"]) => React.ReactNode;
  stats: { total: number; success: number; failed: number; blocked: number };
  error: string;
}) {
  const pagination = usePagination(logs, PAGE_SIZE);

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
          {logs.length > 0 && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {logs.length} catatan
            </span>
          )}
        </div>
        {logs.length === 0 ? (
          <EmptyState error={error} text="Belum ada percobaan tercatat." />
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

// ── Users view (read-only + moderasi hapus) ───────────────────────────
function UsersView({
  users,
  roleBadge,
  error,
  onDelete,
}: {
  users: AdminGateUser[];
  roleBadge: Record<string, string>;
  error: string;
  onDelete: (u: AdminGateUser) => void;
}) {
  const pagination = usePagination(users, PAGE_SIZE);

  return (
    <Card>
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Semua User (lintas company)
        </span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          Hanya tampilan · moderasi: hapus user bermasalah
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
                  {["Nama", "Email / No. HP", "Company", "Role", "Aksi"].map(
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
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => onDelete(u)}
                        title="Hapus user (moderasi)"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                      >
                        <Trash2 size={14} />
                      </button>
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

// ── Companies view (read-only + moderasi hapus) ───────────────────────
function CompaniesView({
  companies,
  error,
  onDelete,
}: {
  companies: AdminGateCompany[];
  error: string;
  onDelete: (c: AdminGateCompany) => void;
}) {
  const pagination = usePagination(companies, PAGE_SIZE);

  return (
    <Card>
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Semua Company
        </span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          Hanya tampilan · moderasi: hapus company (data ikut terhapus)
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
                  {["Nama", "Mata Uang", "Dibuat", "Aksi"].map((h) => (
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
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => onDelete(c)}
                        title="Hapus company (moderasi)"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                      >
                        <Trash2 size={14} />
                      </button>
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

// ── Modal konfirmasi hapus (popup, bukan window.confirm) ───────────────
function ConfirmDeleteModal({
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
  const isUser = confirm?.type === "user";
  const name = confirm
    ? isUser
      ? (confirm.item as AdminGateUser).name
      : (confirm.item as AdminGateCompany).name
    : "";
  const detail = confirm && isUser
    ? (confirm.item as AdminGateUser).email ||
      (confirm.item as AdminGateUser).phone ||
      ""
    : "";

  return (
    <AnimatePresence>
      {confirm && (
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
            {/* Header merah */}
            <div className="flex items-start gap-4 px-6 pt-6">
              <div className="shrink-0 p-3 rounded-2xl bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <AlertTriangle size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Hapus {isUser ? "User" : "Company"}?
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
                  {isUser ? (
                    <>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {name}
                      </span>
                      {detail && (
                        <span className="text-gray-400 dark:text-gray-500">
                          {" "}
                          ({detail})
                        </span>
                      )}
                      {" "}
                      akan dihapus permanen beserta seluruh datanya. Tindakan ini
                      tidak bisa dibatalkan.
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {name}
                      </span>
                      {" "}
                      akan dihapus permanen beserta seluruh datanya (user, akun,
                      periode, jurnal, dll.). Tindakan ini tidak bisa dibatalkan.
                    </>
                  )}
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {confirming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Ya, Hapus
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
