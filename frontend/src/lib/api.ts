import axios from "axios";

// Axios instance utama untuk semua request API frontend -> backend
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
});

// Interceptor request: kirim JWT. Identitas user/company diambil backend
// dari token (bukan dari header x-user-id/x-company-id yang bisa dipalsukan).
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Interceptor response: jika token invalid, arahkan ulang ke login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || "";
    const isPaymentRoute = url.includes("/api/payments/");
    const isAuthRoute = url.includes("/api/auth/");

    if (err.response?.status === 401 &&!isPaymentRoute &&!isAuthRoute) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

