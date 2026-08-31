# LedgerFlow Frontend — Responsif + Loading Laporan + i18n Fixes

## Ringkasan Audit
Berdasarkan pembacaan source code, beberapa masalah yang dilaporkan **sudah ter-fix** di codebase saat ini:
- `RouteSuspenseFallback` di `BrandedLoader.tsx` sudah kecil (`min-h-[40vh]`), bukan full screen.
- `useSubscription.ts` sudah punya cache module-scope + `isLoading` awal `!cachedSubscription`.
- `ProtectedFeature.tsx` sudah hanya show spinner jika `isLoading && !subscription`.
- `useReports.ts` (`useIncomeStatement`, `useCashFlow`, `useBalanceSheet`) sudah pakai `placeholderData: keepPreviousData` — data lama tetap terlihat saat refetch.
- `IncomeStatementPage.tsx` & `CashFlowPage.tsx` sudah pakai pola `isInitialLoad` → `ReportSkeleton`, `isRefetching` → `ReportRefetchBar`.

**Yang masih bermasalah:**
- `BalanceSheet.tsx` tidak pakai hook dari `useReports.ts`, pakai fetch manual + early return `min-h-screen` + skip fetch diam-diam.
- Layout 300px: Header, Navbar, AppShell, HoverDropdown, CashFlowChart, judul letter-split.
- i18n: Onboarding hardcoded ID, AuthPage "Back to Home" hardcoded EN, Navbar "Financial Platform" hardcoded EN.
- 404 routing: 5 detail page navigate ke `/404` yang tidak ada.
- TextReveal key tidak include language → animasi bentrok saat ganti bahasa.

---

## Tugas Berprioritas

### P0 — Compile-safe & Routing (tidak merusak build)
1. **Fix 404 routing** di 5 detail pages:
   - `SolutionDetailPage.tsx`, `ProductDetailPage.tsx`, `ToolDetailPage.tsx`, `ResourceDetailPage.tsx`, `CompanyDetailPage.tsx`
   - Ganti `<Navigate to="/404" replace />` → `<Navigate to="/not-found" replace />`
   - File: `frontend/src/pages/*DetailPage.tsx` (5 file)

2. **TextReveal language key fix**:
   - File: `frontend/src/components/TextReveal.tsx`
   - Ganti `key={`c${ci}`}` → `key={`c${ci}-${language}`}` (butuh prop `language` masuk)
   - Alternatif lebih aman: tambah prop `language` ke TextReveal, atau pakai `key={text}` di span word + `key={`${text}-${ci}-${language}`}` di char
   - Catatan: Homepage, MarketingPage, PricingPage, Income/CashFlow/BalanceSheet, BukuBesar, JournalEntry semua pakai letter-split manual atau TextReveal. Yang pakai TextReveal perlu update. Yang manual perlu ditambahkan language key.

### P1 — Loading Laporan (BalanceSheet)
3. **Refactor BalanceSheet.tsx** agar:
   - Tidak ada early return `min-h-screen` saat loading periods.
   - Pakai `useReportPeriods()` dan `useBalanceSheet(periodId, companyId)` dari `useReports.ts`.
   - First load: tampilkan `ReportSkeleton` di body (bukan full screen spinner).
   - Header + filter tetap terlihat selama loading.
   - Ganti periode: data lama tetap kelihatan, muncul `ReportRefetchBar`.
   - Fetch tetap jalan meski `periodId` kosong (backend return all periods).
   - Hapus `overflow-hidden` dari wrapper, ganti `overflow-x-hidden`.
   - Tambah language key pada letter-split animation.

### P2 — Layout 300px (Header, AppShell, Navbar, Dropdown, Chart)
4. **Header.tsx** — mobile 300px:
   - `px-4` → `px-3` (atau `px-2.5` di base, `sm:px-4`).
   - Sembunyikan teks "LedgerFlow" dan subtitle "Financial Platform" di bawah `sm` (`hidden sm:block` untuk subtitle, `hidden sm:inline` untuk wordmark? — minimal logo saja di <360px).
   - Perketat `gap` di right-side icons: `gap-1 sm:gap-2 lg:gap-3`.
   - Pastikan search bell theme avatar tidak overflow.

5. **AppShell.tsx** — mobile padding:
   - `p-4 sm:p-6 pb-24` → `p-3 sm:p-6 pb-24`.
   - Tambah `min-w-0 overflow-x-hidden` pada wrapper mobile `<main>`.
   - Pastikan desktop tidak berubah.

6. **Navbar.tsx** — mobile 300px:
   - Logo + wordmark: sembunyikan wordmark & subtitle di bawah `sm` (`hidden sm:block`).
   - Subtitle "Financial Platform" hardcoded EN → wrap dengan `tx(language, "Financial Platform", "Platform Keuangan")`.
   - `px-4` → `px-3` di inner container, `sm:px-6`.
   - Pastikan right-side (lang + theme + auth + hamburger) muat di satu baris.

7. **CashFlowChart.tsx** — overflow:
   - Wrapper chart: `overflow-hidden` → `overflow-x-hidden` (atau hapus entirely).
   - Pastikan Y-axis width 72 + formatCompact tetap muat.

8. **HoverDropdown.tsx** — width safety:
   - Sudah ada clamp viewport di `updatePosition()`. Pastikan container `inline-block` tidak bikin overflow di flex parent. Tambah `min-w-0` pada container jika diperlukan.

9. **Judul letter-split di pages** — tambah language key:
   - `BalanceSheet.tsx`: `key={i}` → `key={`${language}-${i}`}`
   - `BukuBesarPage.tsx`: sama
   - `JournalEntryPage.tsx`: jika ada letter-split, sama
   - `IncomeStatementPage.tsx` & `CashFlowPage.tsx`: sudah ada `key={`${language}-${i}`}` — OK.

### P3 — i18n Hardcode
10. **OnboardingPage.tsx**:
    - Semua string hardcode ID → pakai `useLanguage()` + `tx()`.
    - Card padding: `p-8 sm:p-10` → `p-5 sm:p-8` (agar nyaman di 300px).

11. **AuthPage.tsx**:
    - "Back to Home" → `tx(language, "Back to Home", "Kembali ke Beranda")`.

12. **Navbar.tsx** Financial Platform subtitle — sudah disebutkan di P2.

### P4 — Finishing Responsif & Safety
13. **Currency break-words di semua pages**:
    - Pastikan semua baris flex dengan angka pakai `tabular-nums break-words min-w-0 max-w-[45%]` (atau `shrink-0` + `text-right`).
    - Cek: `IncomeStatementPage.tsx`, `CashFlowPage.tsx`, `DashboardPage.tsx`, `BalanceSheet.tsx` (setelah refactor), `BukuBesarPage.tsx`.

14. **ScrollReveal amount margin**:
    - Saat ini `amount: 0.18` di `ScrollReveal.tsx` dan `scrollAnimations.ts`. Ini aman untuk homepage. Jangan ubah global. Jika ada laporan yang kepotong, turunkan amount di instance laporan saja.

15. **PricingPage.tsx** billing toggle wrap:
    - Cek elemen "Hemat 15%" / billing cycle toggle di 300px. Pastikan `flex-wrap` atau `text-center` agar tidak overflow.

16. **HomePage.tsx** hero text overflow:
    - `TextReveal` di hero pakai `whitespace-nowrap` per word. Di 300px bisa overflow. Pastikan parent `overflow-x-hidden` atau hapus `whitespace-nowrap` dari TextReveal words.

---

## File Dampak & Risiko

| File | Perubahan | Risiko |
|---|---|---|
| `*DetailPage.tsx` (5) | Navigate /404 → /not-found | Rendering 404 benar; tidak ada route /404 |
| `TextReveal.tsx` | Tambah prop language, update keys | Perlu update semua pemanggil |
| `BalanceSheet.tsx` | Refactor besar: hook + skeleton + refetch | Perlu test fetch periods + report |
| `Header.tsx` | Hide wordmark <360px, px-3, gap ketat | Desktop tidak berubah |
| `AppShell.tsx` | p-3, min-w-0, overflow-x-hidden mobile | Desktop aman |
| `Navbar.tsx` | Hide wordmark <360px, translate subtitle, px-3 | Public pages aman |
| `CashFlowChart.tsx` | overflow-hidden → overflow-x-hidden | Chart tidak lagi di-clip |
| `OnboardingPage.tsx` | i18n semua string, p-5 | Copy lengkap harus di-{en,id} |
| `AuthPage.tsx` | "Back to Home" → i18n | 1 baris |
| `BalanceSheet.tsx`, `BukuBesarPage.tsx`, `JournalEntryPage.tsx` | Language key di letter-split | Animasi tetap jalan |

### Risiko Utama
- **Cache subscription stale**: `useSubscription` cache module-scope bertahan selama page hidup. Jika user upgrade/downgrade di tab lain, data bisa stale sampai refresh. Solusi: existing `refresh()` sudah ada, dan `useSubscription` memanggil background fetch. Cukup pastikan tidak ada logic yang menghapus cache secara tiba-tiba.
- **Desktop mundur**: Semua perubahan menggunakan responsive prefix (`sm:`, `md:`, `lg:`). Desktop `lg:` tetap `p-4` ke atas, wordmark tetap terlihat, sidebar card layout tetap.
- **BalanceSheet refactor**: Ganti dari manual fetch ke `useReports.ts` hook. Harus pastikan `enabled: !!companyId` tidak skip fetch secara diam-diam — akan ditangani dengan kondisi render di page.

---

## Urutan Eksekusi (untuk agent implementasi)
1. Build check: jalankan `npm run build` di `frontend/` untuk baseline.
2. Fix P0: 5 detail pages + TextReveal language key.
3. Build check.
4. Fix P1: Refactor BalanceSheet.tsx.
5. Build check + manual test: klik Balance Sheet, ganti periode, pastikan skeleton + refetch bar bekerja.
6. Fix P2: Header, AppShell, Navbar, CashFlowChart, letter-split keys.
7. Build check + manual test di viewport 300px (devtools).
8. Fix P3: Onboarding i18n, AuthPage i18n.
9. Build check.
10. Fix P4: Currency break-words, Pricing toggle, Home hero.
11. Final build check + lint (`npm run lint`).

---

## Checklist Validasi Akhir
- [ ] `npm run build` lolos, no unused imports, `verbatimModuleSyntax`/`noUnusedLocals` terpenuhi.
- [ ] Klik Income / Balance / Cash Flow: maksimal 1 indikator loading; header/nav tetap.
- [ ] Ganti periode: data lama tetap kelihatan sampai data baru datang.
- [ ] Viewport 300px: tidak scroll horizontal; dropdown/filter/judul/angka/chart muat.
- [ ] Desktop 1280px: tidak mundur.
- [ ] Ganti ID/EN: teks tidak blank, tidak ada typewriter 2 detik.
- [ ] Slug detail salah → NotFoundPage (`/not-found`), bukan MarketingPage.
- [ ] Onboarding tampil dalam bahasa yang benar.
- [ ] Semua public + app page tidak scroll-x di 300px.
