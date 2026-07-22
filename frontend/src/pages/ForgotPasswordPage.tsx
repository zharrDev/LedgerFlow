import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { api } from "../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) { setError("Email wajib diisi."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Format email tidak valid."); return; }

    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Gagal mengirim email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-darkBg p-4">
      <div className="w-full max-w-md mx-auto">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-6 transition">
          <ArrowLeft size={16} /> Back to Login
        </Link>

        <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border border-primary-500/20 rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <Mail size={40} className="mx-auto text-primary-500 mb-3" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lupa Password?</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Masukkan email Anda, kami akan kirim link reset.
            </p>
          </div>

          {sent ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
              <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cek Email Anda</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                Jika email <strong>{email}</strong> terdaftar, kami sudah kirim link reset password.
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-3">
                Tidak menerima email? Cek folder spam atau{" "}
                <button onClick={() => setSent(false)} className="text-primary-500 hover:underline">coba lagi</button>.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200">
                  {error}
                </div>
              )}
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkCard text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500/40 outline-none transition"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Mengirim..." : "Kirim Link Reset"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
