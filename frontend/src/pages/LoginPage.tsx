import { useState, useEffect, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ArrowLeft } from "lucide-react";
import InfoPanel from "../components/InfoPanel";
import logo from "../assets/ledgerflow.png";

const PHONE_RE = /^(\+62|62|0)8\d{8,11}$/;
const RESEND_SECONDS = 60;

export default function LoginPage() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showUI, setShowUI] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { requestWaOtp, verifyWaOtp, loginWithGoogle } = useAuth();
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
      setError("Nomor WhatsApp tidak valid. Contoh: 081234567890");
      return;
    }
    setLoading(true);
    try {
      await requestWaOtp({ phone: phone.trim(), mode: "login" });
      setStep("otp");
      setCountdown(RESEND_SECONDS);
    } catch (err: any) {
      setError(err.message || "Gagal mengirim kode OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Masukkan kode OTP 6 digit.");
      return;
    }
    setLoading(true);
    try {
      await verifyWaOtp({ phone: phone.trim(), code: code.trim(), mode: "login" });
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Kode OTP salah atau kedaluwarsa.");
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-darkBg overflow-hidden">
      {/* LEFT PANEL */}
      <div
        className="hidden lg:flex flex-col bg-gradient-to-br from-darkBg via-[#111827] to-primary-900/40 p-8 transition-all duration-500 ease-in-out relative z-10"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ width: isHovered ? "55%" : "42%" }}
      >
        <InfoPanel isExpanded={isHovered} />
      </div>

      {/* RIGHT FORM AREA */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative">
        <div
          className={`w-full max-w-md mx-auto transition-all duration-700 ${
            showUI ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-6 transition"
          >
            <ArrowLeft size={16} /> Back to Home
          </Link>

          <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border border-primary-500/20 rounded-2xl shadow-2xl p-6 sm:p-8">
            <div className="flex justify-center mb-6">
              <img src={logo} alt="LedgerFlow" className="w-12 h-12" />
            </div>
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: { staggerChildren: 0.05, delayChildren: 0.4 },
                },
              }}
              className="text-2xl font-bold text-center bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent flex items-center justify-center flex-wrap"
              style={{ perspective: "600px" }}
            >
              {"Welcome Back".split("").map((char, i) => (
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
                ? "Masuk dengan nomor WhatsApp"
                : `Masukkan kode yang dikirim ke ${phone}`}
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
                    placeholder="No. WhatsApp (08xxxxxxxxxx)"
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
                  {loading ? "Mengirim kode..." : "Kirim Kode via WhatsApp"}
                </button>
                <div className="text-center">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
                  >
                    Lupa Password (akun email)?
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
                    placeholder="Kode OTP 6 digit"
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
                  {loading ? "Memverifikasi..." : "Masuk"}
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
                    Ganti nomor
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={countdown > 0}
                    className="text-primary-600 dark:text-primary-400 hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {countdown > 0 ? `Kirim ulang (${countdown}s)` : "Kirim ulang kode"}
                  </button>
                </div>
              </form>
            )}
            {/* Divider */}
            <div className="mt-6 flex items-center">
              <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
              <span className="px-3 text-sm text-gray-500 dark:text-gray-400">
                Or
              </span>
              <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
            </div>

            {/* Google Login Button — CUSTOM (bukan @react-oauth/google) */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="flex items-center justify-center gap-3 w-full max-w-[320px] py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-darkCard hover:bg-gray-50 dark:hover:bg-white/5 transition-all disabled:opacity-50"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {googleLoading ? "Connecting..." : "Sign in with Google"}
                </span>
              </button>
            </div>

            <p className="text-center text-sm mt-6 text-gray-700 dark:text-gray-300">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-primary-600 font-medium hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}