# LedgerFlow

**LedgerFlow** adalah aplikasi akuntansi dan pembukuan berbasis web modern yang dirancang untuk membantu usaha mengelola keuangan secara digital. Aplikasi ini mendukung pencatatan jurnal, buku besar, laporan keuangan (Laba Rugi, Neraca, Arus Kas), chart of accounts, manajemen periode, multi-perusahaan, serta sistem subscription dan pembayaran terintegrasi.

---

## Daftar Isi

- [✅ Checklist Kepatuhan Ketentuan Projekan S1](#-checklist-kepatuhan-ketentuan-projekan-s1)
- [Tech Stack](#tech-stack)
- [Arsitektur Aplikasi](#arsitektur-aplikasi)
- [Struktur Proyek](#struktur-proyek)
- [Backend](#backend)
- [Frontend](#frontend)
- [Database](#database)
- [API Endpoints](#api-endpoints)
- [Cara Menjalankan](#cara-menjalankan)
- [Fitur Detail](#fitur-detail)
- [Akun Demo](#akun-demo)
- [Dokumentasi Perancangan Sistem (Flowchart)](#dokumentasi-perancangan-sistem-flowchart)

---

## ✅ Checklist Kepatuhan Ketentuan Projekan S1

> Legend: ✅ Sudah sesuai · ⚠️ Sebagian / perlu dicek ulang · ❌ Belum ada, wajib dikerjakan.
> Update status ini setiap kali kamu menambal salah satu poin.

### FRONTEND

| # | Ketentuan | Status | Catatan / TODO |
|---|---|---|---|
| 1 | Responsive layout (mobile/tablet/desktop) | ⚠️ | Belum diverifikasi tiap halaman utama bebas overflow di 3 breakpoint |
| 2 | Auth flow: Login, Register, Logout, **Forgot Password**, **Reset Password** | ❌ | Hanya Login, Register, Google OAuth. **Forgot/Reset Password belum ada halaman & route-nya** |
| 2a | JWT disimpan di Local Storage/Cookie | ⚠️ | Perlu dipastikan & didokumentasikan cara penyimpanannya |
| 3 | Routing: Public, Private, **Role Route**, redirect jika tanpa akses | ⚠️ | Baru ada `ProtectedRoute`/`PublicRoute`. **Role-based route & redirect "no access" belum eksplisit** |
| 4 | Dashboard real-time (card summary, total data, statistik, aktivitas terbaru) | ✅ | `useDashboardData` + `DashboardPage` |
| 5 | CRUD Interface lengkap (List/Detail/Tambah/Edit/Hapus) per data utama | ⚠️ | Chart of Accounts & Journal sudah ada sebagian besar, tapi **halaman Detail & Edit belum lengkap di semua modul** |
| 6 | Search, Filter (status/kategori/tanggal), Sorting (terbaru/terlama/A-Z/Z-A), bisa dipakai bersamaan | ❌ | **Belum terlihat implementasinya di UI manapun** |
| 7 | Pagination (prev/next/nomor halaman/jumlah data/items-per-page) | ⚠️ | `usePagination` & `TablePagination` sudah dibuat, **pastikan sudah dipasang di semua list, termasuk pilihan jumlah data per halaman** |
| 8 | Upload file (gambar/PDF) | ❌ | **Belum ada fitur upload sama sekali** |
| 9 | Form validation realtime (required, min/max karakter, email, no. telp, konfirmasi password) | ❌ | **Belum terdokumentasi/diimplementasikan** |
| 10 | Notification (success/error/warning/info) via Toast | ✅ | `ToastContext` + `ToastContainer` |
| 11 | Halaman error 401/403/404/500 + fallback API gagal | ❌ | **Belum ada halaman error khusus** |

### BACKEND

| # | Ketentuan | Status | Catatan / TODO |
|---|---|---|---|
| 1 | REST API standar (GET/POST/PUT/PATCH/DELETE) + status code sesuai | ⚠️ | Kombinasi method belum konsisten di semua modul (lihat poin 4) |
| 2 | Register, Login, **Logout**, Refresh Token (opsional), **Forgot Password**, **Reset Password** | ❌ | **Logout, Forgot Password, Reset Password belum ada endpoint** |
| 3 | RBAC minimal 2 role, hak akses beda | ✅ | admin/akuntan/owner via `requireRole` |
| 4 | CRUD lengkap (C/R/U/D) di minimal 6 entitas utama, tidak boleh dummy | ⚠️ | `accounts` sudah full CRUD. **`journal` belum ada UPDATE (PUT)**, **`periods` belum ada DELETE**, `ledger` sifatnya read-only (bukan entitas CRUD) |
| 5 | Server-side validation (required/email/unique/min/max/enum/numeric/date), error JSON | ❌ | **Belum terdokumentasi apakah sudah diterapkan di semua endpoint POST/PUT** |
| 6 | Upload file (gambar/PDF) di backend | ❌ | **Belum ada** |
| 7 | Global error handling 400/401/403/404/422/500, format response konsisten | ❌ | **Belum terdokumentasi** |
| 8 | DB relationship: 6 tabel utama, 5 relasi, wajib ada 1:1, 1:M, M:1, **M:M** | ⚠️ | 1:1 (`subscriptions.user_id` unique), 1:M & M:1 sudah banyak. **Belum ada relasi Many-to-Many (butuh tabel junction)** |
| 9 | Soft delete minimal 2 tabel | ⚠️ | Baru `accounts` (`is_active`). **Perlu 1 tabel lagi, mis. `journal_entries` pakai `deleted_at`** |
| 10 | API Documentation (Swagger/OpenAPI/Postman Collection) | ❌ | **Belum ada sama sekali** |
| 11 | Security: Password Hashing, JWT, CORS, Request Validation, SQL Injection Prevention, (XSS = nilai tambah) | ⚠️ | JWT ✅, CORS disebut ✅. **Password hashing belum eksplisit didokumentasikan**, request validation & SQL injection prevention perlu dipastikan |
| 12 | Search, Filter, Sorting, Pagination di endpoint list (`?search=&status=&sort=&page=`) | ❌ | Endpoint saat ini baru filter dasar (`period_id`, `status`), **belum ada search/sort/pagination query param yang konsisten** |

### DATABASE

| # | Ketentuan | Status | Catatan / TODO |
|---|---|---|---|
| 1 | Minimal 6 tabel utama | ✅ | 9 tabel (`companies`, `users`, `accounts`, `periods`, `journal_entries`, `journal_entry_lines`, `plans`, `subscriptions`, `payments`) |
| 2 | Minimal 5 relasi antar tabel | ✅ | Terpenuhi |
| 3 | Primary Key & Foreign Key | ✅ | Terpenuhi |
| 4 | Normalisasi minimal 3NF | ✅ | Struktur sudah cukup ternormalisasi |
| 5 | Timestamp `created_at` & `updated_at` di **setiap** tabel utama | ❌ | **`accounts`, `periods`, `journal_entries`, `journal_entry_lines` belum punya `created_at`+`updated_at` lengkap** — hanya sebagian tabel (`subscriptions`, `payments`, `plans`) yang lengkap |
| 6 | Soft delete minimal 2 tabel | ⚠️ | Sama seperti poin backend #9, baru 1 tabel (`accounts`) |
| 7 | Seed data minimal 20 data/tabel utama | ❌ | **Belum ada seed data sama sekali** (hanya `plans` diisi 3 baris default) |

### TATA CARA PENGUMPULAN

| # | Ketentuan | Status | Catatan / TODO |
|---|---|---|---|
| 1 | Fullstack FE + BE dalam 1 repo (monorepo) | ✅ | Struktur sudah monorepo |
| 2 | Repository GitHub public | ⚠️ | Perlu dipastikan visibility repo = Public |
| 3 | README berisi: judul, deskripsi, fitur utama, teknologi, struktur folder, cara instalasi | ✅ | Sudah lengkap di README ini |
| 4 | Akun demo (jika diperlukan) | ❌ | **Belum dicantumkan** — isi section [Akun Demo](#akun-demo) di bawah |
| 5 | Dokumentasi perancangan sistem berupa Flowchart | ❌ | **Belum ada** — tambahkan di section [Dokumentasi Perancangan Sistem](#dokumentasi-perancangan-sistem-flowchart) |

---

## Tech Stack

### Backend

| Teknologi | Kegunaan |
|---|---|
| **Hono** | Framework web TypeScript ringan untuk API REST |
| **Supabase** | Database dan backend service |
| **Midtrans** | Payment gateway |
| **Google Auth** | OAuth 2.0 login |

### Frontend

| Teknologi | Kegunaan |
|---|---|
| **React** | Library UI |
| **TypeScript** | Type safety |
| **Vite** | Build tool |
| **Tailwind CSS** | CSS framework |
| **React Router** | Client-side routing |
| **TanStack React Query** | Data fetching |
| **Axios** | HTTP client |
| **Recharts** | Chart library |



---

## Arsitektur Aplikasi

```
┌─────────────────────────────────────────────────────┐
│                    Browser                           │
│  ┌───────────────────────────────────────────────┐  │
│  │              React SPA (Vite)                  │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────────┐  │  │
│  │  │  Pages  │ │Components│ │  Context/Hooks │  │  │
│  │  └────┬────┘ └────┬─────┘ └───────┬───────┘  │  │
│  │       └───────────┼───────────────┘           │  │
│  │                   ▼                           │  │
│  │           ┌──────────────┐                    │  │
│  │           │  API Layer   │ (Axios + interceptor)│  │
│  │           └──────┬───────┘                    │  │
│  └──────────────────┼────────────────────────────┘  │
└─────────────────────┼───────────────────────────────┘
                      │ HTTP/JSON
                      ▼
┌─────────────────────────────────────────────────────┐
│               Backend (Hono)                         │
│  ┌──────────┐ ┌──────────┐ ┌────────────────────┐  │
│  │  Routes  │ │Middleware│ │  Lib (JWT, Midtrans)│  │
│  └────┬─────┘ └──────────┘ └────────┬───────────┘  │
│       │                             │               │
│       └─────────────┬───────────────┘               │
│                     ▼                               │
│            ┌────────────────┐                       │
│            │  Supabase SDK  │                       │
│            └────────┬───────┘                       │
└─────────────────────┼───────────────────────────────┘
                      │
                      ▼
            ┌─────────────────────┐
            │  Supabase Platform  │
            │  ┌───────────────┐  │
            │  │  PostgreSQL   │  │
            │  │  + RLS        │  │
            │  └───────────────┘  │
            │  ┌───────────────┐  │
            │  │  Auth Service │  │
            │  └───────────────┘  │
            └─────────────────────┘

Payment Flow:
  Frontend → Backend POST /subscribe
           → Midtrans Snap popup
           → User bayar
           → Midtrans Webhook → Backend → Supabase
```

---

## Struktur Proyek

```
LedgerFlow/
├── backend/
│   ├── src/
│   │   ├── index.ts                    # Entry point, route mounting, middleware global
│   │   ├── routes/
│   │   │   ├── auth.ts                 # Register, login, exchange-token, Google OAuth
│   │   │   ├── accounts.ts             # CRUD Chart of Accounts
│   │   │   ├── journal.ts              # CRUD Journal Entries + posting
│   │   │   ├── ledger.ts               # Buku Besar per akun
│   │   │   ├── reports.ts              # Laporan: Laba Rugi, Neraca, Arus Kas
│   │   │   ├── periods.ts              # Manajemen periode akuntansi
│   │   │   ├── payments.ts             # Subscription & Midtrans payment flow
│   │   │   ├── users.ts                # Profil user & avatar
│   │   │   └── companies.ts            # Manajemen perusahaan
│   │   ├── lib/
│   │   │   ├── supabase.ts             # Supabase admin client
│   │   │   ├── jwt.ts                  # JWT sign & verify (jose)
│   │   │   └── midtrans.ts             # Midtrans Snap, Core API, helpers
│   │   ├── middleware/
│   │   │   └── auth.ts                 # Auth middleware + RBAC middleware
│   │   └── midtrans.d.ts              # Type definitions Midtrans
│   ├── .env                            # Environment variables backend
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx                    # Entry point React, provider wrapping
│   │   ├── App.tsx                     # Router, guards, layout
│   │   ├── pages/                      # Halaman-halaman aplikasi
│   │   │   ├── HomePage.tsx            # Landing page
│   │   │   ├── LoginPage.tsx           # Login (email + Google OAuth)
│   │   │   ├── RegisterPage.tsx        # Register
│   │   │   ├── AuthCallback.tsx        # Google OAuth callback handler
│   │   │   ├── DashboardPage.tsx       # Dashboard utama
│   │   │   ├── ChartOfAccounts.tsx     # Chart of Accounts (CRUD)
│   │   │   ├── JournalEntryPage.tsx    # Jurnal entries
│   │   │   ├── BukuBesarPage.tsx       # Buku besar
│   │   │   ├── IncomeStatementPage.tsx # Laporan Laba Rugi
│   │   │   ├── BalanceSheet.tsx        # Neraca
│   │   │   ├── CashFlowPage.tsx        # Arus Kas
│   │   │   ├── PeriodManagement.tsx    # Manajemen periode
│   │   │   ├── PricingPage.tsx         # Halaman pricing & upgrade
│   │   │   ├── PaymentResultPage.tsx   # Hasil pembayaran (success/pending/failed)
│   │   │   ├── ProfilePage.tsx         # Profil user
│   │   │   ├── SettingsPage.tsx        # Settings
│   │   │   └── HelpCenterPage.tsx      # Pusat bantuan
│   │   ├── components/
│   │   │   ├── AppShell.tsx            # Layout utama (Header + Sidebar + Main)
│   │   │   ├── Header.tsx              # Top navigation bar
│   │   │   ├── Sidebar.tsx             # Sidebar navigasi
│   │   │   ├── Navbar.tsx              # Navbar responsif
│   │   │   ├── Footer.tsx              # Footer
│   │   │   ├── PageTransition.tsx      # Animasi transisi halaman
│   │   │   ├── ThemeSwitcher.tsx       # Dark/light mode toggle
│   │   │   ├── LogoMark.tsx            # Logo SVG
│   │   │   ├── AccountModal.tsx        # Modal tambah/edit akun
│   │   │   ├── AccountTable.tsx        # Tabel chart of accounts
│   │   │   ├── AccountShared.tsx       # Shared account utilities
│   │   │   ├── journal/
│   │   │   │   ├── JournalForm.tsx     # Form input jurnal
│   │   │   │   ├── JournalList.tsx     # Daftar jurnal
│   │   │   │   ├── JournalDetail.tsx   # Detail jurnal
│   │   │   │   ├── JournalShared.tsx   # Shared journal utilities
│   │   │   │   ├── ConfirmDialog.tsx   # Dialog konfirmasi
│   │   │   ├── ledger/
│   │   │   │   ├── LedgerTable.tsx     # Tabel buku besar
│   │   │   │   ├── LedgerFilter.tsx    # Filter buku besar
│   │   │   │   └── LedgerShared.tsx    # Shared ledger utilities
│   │   │   ├── reports/
│   │   │   │   ├── BalanceSheetCard.tsx    # Kartu neraca
│   │   │   │   ├── BalanceSheetTable.tsx   # Tabel neraca
│   │   │   │   └── BalanceSheetStatus.tsx  # Status keseimbangan neraca
│   │   │   ├── CashFlowChart.tsx       # Chart arus kas
│   │   │   ├── TablePagination.tsx     # Pagination tabel
│   │   │   ├── InfoPanel.tsx           # Panel informasi
│   │   │   ├── HoverDropdown.tsx       # Dropdown hover
│   │   │   ├── ToastContainer.tsx      # Container notifikasi
│   │   │   ├── Paywall.tsx             # Paywall untuk fitur premium
│   │   │   └── ProtectedFeature.tsx    # Gate fitur berdasarkan subscription
│   │   ├── hooks/
│   │   │   ├── useAccounts.ts          # Data fetching akun
│   │   │   ├── useJournal.ts           # Data fetching jurnal
│   │   │   ├── useLedger.ts            # Data fetching buku besar
│   │   │   ├── useDashboardData.ts     # Data dashboard
│   │   │   ├── useIncomeStatement.ts   # Data laba rugi
│   │   │   ├── useCashFlow.ts          # Data arus kas
│   │   │   ├── useSubscription.ts      # Status subscription & akses fitur
│   │   │   └── usePagination.ts        # Hook pagination
│   │   ├── services/
│   │   │   ├── accountsService.ts      # API calls akun
│   │   │   ├── journalService.ts       # API calls jurnal
│   │   │   ├── ledgerService.ts        # API calls buku besar
│   │   │   ├── reportsService.ts       # API calls laporan
│   │   │   ├── periodsService.ts       # API calls periode
│   │   │   └── paymentService.ts       # API calls pembayaran
│   │   ├── context/
│   │   │   ├── AuthContext.tsx          # Context autentikasi (login, logout, register)
│   │   │   └── ToastContext.tsx         # Context notifikasi toast
│   │   ├── types/
│   │   │   ├── account.ts              # Tipe data akun
│   │   │   ├── journal.ts              # Tipe data jurnal
│   │   │   ├── ledger.ts               # Tipe data buku besar
│   │   │   ├── reports.ts              # Tipe data laporan
│   │   │   └── constants.ts            # Konstanta
│   │   ├── lib/
│   │   │   ├── api.ts                  # Axios instance + interceptors
│   │   │   ├── supabaseClient.ts       # Supabase client frontend
│   │   │   └── utils.ts               # Utility functions
│   │   └── utils/
│   │       ├── authHelpers.ts          # Helper autentikasi
│   │       ├── currency.ts             # Format mata uang IDR
│   │       └── exportPDF.ts            # Export laporan ke PDF
│   ├── .env                            # Environment variables frontend
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── eslint.config.js
│   ├── vercel.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   └── tsconfig.node.json
├── database/
│   └── database.sql                    # Full database schema & migrations
├── GOOGLE_OAUTH_SETUP.md               # Dokumentasi setup Google OAuth
├── .gitignore
├── package.json                        # Root workspace (concurrently)
└── README.md
```

---

## Backend

### Arsitektur Backend

Backend menggunakan **Hono**, framework web TypeScript ringan yang cepat dan memiliki ekosistem middleware yang baik. Server berjalan di Node.js via `@hono/node-server`.

### Entry Point (`backend/src/index.ts`)

File utama yang menginisialisasi aplikasi Hono dan melakukan:

1. **Global middleware** — Logger, CORS, error handler
2. **Route mounting** — Semua route di-mount di path `/api/*`
3. **Health check** — `GET /health` untuk monitoring

### Authentication System (`backend/src/routes/auth.ts`)

Sistem autentikasi mendukung tiga metode:

1. **Register (`POST /api/auth/register`)** — Buat company, user, dan profil baru
2. **Login (`POST /api/auth/login`)** — Verifikasi kredensial dan generate token
3. **Exchange Token (`POST /api/auth/exchange-token`)** — Konversi token OAuth ke token aplikasi

### JWT System (`backend/src/lib/jwt.ts`)

- Library: **jose** untuk sign & verify token
- Token berisi data user dan company

### Auth Middleware (`backend/src/middleware/auth.ts`)

1. **`authMiddleware`** — Middleware utama:
   - Ekstrak dan verifikasi Bearer token dari header `Authorization`
   - Simpan payload user ke context untuk digunakan di route handlers

2. **`requireRole(...roles)`** — Middleware untuk membatasi akses berdasarkan role user

### Supabase Client (`backend/src/lib/supabase.ts`)

- Satu instance global untuk operasi database
- Validasi environment variables sebelum inisialisasi

### Payment & Subscription System (`backend/src/routes/payments.ts`)

Sistem pembayaran terintegrasi dengan **Midtrans** (payment gateway Indonesia) dengan endpoint lengkap:

1. **`GET /plans`** — Ambil semua plan aktif (Free/Pro/Enterprise) untuk pricing page

2. **`GET /is-sandbox`** — Cek apakah mode sandbox (berguna untuk menampilkan tombol simulasi)

3. **`GET /subscription`** — Ambil data subscription user

4. **`POST /subscribe`** — Buat transaksi pembayaran:
   - Validasi plan
   - Buat transaksi di Midtrans Snap API
   - Simpan payment record
   - Return snap token ke frontend

5. **`POST /test-complete`** — Simulasi pembayaran berhasil (sandbox only)

6. **`POST /webhook`** — Midtrans webhook handler:
   - Verifikasi notifikasi dari Midtrans
   - Mapping status pembayaran
   - Update payment & subscription status
   - Return response ke Midtrans

7. **`GET /history`** — Riwayat pembayaran (20 transaksi terakhir)

8. **`POST /cancel`** — Cancel subscription (downgrade ke Free, status "canceled")

9. **`GET /check-access`** — Cek akses user ke fitur tertentu

### Midtrans Library (`backend/src/lib/midtrans.ts`)

- Konfigurasi Snap + Core API
- Helper untuk generate order ID
- Helper untuk verifikasi notifikasi webhook
- Konstanta harga subscription

### Chart of Accounts (`backend/src/routes/accounts.ts`)

- **`GET /`** — Ambil semua akun milik company (urutan kode ascending)
- **`POST /`** — Buat akun baru (admin/owner only):
  - Mapping tipe frontend ke enum database
  - Otomatis tentukan `normal_balance` dari tipe akun
  - Dukungan `parent_id` untuk hierarki akun
- **`PUT /:id`** — Update akun (admin/akuntan/owner):
  - Mapping ulang tipe akun
  - Hapus field undefined agar tidak overwrite
  - Multi-tenant guard via `company_id`
- **`DELETE /:id`** — Soft delete (set `is_active: false`), admin only

### Journal Entries (`backend/src/routes/journal.ts`)

- **`GET /`** — List jurnal, filter by `period_id` dan `status`
- **`GET /:id`** — Detail satu jurnal
- **`POST /`** — Buat jurnal baru (owner/akuntan only)
- **`POST /:id/post`** — Posting jurnal (draft → posted)
- **`DELETE /:id`** — Hapus jurnal

### Ledger / Buku Besar (`backend/src/routes/ledger.ts`)

- **`GET /`** — Tampilkan mutasi buku besar per akun dalam periode tertentu

### Reports (`backend/src/routes/reports.ts`)

1. **Income Statement (`GET /income-statement`)** — Laporan Laba Rugi
2. **Balance Sheet (`GET /balance-sheet`)** — Neraca
3. **Cash Flow (`GET /cash-flow`)** — Laporan Arus Kas (Metode Tidak Langsung)

4. **Periods (`GET /periods`)** — Ambil daftar periode untuk filter laporan

### Periods Management (`backend/src/routes/periods.ts`)

- **`GET /`** — List semua periode
- **`POST /`** — Buka periode baru
- **`PATCH /:id/close`** — Tutup periode

### Users (`backend/src/routes/users.ts`)

- **`GET /:id`** — Ambil profil user
- **`PUT /:id`** — Update profil user

---

## Frontend

### Arsitektur Frontend

Frontend adalah **Single Page Application (SPA)** menggunakan React 19 dengan Vite sebagai build tool. Data fetching dikelola oleh TanStack React Query dengan Axios sebagai HTTP client.

### Entry Point (`frontend/src/main.tsx`)

```
AuthProvider → ToastProvider → App
```

Provider wrapping:
- **AuthProvider**: menyediakan context autentikasi global
- **ToastProvider**: menyediakan context notifikasi
- **App**: router + query client provider

### Routing & Route Guards (`frontend/src/App.tsx`)

**Route Guards:**
- **`ProtectedRoute`** — Cek `token` dan `loading` dari `useAuth()`. Jika belum login, redirect ke `/login`. Menampilkan spinner saat loading.
- **`PublicRoute`** — Jika sudah login, redirect ke `/dashboard`.

**Theme System:**
- Inisialisasi tema dari localStorage
- Support: light, dark, system (mendeteksi prefers-color-scheme)
- Listener perubahan tema sistem

**Route Structure:**
| Path | Halaman | Guard |
|---|---|---|
| `/` | HomePage | Public |
| `/login` | LoginPage | PublicRoute |
| `/register` | RegisterPage | PublicRoute |
| `/auth/callback` | AuthCallback | - |
| `/dashboard` | DashboardPage | ProtectedRoute |
| `/chart-of-accounts` | ChartOfAccounts | ProtectedRoute |
| `/journal-entries` | JournalEntryPage | ProtectedRoute |
| `/buku-besar` | BukuBesarPage | ProtectedRoute |
| `/period-management` | PeriodManagement | ProtectedRoute |
| `/profile` | ProfilePage | ProtectedRoute |
| `/settings` | SettingsPage | ProtectedRoute |
| `/help-center` | HelpCenterPage | ProtectedRoute |
| `/income-statement` | IncomeStatementPage | ProtectedRoute + ProtectedFeature |
| `/balance-sheet` | BalanceSheet | ProtectedRoute + ProtectedFeature |
| `/cash-flow` | CashFlowPage | ProtectedRoute + ProtectedFeature |
| `/pricing` | PricingPage | Public |
| `/payment/success` | PaymentResultPage | Public |
| `/payment/pending` | PaymentResultPage | Public |
| `/payment/failed` | PaymentResultPage | Public |

### Auth Context (`frontend/src/context/AuthContext.tsx`)

State management autentikasi global untuk login, logout, register, dan Google OAuth.

### API Layer (`frontend/src/lib/api.ts`)

Axios instance untuk komunikasi frontend ke backend.

### Feature Gate (`frontend/src/components/ProtectedFeature.tsx`)

Wrapper untuk halaman premium:
- Gunakan `useSubscription` hook
- Loading state: tampilkan spinner dalam AppShell
- Tidak punya akses: tampilkan `<Paywall>` dengan info plan yang dibutuhkan
- Punya akses: render children (halaman asli)

### Layout System (`frontend/src/components/AppShell.tsx`)

Layout utama aplikasi setelah login:
- **Header** — Top bar dengan menu toggle, breadcrumb, user menu
- **Sidebar** — Navigasi utama, response (mobile overlay)
- **Background** — Gradient + decorative orbs dengan animasi

### Hooks Architecture

Semua data fetching dikelola via custom hooks:
- **`useAccounts()`** — Fetch, create, update, delete akun
- **`useJournal()`** — CRUD jurnal entries + posting
- **`useLedger()`** — Fetch data buku besar dengan filter
- **`useDashboardData()`** — Aggregate data untuk dashboard
- **`useIncomeStatement()`** — Fetch laporan laba rugi
- **`useCashFlow()`** — Fetch laporan arus kas
- **`useSubscription()`** — Cek subscription status, akses fitur
- **`usePagination()`** — State pagination reusable

### Services Layer

Setiap service adalah modul yang membungkus panggilan API ke backend:
- `accountsService.ts` — CRUD operasi akun
- `JournalService.ts` — CRUD operasi jurnal
- `ledgerService.ts` — Fetch buku besar
- `reportsService.ts` — Fetch laporan keuangan
- `periodsService.ts` — Manajemen periode
- `paymentService.ts` — Subscribe, subscription info, payment history

### Types System

TypeScript types terdefinisi untuk setiap modul:
- **account.ts**: `AccountType` (asset/liability/equity/revenue/expense), `NormalBalance`, `Account`, `AccountFormData`
- **journal.ts**: `JournalEntry`, `JournalLine`, `CreateJournalPayload`, `JournalEntryForm`
- **ledger.ts**: Types untuk buku besar
- **reports.ts**: Types untuk laporan

### Utility Functions

- **`currency.ts`** — Format angka ke format Rupiah (IDR) dengan `Intl.NumberFormat`
- **`exportPDF.ts`** — Generate PDF laporan menggunakan jsPDF + jspdf-autotable
- **`authHelpers.ts`** — Helpers autentikasi

---

## Database

Database menggunakan **PostgreSQL via Supabase** dengan schema lengkap untuk akuntansi dan subscription.

### Tabel Utama

| Tabel | Fungsi |
|---|---|
| `companies` | Data perusahaan (multi-tenant) |
| `users` | Profil user, relasi ke company, avatar_url |
| `accounts` | Chart of Accounts (COA) dengan hierarki parent-child |
| `periods` | Periode akuntansi (open/closed) |
| `journal_entries` | Header jurnal (entry_number, date, status draft/posted) |
| `journal_entry_lines` | Detail jurnal (debit/credit per akun) |
| `plans` | Definisi plan pricing (Free/Pro/Enterprise) |
| `subscriptions` | Subscription user dengan status dan trial period |
| `payments` | Riwayat pembayaran dengan integrasi Midtrans |

### Enums

| Enum | Values |
|---|---|
| `subscription_plan` | `free`, `pro`, `enterprise` |
| `subscription_status` | `active`, `trialing`, `past_due`, `canceled`, `expired` |
| `payment_status` | `pending`, `paid`, `failed`, `expired`, `refunded` |

### Key Features

1. **Auto-create subscription** — Subscription otomatis dibuat saat user register
2. **Helper function** — Fungsi untuk cek status subscription

---

## API Endpoints

### Auth
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/auth/register` | Register user + company baru |
| POST | `/api/auth/login` | Login dengan email & password |
| POST | `/api/auth/exchange-token` | Exchange Supabase/OAuth token ke JWT internal |
| POST | `/api/auth/google` | Google OAuth login |

### Accounts
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/accounts` | List akun (by company_id dari JWT) |
| POST | `/api/accounts` | Buat akun baru (admin/owner) |
| PUT | `/api/accounts/:id` | Update akun (admin/akuntan/owner) |
| DELETE | `/api/accounts/:id` | Soft delete akun (admin) |

### Journal Entries
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/journal` | List jurnal (filter: period_id, status) |
| GET | `/api/journal/:id` | Detail jurnal + lines |
| POST | `/api/journal` | Buat jurnal baru (owner/akuntan) |
| POST | `/api/journal/:id/post` | Posting jurnal (draft → posted) |
| DELETE | `/api/journal/:id` | Hapus jurnal |

### Ledger
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/ledger` | Buku besar per akun |

### Reports
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/reports/income-statement` | Laporan Laba Rugi |
| GET | `/api/reports/balance-sheet` | Neraca |
| GET | `/api/reports/cash-flow` | Arus Kas (Indirect Method) |
| GET | `/api/reports/periods` | Daftar periode untuk filter |

### Periods
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/periods` | List periode |
| POST | `/api/periods` | Buka periode baru |
| PATCH | `/api/periods/:id/close` | Tutup periode |

### Payments & Subscription
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/payments/plans` | Daftar plan pricing |
| GET | `/api/payments/is-sandbox` | Cek mode sandbox |
| GET | `/api/payments/subscription` | Data subscription user |
| POST | `/api/payments/subscribe` | Buat transaksi pembayaran |
| POST | `/api/payments/test-complete` | Force-complete (sandbox) |
| POST | `/api/payments/webhook` | Midtrans webhook |
| GET | `/api/payments/history` | Riwayat pembayaran |
| POST | `/api/payments/cancel` | Cancel subscription |
| GET | `/api/payments/check-access` | Cek akses fitur |

### Users
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/users/:id` | Profil user |
| PUT | `/api/users/:id` | Update profil |

### System
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/health` | Health check |

---

## Cara Menjalankan

### Prerequisites

- Node.js >= 18
- npm >= 9

### Installation

```bash
# Clone repository
git clone <repo-url>
cd LedgerFlow

# Install semua dependencies (root + backend + frontend)
npm install
```

### Database Setup

Jalankan script `database/database.sql` pada database PostgreSQL Anda.

### Development

```bash
# Jalankan backend + frontend bersamaan
npm run dev

# Atau terpisah
npm run dev:backend   # http://localhost:3000
npm run dev:frontend  # http://localhost:5173
```

### Production Build

```bash
# Build backend
npm run build --workspace=backend   # Output: backend/dist/

# Build frontend
npm run build --workspace=frontend  # Output: frontend/dist/
```

---

## Fitur Detail

### 1. Chart of Accounts (COA)
- Kelola akun keuangan dengan kode dan nama
- 5 tipe akun: Asset, Liability, Equity, Revenue, Expense
- Normal balance otomatis dari tipe akun
- Hierarki akun (parent-child) via `parent_id`
- Soft delete (nonaktifkan tanpa hapus permanen)
- Filter: semua/aktif/nonaktif, filter per tipe

### 2. Journal Entries
- Input jurnal dengan sistem double-entry
- Validasi debit = kredit dengan toleransi 0.01
- Auto-generate nomor jurnal per bulan
- Auto-detect periode dari tanggal entry
- Cegah input di periode yang sudah ditutup
- Status: draft (bisa diedit) / posted (final)
- Rollback otomatis jika insert gagal

### 3. Buku Besar (Ledger)
- Tampilkan mutasi per akun
- Filter: periode atau range tanggal
- Hitung saldo awal, debit/kredit periode, saldo akhir
- Running balance per transaksi
- Multi-tenant: hanya data milik company yang login

### 4. Laporan Keuangan
- **Laba Rugi**: Pendapatan - Beban = Laba Bersih
- **Neraca**: Aset = Liabilitas + Ekuitas (termasuk laba berjalan)
- **Arus Kas** (Metode Tidak Langsung): Operasi, Investasi, Pendanaan
- Filter per periode
- Export PDF

### 5. Manajemen Periode
- Buka periode per bulan
- Tutup periode (cegah modifikasi data historis)
- Validasi: jurnal hanya bisa diinput di periode "open"

### 6. Multi-Perusahaan
- Satu akun bisa memiliki banyak perusahaan
- Data terisolasi per perusahaan

### 7. Subscription & Payment
- 3 tier: Free (50 jurnal/bulan), Pro (Rp99rb/bln), Enterprise (Rp299rb/bln)
- Trial 15 hari untuk semua user baru
- Midtrans payment: GoPay, Bank Transfer, Kartu Kredit, dll
- Webhook Midtrans untuk update status otomatis
- Sandbox mode dengan test-complete endpoint
- Cancel subscription (downgrade ke Free)
- Feature access control berdasarkan plan

### 8. Autentikasi
- Register dengan email & password
- Login email & password
- Google One-Click Login (OAuth 2.0)
- Role-based access

### 9. Dark Mode
- Toggle light/dark/system theme
- Persisted di localStorage
- Smooth transition

### 10. Export PDF
- Laporan keuangan bisa di-export ke PDF
- Menggunakan jsPDF + jspdf-autotable
- Format tabel dengan styling

---

## Akun Demo

> ⚠️ **TODO:** Ketentuan pengumpulan mewajibkan akun demo (username & password) apabila diperlukan untuk menguji aplikasi. Isi tabel di bawah dengan akun uji yang sudah kamu seed di database.

| Role | Email | Password | Keterangan |
|---|---|---|---|
| Owner | `owner@demo.com` | `ganti-ini` | Akses penuh 1 company |
| Admin | `admin@demo.com` | `ganti-ini` | Kelola akun & role |
| Akuntan | `akuntan@demo.com` | `ganti-ini` | Input & posting jurnal |

---

## Dokumentasi Perancangan Sistem (Flowchart)

> ⚠️ **TODO:** Ketentuan projekan mewajibkan dokumentasi perancangan sistem berupa **Flowchart**. Tambahkan diagram alur (mis. flow autentikasi, flow input jurnal sampai posting, flow pembayaran/subscription) di sini, atau lampirkan sebagai file terpisah (`docs/flowchart.png`) dan taruh link/gambarnya di bawah ini.

```
[Belum ada flowchart — tempel gambar/diagram di sini sebelum submit]
```

---