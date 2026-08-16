import { useEffect, useState, useCallback } from "react";
import { useNavigate, Navigate } from "react-router-dom";
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
import logo from "../assets/ledgerflow.png";

type Tab = "log" | "users" | "companies";

const roleBadge: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  akuntan:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

// Dashboard admin khusus — hanya bisa diakses dengan token admin-gate
// (token user biasa ditolak oleh backend). Terpisah total dari aplikasi
// utama user biasa. Menyediakan: audit log gerbang, manajemen user global
// (sesuai ketentuan role admin di README), dan daftar company.
export default function AdminPortalPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("log");

  const [logs, setLogs] = useState<AdminGateLog[]>([]);
  const [users, setUsers] = useState<AdminGateUser[]>([]);
  const [companies, setCompanies] = useState<AdminGateCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasToken, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = () => {
    logoutAdminGate();
    navigate("/login", { replace: true });
  };

  // ── Moderasi: satu-satunya aksi mutasi admin (hapus user/company) ──
  const handleDeleteUser = async (u: AdminGateUser) => {
    if (
      !window.confirm(
        `Hapus user "${u.name}" (${u.email || u.phone || "-"})?\n\nTindakan ini menghapus akun beserta datanya dan tidak bisa dibatalkan.`,
      )
    )
      return;
    setBusyId(u.id);
    setError("");
    try {
      await deleteAdminGateUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err: any) {
      setError(err?.response?.data?.error || "Gagal menghapus user.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteCompany = async (c: AdminGateCompany) => {
    if (
      !window.confirm(
        `Hapus company "${c.name}"?\n\nPERINGATAN: seluruh data company ini (user, akun, periode, jurnal, dll.) akan ikut terhapus permanen. Tindakan ini tidak bisa dibatalkan.`,
      )
    )
      return;
    setBusyId(c.id);
    setError("");
    try {
      await deleteAdminGateCompany(c.id);
      setCompanies((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err: any) {
      setError(err?.response?.data?.error || "Gagal menghapus company.");
    } finally {
      setBusyId(null);
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
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status]}`}
      >
        {status}
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
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary-500/10 text-primary-500">
            <ShieldCheck size={20} />
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

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-xl border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-0 overflow-x-auto">
          <TabButton
            active={tab === "log"}
            onClick={() => setTab("log")}
            icon={<ScrollText size={14} />}
            label="Audit Log Gerbang"
          />
          <TabButton
            active={tab === "users"}
            onClick={() => setTab("users")}
            icon={<Users size={14} />}
            label={`User (${users.length})`}
          />
          <TabButton
            active={tab === "companies"}
            onClick={() => setTab("companies")}
            icon={<Building2 size={14} />}
            label={`Company (${companies.length})`}
          />
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : tab === "log" ? (
          <AuditLogView logs={logs} statusBadge={statusBadge} stats={stats} />
        ) : tab === "users" ? (
          <UsersView
            users={users}
            roleBadge={roleBadge}
            busyId={busyId}
            onDelete={handleDeleteUser}
          />
        ) : (
          <CompaniesView
            companies={companies}
            busyId={busyId}
            onDelete={handleDeleteCompany}
          />
        )}
      </main>
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
        active
          ? "border-primary-500 text-primary-600 dark:text-primary-400"
          : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Audit Log view ────────────────────────────────────────────────────
function AuditLogView({
  logs,
  statusBadge,
  stats,
}: {
  logs: AdminGateLog[];
  statusBadge: (s: AdminGateLog["status"]) => React.ReactNode;
  stats: { total: number; success: number; failed: number; blocked: number };
}) {
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
        </div>
        {logs.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            Belum ada percobaan tercatat.
          </div>
        ) : (
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
                {logs.map((log) => (
                  <tr key={log.id}>
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
        )}
      </Card>
    </div>
  );
}

// ── Users view (tampilan + moderasi hapus) ─────────────────────────────
function UsersView({
  users,
  roleBadge,
  busyId,
  onDelete,
}: {
  users: AdminGateUser[];
  roleBadge: Record<string, string>;
  busyId: string | null;
  onDelete: (u: AdminGateUser) => void;
}) {
  return (
    <Card>
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Semua User (lintas company)
        </span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          Moderasi: hapus user bermasalah (owner terakhir dilindungi)
        </span>
      </div>
      {users.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">
          Belum ada user.
        </div>
      ) : (
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
              {users.map((u) => (
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
                      disabled={busyId === u.id}
                      title="Hapus user (moderasi)"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ── Companies view (tampilan + moderasi hapus) ────────────────────────
function CompaniesView({
  companies,
  busyId,
  onDelete,
}: {
  companies: AdminGateCompany[];
  busyId: string | null;
  onDelete: (c: AdminGateCompany) => void;
}) {
  return (
    <Card>
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Semua Company
        </span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          Moderasi: hapus company (seluruh datanya ikut terhapus)
        </span>
      </div>
      {companies.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">
          Belum ada company.
        </div>
      ) : (
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
              {companies.map((c) => (
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
                      disabled={busyId === c.id}
                      title="Hapus company (moderasi)"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
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
