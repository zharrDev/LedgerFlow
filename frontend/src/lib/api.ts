import axios from "axios";
import { getSessionToken, clearSession } from "./session";
import { getErrorMessage, errorToastTitle } from "./errorMessage";
import { showToast } from "./toastBridge";

// Opsi tambahan per-request: komponen/service yang SUDAH menangani error
// dengan pesan spesifik (mis. validasi form) bisa menonaktifkan toast
// otomatis ini supaya tidak muncul dobel.
declare module "axios" {
  export interface AxiosRequestConfig {
    skipErrorToast?: boolean;
  }
}

// Axios instance utama untuk semua request API frontend -> backend
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
});

// Interceptor request: kirim JWT. Identitas user/company diambil backend
// dari token (bukan dari header x-user-id/x-company-id yang bisa dipalsukan).
api.interceptors.request.use((config) => {
  const token = getSessionToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Interceptor response:
//   1. Jika token invalid, arahkan ulang ke login (logic lama, tidak diubah).
//   2. Toast otomatis untuk setiap request yang gagal — kecuali dimatikan
//      via `skipErrorToast` atau 401 di route auth/admin-gate (sudah ada
//      UI/redirect yang menangani sendiri, supaya tidak dobel).
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || "";
    const isPaymentRoute = url.includes("/api/payments/");
    const isAuthRoute =
      url.includes("/api/auth/") ||
      url.includes("/api/wa/") ||
      // Gerbang admin: 401 (password salah / token expired) ditangani oleh
      // halaman AdminGate/AdminPortal sendiri, bukan redirect ke login WA OTP.
      url.includes("/api/admin-gate/");

    if (err.response?.status === 401 && !isPaymentRoute && !isAuthRoute) {
      clearSession();
      window.location.href = "/login";
    }

    const is401AuthRoute = err.response?.status === 401 && isAuthRoute;
    if (!err.config?.skipErrorToast && !is401AuthRoute) {
      showToast({
        variant: "error",
        title: errorToastTitle(err),
        message: getErrorMessage(err),
      });
    }

    return Promise.reject(err);
  },
);

