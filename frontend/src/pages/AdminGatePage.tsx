import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { verifyAdminGatePassword } from "../services/adminGateService";
import { api } from "../lib/api";
import Spinner from "../components/Spinner";

// Halaman gerbang admin — HANYA meminta password (tanpa email/username),
// terpisah total dari alur login WhatsApp OTP user biasa. Tidak ditautkan
// di navigasi manapun; hanya bisa dicapai lewat shortcut rahasia di /login.
export default function AdminGatePage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Halaman ini tidak boleh terindeks mesin pencari.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  // Warm-up saat gate kebuka (pola sama seperti AuthPage):
  //   1. Prefetch chunk AdminPortalPage biar navigasi pas password benar
  //      tidak nunggu download chunk (92KB + recharts).
  //   2. Ping /health fire-and-forget — bangunkan Render free-tier selagi
  //      user mengetik password, jadi /verify tidak kena cold-start.
  useEffect(() => {
    import("./AdminPortalPage").catch(() => {});
    api.get("/health", { skipErrorToast: true }).catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!password) {
      setError("Password salah");
      return;
    }
    setLoading(true);
    try {
      await verifyAdminGatePassword(password);
      navigate("/admin-portal", { replace: true, state: { fromGate: true } });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429) {
        setError("Terlalu banyak percobaan. Coba lagi beberapa saat lagi.");
      } else {
        // Pesan generik — tanpa detail tambahan.
        setError("Password salah");
      }
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen supports-[min-height:100dvh]:min-h-[100dvh] flex items-center justify-center bg-gray-100 dark:bg-[#0B1120] p-4 overflow-hidden">
      {/* Latar mesh lembut — satu dunia visual dengan Admin Portal */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_-10%,rgba(99,102,241,0.12),transparent_45%),radial-gradient(circle_at_85%_110%,rgba(139,92,246,0.10),transparent_45%)]" />
      <div className="relative w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-[#111827]/90 backdrop-blur-xl border border-gray-200/60 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-black/40 p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mb-3 shadow-sm shadow-indigo-950/40">
              <ShieldCheck size={22} />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-400 mb-1.5">
              Internal Console
            </p>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Akses Khusus
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Masukkan password untuk melanjutkan
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm rounded-xl ring-1 ring-rose-600/20 dark:ring-rose-500/25 flex items-center gap-2">
                {error}
              </div>
            )}

            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                autoComplete="current-password"
                className="w-full pl-9 pr-10 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-md shadow-indigo-950/30 hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Spinner size={5} colorClass="bg-white" /> : "Masuk"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
