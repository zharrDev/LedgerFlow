import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import InfoPanel from "../components/InfoPanel";
import AuthFlipCard from "../components/auth/AuthFlipCard";
import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";
import { api } from "../lib/api";
import { getSessionToken } from "../lib/session";
import { useLanguage } from "../hooks/useLanguage";
import { tx } from "../i18n/tx";

export default function AuthPage({
  initialMode,
}: {
  initialMode: "login" | "register";
}) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const { language } = useLanguage();

  // Warm-up saat halaman login/register kebukak:
  //   1. Prefetch chunk DashboardPage biar Navigasi ke dashboard lebih cepat
  //      pas login berhasil (Suspense gak nunggu download chunk).
  //   2. Kalau user udah punya token (balik ke login, mis. sesi expired),
  //      ping /health buat "menghidupkan" backend Render free-tier yang
  //      cold-start 30-60 detik, biar navigasi berikutnya gak nunggu lama.
  useEffect(() => {
    let cancelled = false;
    // Prefetch chunk dashboard
    import("./DashboardPage").catch(() => {});
    // Warm-up backend kalau ada token (hingga keep-alive tak terpakai)
    if (getSessionToken() && !cancelled) {
      api.get("/health", { skipErrorToast: true }).catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Shortcut rahasia ke gerbang admin: Ctrl+Alt+\.
  // Sengaja tanpa indikasi visual apa pun di halaman ini.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && (e.key === "\\" || e.key === "|")) {
        e.preventDefault();
        navigate("/portal-akses");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  return (
    <div className="h-[100dvh] flex flex-col lg:flex-row bg-white dark:bg-darkBg overflow-hidden">
      {/* LEFT PANEL */}
      <div
        className="hidden lg:flex flex-col bg-gradient-to-br from-darkBg via-[#111827] to-primary-900/40 p-8 transition-all duration-500 ease-in-out relative z-10 overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ width: isHovered ? "55%" : "42%" }}
      >
        <InfoPanel isExpanded={isHovered} />
      </div>

      {/* RIGHT FORM AREA */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin flex items-center justify-center p-4 sm:p-6 py-10 sm:py-12 lg:py-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md mx-auto"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-6 transition"
          >
            <ArrowLeft size={16} /> {tx(language, "Back to Home", "Kembali ke Beranda")}
          </Link>

          <AuthFlipCard
            mode={mode}
            onModeChange={setMode}
            front={<LoginForm onModeChange={setMode} />}
            back={<RegisterForm onModeChange={setMode} />}
          />
        </motion.div>
      </div>
    </div>
  );
}