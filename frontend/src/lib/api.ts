import axios from "axios";

// Axios instance utama untuk semua request API frontend -> backend
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
});

// Interceptor request: otomatis kirim token dan info user/company dari localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.id) {
        config.headers["x-user-id"] = user.id;
      }
      if (user.company_id) {
        config.headers["x-company-id"] = user.company_id;
      }
    } catch {}
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

