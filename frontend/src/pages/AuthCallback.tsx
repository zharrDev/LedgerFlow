// src/pages/AuthCallback.tsx
// Halaman ini menangani redirect dari Supabase setelah Google OAuth
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 1. Ambil session dari Supabase (auto-extract dari URL hash)
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.error("Session error:", sessionError);
          setErrorMsg("Gagal mendapatkan session. Silakan coba lagi.");
          setStatus("error");
          return;
        }

        console.log("Supabase session OK, user:", session.user.email);

        // 2. Kirim Supabase access token ke backend kita untuk ditukar custom JWT
        const res = await api.post("/api/auth/exchange-token", {
          supabase_token: session.access_token,
        });

        // 3. Simpan custom JWT + user data (sama seperti login biasa)
        login(res.data.token, res.data.user);

        // 4. Arahkan ke dashboard
        navigate("/dashboard", { replace: true });
      } catch (err: any) {
        console.error("Auth callback error:", err);

        const errorCode = err.response?.data?.error;

        // ── FIXED: Kalau belum register → redirect ke register ──
        if (errorCode === "NOT_REGISTERED") {
          navigate("/register", {
            replace: true,
            state: {
              message:
                "Akun belum terdaftar. Silakan register terlebih dahulu.",
            },
          });
          return;
        }

        setErrorMsg(
          err.response?.data?.message ||
            err.response?.data?.error ||
            err.message ||
            "Authentication failed",
        );
        setStatus("error");
      }
    };

    handleCallback();
  }, [login, navigate]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-darkBg p-4">
        <div className="text-center space-y-4 max-w-md mx-auto w-full">
          <div className="text-red-500 text-lg font-semibold">Login Gagal</div>
          <p className="text-gray-500 text-sm break-words">{errorMsg}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/login"
              className="inline-block px-6 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition shadow-md"
            >
              Kembali ke Login
            </a>
            <a
              href="/register"
              className="inline-block px-6 py-2 border border-primary-500 text-primary-600 rounded-xl hover:bg-primary-50 transition"
            >
              Register
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-darkBg p-4">
      <div className="text-center space-y-4 max-w-md mx-auto w-full">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-sm">Menyelesaikan login...</p>
      </div>
    </div>
  );
}
