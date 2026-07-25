import { useState, useRef, useEffect, useCallback, KeyboardEvent, ClipboardEvent } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyOTPPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const email = searchParams.get("email") || "";
  const purpose = searchParams.get("purpose") || "register_verification";

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleKeyDown = useCallback((index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [digits]);

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < pasted.length; i++) {
        next[i] = pasted[i];
      }
      return next;
    });
    const target = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[target]?.focus();
  }, []);

  const handleVerify = async () => {
    const code = digits.join("");
    if (code.length !== OTP_LENGTH) {
      setError("Masukkan 6 digit kode OTP.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/verify-otp", { email, code, purpose });
      toast({ variant: "success", title: "Verifikasi Berhasil", message: res.data.message });
      if (purpose === "register_verification") {
        navigate("/login", { replace: true });
      } else {
        navigate(`/reset-password?email=${encodeURIComponent(email)}`, { replace: true });
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || "Verifikasi gagal. Coba lagi.";
      setError(msg);
      toast({ variant: "error", title: "Verifikasi Gagal", message: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await api.post("/api/auth/send-otp", { email, purpose });
      setResendCooldown(RESEND_COOLDOWN);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      toast({ variant: "success", title: "Kode Dikirim Ulang", message: "Cek email Anda untuk kode OTP baru." });
    } catch (err: any) {
      const msg = err.response?.data?.error || "Gagal mengirim ulang kode.";
      toast({ variant: "error", title: "Gagal", message: msg });
    }
  };

  const allFilled = digits.every((d) => d !== "");

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-darkBg p-4">
      <div className="w-full max-w-md mx-auto">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-6 transition">
          <ArrowLeft size={16} /> Back to Login
        </Link>

        <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border border-primary-500/20 rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <ShieldCheck size={40} className="mx-auto text-primary-500 mb-3" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verifikasi OTP</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Masukkan kode 6 digit yang dikirim ke
            </p>
            <p className="text-primary-600 dark:text-primary-400 font-medium text-sm mt-0.5">{email}</p>
          </div>

          {error && (
            <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 text-center">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-2 sm:gap-3 mb-6">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkCard text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/40 outline-none transition"
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || !allFilled}
            className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? "Memverifikasi..." : "Verifikasi"}
          </button>

          <div className="text-center mt-5">
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
            >
              {resendCooldown > 0
                ? `Kirim ulang kode (${resendCooldown}s)`
                : "Kirim ulang kode"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
