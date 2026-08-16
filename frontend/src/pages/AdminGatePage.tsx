import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { verifyAdminGatePassword } from "../services/adminGateService";
import logo from "../assets/ledgerflow.png";

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
      navigate("/admin-portal", { replace: true });
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
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-darkBg p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border border-primary-500/20 rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="flex justify-center mb-6">
            <img src={logo} alt="LedgerFlow" className="w-12 h-12" />
          </div>

          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500 mb-3">
              <ShieldCheck size={22} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Akses Khusus
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Masukkan password untuk melanjutkan
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200">
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
                className="w-full pl-9 pr-10 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkCard text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 outline-none transition"
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
              className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Memverifikasi..." : "Masuk"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
