import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BottomNav } from "./BottomNav";

// Rute utama aplikasi yang menampilkan Bottom Navigation (mobile).
// Semua halaman lain (login/register/auth/onboarding/ai-cfo/pricing/
// payment/detail/fullscreen/404) otomatis TIDAK menampilkan nav.
// Detail page masa depan cukup TIDAK ditambahkan ke daftar ini.
const MAIN_PATHS = new Set([
  "/dashboard",
  "/journal-entries",
  "/chart-of-accounts",
  "/buku-besar",
  "/income-statement",
  "/balance-sheet",
  "/cash-flow",
  "/profile",
  "/period-management",
  "/users-management",
  "/settings",
  "/help-center",
]);

export function isMainAppPath(pathname: string): boolean {
  return MAIN_PATHS.has(pathname);
}

/**
 * Gerbang visibility Bottom Navigation — satu tempat untuk semua rute.
 * BottomNav hanya muncul di halaman utama aplikasi (sudah login).
 */
export function AppNav() {
  const { token, loading } = useAuth();
  const location = useLocation();

  if (loading || !token) return null;
  if (!isMainAppPath(location.pathname)) return null;

  return <BottomNav />;
}