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
} from "lucide-react";
import {
  fetchAdminGateLogs,
  logoutAdminGate,
  type AdminGateLog,
} from "../services/adminGateService";
import { getAdminGateToken } from "../lib/session";
import logo from "../assets/ledgerflow.png";

// Dashboard admin khusus — hanya bisa diakses dengan token admin-gate
// (token user biasa ditolak oleh backend). Terpisah total dari aplikasi
// utama user biasa.
export default function AdminPortalPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AdminGateLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

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
      setLogs(await fetchAdminGateLogs());
    } catch (err: any) {
      if (err?.response?.status === 401) {
        // Token admin-gate expired/ditolak → kembali ke gerbang.
        logoutAdminGate();
        navigate("/portal-akses", { replace: true });
        return;
      }
      setError("Gagal memuat log audit.");
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="LedgerFlow" className="w-7 h-7" />
            <span className="font-semibold text-gray-900 dark:text-white text-sm">
              Admin Portal
            </span>
            <span className="text-[11px] font-medium text-primary-600 dark:text-primary-400 bg-primary-500/10 border border-primary-500/20 px-2 py-0.5 rounded-full">
              Khusus Admin
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <LogOut size={14} />
            Keluar
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary-500/10 text-primary-500">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Audit Log Gerbang Admin
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Riwayat percobaan password gerbang admin (berhasil / gagal /
              diblokir)
            </p>
          </div>
        </div>

        {/* Stats */}
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

        {/* Log table */}
        <div className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-md overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Riwayat Terakhir
            </span>
            <button
              onClick={load}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              Muat Ulang
            </button>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm">
              {error}
            </div>
          )}

          {!error && loading ? (
            <div className="py-16 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
          ) : !error && logs.length === 0 ? (
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
                      <td className="px-4 py-2.5">
                        {statusBadge(log.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
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
