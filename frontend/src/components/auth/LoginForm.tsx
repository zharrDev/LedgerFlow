import { useState, useEffect, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../hooks/useLanguage";
import GoogleAuthButton from "./GoogleAuthButton";
import logo from "../../assets/ledgerflow.webp";

const PHONE_RE = /^(\+62|62|0)8\d{8,11}$/;
const RESEND_SECONDS = 60;

export default function LoginForm({
  onModeChange,
}: {
  onModeChange: (mode: "login" | "register") => void;
}) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showUI, setShowUI] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { requestWaOtp, verifyWaOtp, loginWithGoogle } = useAuth();
  const { language } = useLanguage();
  const id = language === "id";
  const navigate = useNavigate();

  useEffect(() => {
    setShowUI(true);
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    if (!PHONE_RE.test(phone.trim())) {
      setError(
        id
          ? "Nomor WhatsApp tidak valid. Contoh: 081234567890"
          : "Invalid WhatsApp number. Example: 081234567890",
      );
      return;
    }
    setLoading(true);
    try {
      await requestWaOtp({ phone: phone.trim(), mode: "login" });
      setStep("otp");
      setCountdown(RESEND_SECONDS);
    } catch (err: any) {
      setError(err.message || (id ? "Gagal mengirim kode OTP." : "Failed to send OTP code."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code.trim())) {
      setError(
        id
          ? "Masukkan kode OTP 6 digit."
          : "Enter the 6-digit OTP code.",
      );
      return;
    }
    setLoading(true);
    try {
      await verifyWaOtp({ phone: phone.trim(), code: code.trim(), mode: "login" });
      navigate("/dashboard");
    } catch (err: any) {
      setError(
        err.message ||
          (id ? "Kode OTP salah atau kedaluwarsa." : "OTP code is invalid or expired."),
      );
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    await handleSendCode();
  };

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      // Akan redirect ke Google → Supabase → /auth/callback
    } catch (err: any) {
      setError(err.message || "Google login failed");
      setGoogleLoading(false);
    }
  };

  return (
    <div
      className={`transition-all duration-700 ${
        showUI ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      <div className="flex justify-center mb-6">
        <img src={logo} alt="LedgerFlow" className="w-12 h-12" />
      </div>
      <h1 className="sm:hidden text-2xl font-bold text-center bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
        {id ? "Selamat Datang Kembali" : "Welcome Back"}
      </h1>
      <motion.h1
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.05, delayChildren: 0.4 },
          },
        }}
        className="hidden sm:flex text-2xl font-bold text-center bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent items-center justify-center flex-wrap"
        style={{ perspective: "600px" }}
      >
        {(id ? "Selamat Datang Kembali" : "Welcome Back").split("").map((char, i) => (
          <motion.span
            key={i}
            variants={{
              hidden: { y: 40, opacity: 0, rotateX: -90 },
              visible: {
                y: 0,
                opacity: 1,
                rotateX: 0,
                transition: {
                  type: "spring",
                  stiffness: 200,
                  damping: 18,
                },
              },
            }}
            className="inline-block"
            style={{ transformOrigin: "bottom center" }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </motion.h1>
      <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-1">
        {step === "phone"
          ? id
            ? "Masuk dengan nomor WhatsApp"
            : "Sign in with your WhatsApp number"
          : id
            ? `Masukkan kode yang dikirim ke ${phone}`
            : `Enter the code sent to ${phone}`}
      </p>

      {error && (
        <div className="mt-4 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {step === "phone" ? (
        <form onSubmit={handleSendCode} className="mt-6 space-y-4">
          <div>
            <input
              type="tel"
              inputMode="numeric"
              placeholder={
                id ? "No. WhatsApp (08xxxxxxxxxx)" : "WhatsApp number (08xxxxxxxxxx)"
              }
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl
      border border-gray-200 dark:border-gray-700
      bg-white dark:bg-darkCard
      text-gray-900 dark:text-white
      placeholder-gray-400 dark:placeholder-gray-500
      caret-primary-500 dark:caret-primary-400
      selection:bg-primary-500/30 selection:text-gray-900
      dark:selection:bg-primary-500/40 dark:selection:text-white
      autofill:bg-white dark:autofill:bg-darkCard
      autofill:text-gray-900 dark:autofill:text-white
      focus:ring-2 focus:ring-primary-500/40 outline-none
      transition`}
              required
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="
      w-full py-3
      bg-gradient-to-r from-primary-600 to-primary-500
      text-white font-semibold rounded-xl
      shadow-md hover:shadow-lg
      hover:scale-[1.02] active:scale-[0.98]
      transition-all
      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
    "
          >
            {loading
              ? id
                ? "Mengirim kode..."
                : "Sending code..."
              : id
                ? "Kirim Kode via WhatsApp"
                : "Send Code via WhatsApp"}
          </button>
          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              {id ? "Lupa Password (akun email)?" : "Forgot password (email account)?"}
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder={id ? "Kode OTP 6 digit" : "6-digit OTP code"}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={`w-full px-4 py-3 rounded-xl text-center text-xl tracking-[0.5em] font-semibold
      border border-gray-200 dark:border-gray-700
      bg-white dark:bg-darkCard
      text-gray-900 dark:text-white
      placeholder-gray-400 dark:placeholder-gray-500
      caret-primary-500 dark:caret-primary-400
      selection:bg-primary-500/30 selection:text-gray-900
      dark:selection:bg-primary-500/40 dark:selection:text-white
      autofill:bg-white dark:autofill:bg-darkCard
      autofill:text-gray-900 dark:autofill:text-white
      focus:ring-2 focus:ring-primary-500/40 outline-none
      transition`}
              required
              autoComplete="one-time-code"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="
      w-full py-3
      bg-gradient-to-r from-primary-600 to-primary-500
      text-white font-semibold rounded-xl
      shadow-md hover:shadow-lg
      hover:scale-[1.02] active:scale-[0.98]
      transition-all
      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
    "
          >
            {loading ? (id ? "Memverifikasi..." : "Verifying...") : id ? "Masuk" : "Sign In"}
          </button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setCountdown(0);
              }}
              className="text-gray-500 dark:text-gray-400 hover:text-primary-600 transition"
            >
              {id ? "Ganti nomor" : "Change number"}
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0}
              className="text-primary-600 dark:text-primary-400 hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {countdown > 0
                ? id
                  ? `Kirim ulang (${countdown}s)`
                  : `Resend (${countdown}s)`
                : id
                  ? "Kirim ulang kode"
                  : "Resend code"}
            </button>
          </div>
        </form>
      )}
      {/* Divider */}
      <div className="mt-6 flex items-center">
        <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
        <span className="px-3 text-sm text-gray-500 dark:text-gray-400">
          {id ? "atau" : "Or"}
        </span>
        <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
      </div>

      {/* Google Login Button — CUSTOM (bukan @react-oauth/google) */}
      <GoogleAuthButton
        loading={googleLoading}
        label={id ? "Masuk dengan Google" : "Sign in with Google"}
        onClick={handleGoogleLogin}
      />

      <p className="text-center text-sm mt-6 text-gray-700 dark:text-gray-300">
        {id ? "Belum punya akun?" : "Don't have an account?"}{" "}
        <button
          type="button"
          onClick={() => onModeChange("register")}
          className="text-primary-600 font-medium hover:underline"
        >
          {id ? "Daftar" : "Sign up"}
        </button>
      </p>
    </div>
  );
}