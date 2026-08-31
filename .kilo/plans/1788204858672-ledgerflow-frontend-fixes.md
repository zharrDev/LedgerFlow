# LedgerFlow — Live Crash + Security + Responsive Fixes

## Konteks
- Commit sebelumnya (`6ceae97`) sudah memperbaiki 404 routing, TextReveal i18n, BalanceSheet loading, layout 300px, Onboarding i18n, AuthPage i18n.
- Live Vercel (`ledger-flow-frontend-azure.vercel.app`) masih crash di `/balance-sheet` dan `/cash-flow` karena perubahan belum deploy + ada issue baru di HomePage.
- Backend security issues dilaporkan: paywall hanya FE, sandbox production, CORS `*`, smtp-test leak, avatar_url longgar.

## Batas yang Tidak Bisa Dilewati
- Jangan pindah token dari sessionStorage ke localStorage.
- Jangan ubah mekanisme test-complete/webhook signature/IDOR profil yang sudah fail-closed.
- Jangan ubah homepage 3D/hero video.
- Jangan ubah BrandedLoader saat `useAuth().loading`.
- Jangan rusak desktop `lg+` sidebar card layout.
- Jangan refactor di luar file terdampak.

---

## P0 — Live Crash (wajib, sudah diverifikasi di browser)

### 1) `/balance-sheet` crash: `useState is not defined`
- File: `frontend/src/pages/BalanceSheet.tsx`
- Gejala bundle live: `[n,c]=useState("")` tanpa import (bare identifier).
- Perbaiki: pastikan `import { useState, useEffect } from "react"` ada DAN tidak ada pemanggilan `useState` di luar hook/import.
- Validasi: `tsc` lolos + buka `/balance-sheet` render laporan, bukan ErrorPage.

### 2) `/cash-flow` crash: `loading is not defined`
- File: `frontend/src/pages/CashFlowPage.tsx` + `frontend/src/hooks/useCashFlow.ts`
- Gejala bundle live: destructure `isLoading:p` tapi JSX pakai `loading` (variabel tidak ada).
- Samakan nama: pakai `isLoading` (atau alias `loading: isLoading`) di SEMUA cabang:
  - ExportMenu `disabled`
  - Spinner
  - Error state
  - Empty state
- Hapus sisa `useState` lama jika ada.

### 3) `HomePage.tsx` missing imports
- File: `frontend/src/pages/HomePage.tsx`
- Gejala: `useState` / `useScroll` / `useTransform` dipakai, import React hanya `useEffect, useRef, Suspense, lazy`.
- Perbaiki: tambah import yang kurang ATAU hapus state video mati.
- Jangan pecah hero yang sudah jalan di live (foto + copy ID/EN).

---

## P0 — Security (backend)

### 4) Paywall hanya di FE → pindah ke backend
- File: `backend/src/routes/reports.ts` + `backend/src/routes/ai.ts`
- Saat ini hanya `authMiddleware`. Owner demo plan pro jadi lolos.
- Tambah cek plan/trial yang sama dengan `GET /api/payments/check-access` untuk:
  - `income_statement`, `balance_sheet`, `cash_flow`
  - `POST /api/ai/chat`
- JWT Free tanpa trial → 403.

### 5) Production mengaku sandbox
- File: `backend/src/routes/payments.ts` + env config
- Live `GET /api/payments/is-sandbox` → `{ is_sandbox: true }` karena `MIDTRANS_IS_PRODUCTION !== "true"`.
- Set env production. FE jangan auto `test-complete`.
- Endpoint tetap fail-closed tanpa `ALLOW_TEST_COMPLETE=true`.

### 6) CORS origin kosong = `*`
- File: `backend/src/index.ts`
- Saat ini: `origin: (origin) => (origin ? … : "*")`
- Live `GET /health` tanpa Origin → ACAO `*`.
- Jangan kirim `*` untuk request tanpa Origin (terutama credentialed).
- Tetap izinkan `localhost` + Vercel + `FRONTEND_URL`. Origin jahat sudah ditolak — pertahankan.

### 7) smtp-test info leak
- File: `backend/src/routes/health.ts`
- `GET /api/health/smtp-test` sebagai owner demo → 200 berisi host, user, port, status auth_failed.
- Jangan kembalikan host/user SMTP ke client. Cukup `ok/fail` generik.
- `net-test` tetap anti-SSRF private IP; jangan buka POST body arbitrary.

### 8) Upload `avatar_url`
- File: `backend/src/routes/users.ts`
- `PUT /api/users/:id` menerima `avatar_url` mentah; upload dataUrl longgar.
- Batasi MIME+ukuran; `avatar_url` hanya URL bucket avatars.

---

## P1 — Responsive + Routing (screenshot live 300px)

### 9) Navbar 300px overlap
- File: `frontend/src/components/Navbar.tsx`
- `<360px` sembunyikan wordmark + subtitle; sisakan logo | lang compact | theme | hamburger.
- `w-[calc(100%-2rem)]` di 300px terlalu sempit untuk semua kontrol.
- Pastikan tidak ada horizontal overflow visual.

### 10) Login/Register 300px judul letter-split
- File: `frontend/src/pages/AuthPage.tsx`
- Judul letter-split ("Welcome Back") hanya huruf "W" kelihatan (tiap huruf block).
- JANGAN split huruf di HP; `h1` text normal wrap.
- Input `min-w-0`, text tidak overflow.

### 11) `/:section` menelan 404
- File: `frontend/src/App.tsx`
- Tes: `/this-page-does-not-exist-xyz` dan `/404` menampilkan marketing "Every finance tool in one workflow". `/solutions/small-businesses` menampilkan Page Not Found.
- Route `/:section` terlalu greedy.
- Unknown path → `NotFoundPage`.
- `*DetailPage` jangan `Navigate to="/404"` (tertangkap marketing).
- Daftarkan 404 eksplisit SEBELUM atau ganti pola section ke whitelist slug.

### 12) Income 375px: 2 spinner terdeteksi
- File: `frontend/src/pages/IncomeStatementPage.tsx` + `frontend/src/components/ProtectedFeature.tsx`
- First load skeleton sekali; refetch jangan unmount data.
- Pastikan `isInitialLoad` vs `isRefetching` tidak sama-sama render spinner.

---

## Urutan Eksekusi
1. P0 crash: BalanceSheet import + CashFlow variable name + HomePage import.
2. Build check + verify `/balance-sheet` dan `/cash-flow` render.
3. P0 security: backend paywall + sandbox env + CORS + smtp-test + avatar_url.
4. Build check backend + curl test: `test-complete` 403, `users/:id` IDOR 403, `is-sandbox` false.
5. P1 responsive: Navbar 300px + AuthPage letter-split fix + App.tsx 404 routing.
6. Build check + screenshot 300px home/login/dashboard/income/balance/cash-flow.
7. Validasi akhir: Income 375px single spinner.

---

## Validasi Akhir
- [ ] `/balance-sheet` dan `/cash-flow` tidak ErrorPage.
- [ ] `tsc` / build frontend lolos; `HomePage.tsx` tidak reference `useState` tanpa import.
- [ ] Reviewer login owner@demo.com → dashboard ada seed README; akuntan@demo.com tidak 403 unverified.
- [ ] Reports/AI 403 untuk Free tanpa trial.
- [ ] `is-sandbox` false di production env; `test-complete` tetap 403.
- [ ] CORS tidak `*` untuk no-origin.
- [ ] Navbar 300px tidak overlap; login 300px judul utuh.
- [ ] URL acak = `NotFoundPage`, bukan marketing.
- [ ] Screenshot 300px: home, login, dashboard, income, balance, cash-flow.
- [ ] `curl` test-complete 403 dan users IDOR 403.
