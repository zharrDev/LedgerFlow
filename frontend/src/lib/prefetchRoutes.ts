// Prefetch chunk halaman saat kursor mendekat / fokus — sebelum diklik.
//
// Latar: semua halaman owner/akuntan itu lazy-loaded di balik SATU <Suspense>
// yang membungkus seluruh Routes (App.tsx). Navigasi ke chunk yang belum
// terunduh me-suspend SELURUH pohon (termasuk Sidebar) → sidebar me-remount
// → pil indikator layoutId muncul langsung tanpa animasi ("seperti hilang").
// Dengan prefetch saat hover/focus, chunk biasanya sudah tiba sebelum klik
// sehingga navigasi instan dan pil meluncur mulus.
//
// Kedua: pola yang sama dipakai AuthPage (prefetch DashboardPage) dan
// AdminGatePage (prefetch AdminPortalPage + warm-up /health).

// Map statik path -> import halaman. WAJIB literal agar Vite tetap
// code-split per halaman (jangan dibuat dinamis pakai template string).
const ROUTE_CHUNKS: Record<string, () => Promise<unknown>> = {
  "/dashboard": () => import("../pages/DashboardPage"),
  "/chart-of-accounts": () => import("../pages/ChartOfAccounts"),
  "/buku-besar": () => import("../pages/BukuBesarPage"),
  "/journal-entries": () => import("../pages/JournalEntryPage"),
  "/income-statement": () => import("../pages/IncomeStatementPage"),
  "/balance-sheet": () => import("../pages/BalanceSheet"),
  "/cash-flow": () => import("../pages/CashFlowPage"),
  "/period-management": () => import("../pages/PeriodManagement"),
  "/users-management": () => import("../pages/UserManagementPage"),
  "/help-center": () => import("../pages/HelpCenterPage"),
  "/ai-cfo": () => import("../pages/AiCfoPage"),
  "/profile": () => import("../pages/ProfilePage"),
  "/settings": () => import("../pages/SettingsPage"),
};

const prefetched = new Set<string>();

/** Unduh chunk route lebih awal; aman dipanggil berulang (sekali per path). */
export function prefetchRoute(path: string): void {
  if (prefetched.has(path)) return;
  const load = ROUTE_CHUNKS[path];
  if (!load) return;
  prefetched.add(path);
  load().catch(() => {
    // Gagal prefetch bukan error user — biarkan navigasi normal yang
    // menanganinya (Suspense fallback). Izinkan coba lagi lain waktu.
    prefetched.delete(path);
  });
}
