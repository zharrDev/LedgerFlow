# Dokumentasi Alur Program — LedgerFlow

> Dokumen ini berisi **flowchart alur program LedgerFlow** end-to-end dalam format **Mermaid**
> (render otomatis di GitHub/GitLab, VS Code, atau mermaid.live).
>
> Sumber: `README.md` + implementasi aktual di
> `backend/src/routes/*`, `backend/src/index.ts`, `backend/src/ai/*`,
> `frontend/src/App.tsx`, `frontend/src/context/AuthContext.tsx`,
> `frontend/src/hooks/useSubscription.ts`, dan `frontend/src/components/ProtectedFeature.tsx`.

---

## Cara Melihat Flowchart

Beberapa versi isi yang sama — pilih sesuai kebutuhan:

| Versi | File | Cara lihat |
|---|---|---|
| **Pratinjau .drawio** (persis seperti tampilan di draw.io) | `docs/flowchart/drawio/NN-*.png` | Buka gambarnya. Ini hasil render **viewer resmi draw.io**, jadi yang kamu lihat = yang muncul di app.diagrams.net. |
| **PNG / SVG dari Mermaid** | `docs/flowchart/NN-*.png` dan `NN-*.svg` | Langsung buka file gambarnya — tidak perlu install apa pun, bisa ditempel ke chat/Word/Slack. |
| **Gambar .drawio** (praktis, bisa diedit & digeser) | `DOKUMENTASI_FLOWCHART.drawio` | Buka **https://app.diagrams.net** → *Open Existing Diagram* → pilih file ini. Atau install ekstensi VS Code **Draw.io Integration** (`hediet.vscode-drawio`) lalu klik file-nya. |
| **Mermaid** (text, gampang di-diff) | `DOKUMENTASI_FLOWCHART.md` (file ini) | Render otomatis di GitHub/GitLab, atau tempel ke https://mermaid.live |

File `.drawio` berisi **16 halaman** (satu halaman per alur di bawah) — pindah halaman lewat tab di bagian bawah editor draw.io. Ekspor ke PNG/SVG/PDF dari menu *File → Export as*.

### Notasi

| Bentuk | Arti |
|---|---|
| Kotak biru | Langkah/proses |
| Belah ketupat kuning | Keputusan (percabangan) |
| Oval hijau | Mulai / selesai |
| Silinder ungu | Database / penyimpanan |
| Kotak merah | Jalur gagal / ditolak (4xx, 5xx, "Tolak") |
| Garis abu-abu | Alur maju |
| **Garis oranye putus-putus** | **Alur kembali ke atas** (retry / cooldown / validasi ulang) — keluar dari sisi atas node, memutar lewat jalur khusus di kanan, lalu masuk lagi dari atas |
| Garis abu-abu putus-putus | Panggilan eksternal / webhook |
| Lengkungan kecil di persilangan garis | *Line jump* — penanda bahwa dua garis saling menyilang, bukan bertemu |

Setiap panah punya **titik sambung sendiri** di sisi node (tidak ada dua panah yang menempel di titik yang sama), dan semua garis dibuat **siku-siku** (tidak menyerong). Jalan mendatar selalu jatuh di celah antar-baris yang kosong, jadi tidak ada garis yang menembus kotak node.

**Regenerate semua turunannya** setelah diagram Mermaid diubah:

```bash
npm run flowchart               # .drawio + gambar PNG/SVG dari Mermaid
npm run flowchart:drawio-render # pratinjau .drawio + verifikasi tata letak
npm run flowchart:check         # verifikasi kesesuaian isi
```

Atau satu per satu:

| Perintah | Hasil |
|---|---|
| `node scripts/mermaid-to-drawio.mjs` | `DOKUMENTASI_FLOWCHART.drawio` (16 halaman) |
| `node scripts/render-mermaid.mjs` | `docs/flowchart/NN-*.svg` + `NN-*.png` (16 gambar, dari sumber Mermaid) |
| `node scripts/check-render.mjs` | Laporan angka: jumlah node/panah/subgraph cocok dengan `.drawio`, tidak ada kotak bertumpuk, tidak ada label kosong |
| `node scripts/render-drawio.mjs` | `docs/flowchart/drawio/NN-*.svg` + `NN-*.png` (16 pratinjau `.drawio`) **+ laporan verifikasi tata letak** |
| `node scripts/render-drawio-ascii.mjs <file> <halaman>` | Pratinjau `.drawio` sebagai ASCII di terminal |

### Cara tata letak `.drawio` diverifikasi

`scripts/render-drawio.mjs` membuka file `.drawio` di **viewer resmi draw.io** (`viewer-static.min.js`)
di dalam Chrome headless, lalu **mengukur jalur panah yang benar-benar digambar draw.io** —
bukan geometri perkiraan script pembuatnya. Tiap halaman diperiksa untuk:

| Pemeriksaan | Arti |
|---|---|
| node bertumpuk | dua kotak node saling menimpa |
| panah miring | ruas panah tidak siku-siku |
| panah menembus node | garis melewati kotak node yang bukan ujungnya |
| label keluar | teks keluar dari kotak node-nya |
| PNG kosong | gambar hasil ekspor tidak berisi apa-apa |

Frame subgraph dikecualikan dari pemeriksaan "menembus": panah masuk/keluar frame memang melewati
garisnya. Kolom **titik-ganda** dilaporkan terpisah dan bukan kegagalan — itu titik tambahan yang
router draw.io sisipkan sendiri, tidak terlihat di gambar.

Renderer memakai **Chrome yang sudah terpasang** di komputer (lewat `@mermaid-js/mermaid-cli` +
`puppeteer`), jadi tidak perlu mengunduh Chromium lagi. Karena itu pula `.cache/viewer.min.js`
(viewer draw.io, diunduh sekali) sudah masuk `.gitignore`.

Render 16 gambar dari Mermaid butuh ~4 menit, dan 16 pratinjau `.drawio` ~3 menit.

---

## Daftar Isi

1. [Arsitektur Sistem](#1-arsitektur-sistem)
2. [Alur Umum Program (End-to-End)](#2-alur-umum-program-end-to-end)
3. [Alur Routing & Route Guard](#3-alur-routing--route-guard)
4. [Alur Autentikasi WhatsApp OTP](#4-alur-autentikasi-whatsapp-otp)
5. [Alur Login Google (OAuth)](#5-alur-login-google-oauth)
6. [Alur Onboarding Pengguna Baru](#6-alur-onboarding-pengguna-baru)
7. [Alur Chart of Accounts (COA)](#7-alur-chart-of-accounts-coa)
8. [Alur Input Jurnal sampai Posting](#8-alur-input-jurnal-sampai-posting)
9. [Alur Buku Besar](#9-alur-buku-besar)
10. [Alur Laporan Keuangan & Export](#10-alur-laporan-keuangan--export)
11. [Alur Manajemen Periode](#11-alur-manajemen-periode)
12. [Alur Manajemen User & RBAC](#12-alur-manajemen-user--rbac)
13. [Alur Subscription & Pembayaran (Midtrans)](#13-alur-subscription--pembayaran-midtrans)
14. [Alur AI CFO Assistant (LangGraph)](#14-alur-ai-cfo-assistant-langgraph)
15. [Alur Request Backend (Middleware Pipeline)](#15-alur-request-backend-middleware-pipeline)
16. [Alur Upload File (Avatar & Bukti Pembayaran)](#16-alur-upload-file-avatar--bukti-pembayaran)

---

## 1. Arsitektur Sistem

Alur data dari browser sampai database: React SPA → API layer (Axios) → Backend Hono →
Supabase, dengan layanan eksternal Fonnte (WhatsApp OTP), Midtrans (pembayaran), dan
OpenRouter (LLM AI CFO).

```mermaid
flowchart TD
    subgraph Client["Browser — React SPA (Vite)"]
        UI["Pages / Components"]
        CTX["Context & Hooks<br/>AuthContext, ToastContext, React Query"]
        APIL["API Layer — Axios + Interceptor"]
        UI --> CTX --> APIL
    end

    APIL -->|"HTTP/JSON + Bearer JWT"| BE

    subgraph BE["Backend — Hono (Node.js)"]
        MW["Global Middleware<br/>logger, CORS, security headers, rate limit"]
        RT["Routes /api/*"]
        LIB["Lib: jwt, midtrans, whatsapp, storage, supabase"]
        MW --> RT --> LIB
    end

    LIB --> DB[("Supabase<br/>PostgreSQL + Auth + Storage")]
    RT --> FONNTE["Fonnte<br/>WhatsApp OTP"]
    RT --> MIDTRANS["Midtrans<br/>Snap & Core API"]
    RT --> OR["OpenRouter<br/>LLM AI CFO"]
    MIDTRANS -.->|"Webhook"| RT
```

---

## 2. Alur Umum Program (End-to-End)

Dari membuka aplikasi, gerbang autentikasi, onboarding, penggunaan modul, sampai logout.

```mermaid
flowchart TD
    A["User buka aplikasi"] --> B{"Punya token di<br/>localStorage?"}
    B -- Tidak --> C["Halaman publik<br/>Landing / Pricing / Help"]
    C --> D{"Pilih Login / Register"}
    D --> E["Autentikasi:<br/>WhatsApp OTP atau Google"]
    E --> F["JWT + user disimpan<br/>via lib/session.ts"]
    B -- Ya --> F
    F --> G{"Sudah onboarded?<br/>flag onboarded_&lt;userId&gt;"}
    G -- Belum --> H["Onboarding (bisa Lewati)"]
    H --> I
    G -- Sudah --> I["Dashboard"]
    I --> J{"Pilih modul"}
    J --> K["Jurnal / COA / Buku Besar /<br/>Laporan / Periode / User Mgmt"]
    K --> L["AI CFO Assistant<br/>FAB di pojok kanan bawah"]
    K --> M{"Logout?"}
    M -- Tidak --> I
    M -- Ya --> N["POST /api/auth/logout<br/>hapus token → /login"]
    N --> D
    L --> M
```

---

## 3. Alur Routing & Route Guard

Setiap route melewati guard bertingkat: **PublicRoute**, **ProtectedRoute**, **RoleRoute**,
dan **ProtectedFeature** (gerbang subscription). Role tidak berhak → `/error/403`.

```mermaid
flowchart TD
    A["Navigasi ke sebuah path"] --> B{"Jenis route?"}

    B -- "Public<br/>/, /pricing, /help, /terms, /error/:code" --> C["Render halaman publik"]

    B -- "PublicRoute<br/>/login, /register" --> D{"Sudah punya token?"}
    D -- Ya --> E["Redirect → /dashboard"]
    D -- Tidak --> F["Render AuthPage"]

    B -- "ProtectedRoute" --> G["AuthContext: loading?"]
    G -- Ya --> H["BrandedLoader (spinner)"]
    G -- Tidak --> I{"Ada token?"}
    I -- Tidak --> J["Redirect → /login"]
    I -- Ya --> K["Masuk AppLayout<br/>Header + Sidebar + AppNav"]

    K --> L{"RoleRoute?<br/>/chart-of-accounts, /period-management,<br/>/users-management"}
    L -- "Role tidak berhak" --> M["Redirect → /error/403"]
    L -- "Role berhak" --> N["Render halaman"]

    K --> O{"ProtectedFeature?<br/>/income-statement, /balance-sheet,<br/>/cash-flow"}
    O -- "canAccess = false" --> P["Tampilkan Paywall"]
    O -- "canAccess = true" --> N

    N --> Q["Halaman 404 fallback:<br/>path tak dikenal → NotFoundPage"]
```

> Catatan: `/onboarding` berada di `ProtectedRoute`; `/auth/callback`, `/portal-akses`,
> dan `/admin-portal` berdiri di luar guard standar (admin portal hanya bisa dicapai
> lewat shortcut rahasia di `/login`).

---

## 4. Alur Autentikasi WhatsApp OTP

Metode login/register utama (passwordless). OTP dikirim lewat Fonnte; kode **tidak pernah**
dikembalikan ke client.

```mermaid
flowchart TD
    A["Pilih Login / Register"] --> B{"Metode?"}
    B -- Google --> GO["→ Alur Login Google"]
    B -- WhatsApp --> C{"Register atau Login?"}

    C -- Register --> D["Isi nama, email, no. WA, nama company"]
    D --> E["POST /api/wa/register/start"]
    E --> F["Backend: buat company + user +<br/>company_members owner + subscription free"]
    F --> G["Kirim OTP 6 digit via Fonnte"]

    C -- Login --> H["Masukkan no. WA terdaftar"]
    H --> I["POST /api/wa/login/start"]
    I --> J{"Nomor terdaftar?"}
    J -- Tidak --> K["Error: nomor belum terdaftar"]
    K --> H
    J -- Ya --> G

    G --> L{"Cooldown 60 detik<br/>/ kuota kirim?"}
    L -- "Masih cooldown" --> M["Tolak: tunggu sebentar"]
    M --> G
    L -- "Boleh kirim" --> N["User terima kode di WhatsApp<br/>berlaku 5 menit"]

    N --> O["Input 6 digit kode"]
    O --> P["POST /api/wa/{register|login}/verify"]
    P --> Q{"Masih di bawah 5 percobaan?"}
    Q -- Tidak --> R["Tolak: kode terkunci"]
    R --> C
    Q -- Ya --> S{"Kode benar?"}
    S -- Tidak --> T["Kurangi sisa percobaan"]
    T --> O
    S -- Ya --> U["Kode ditandai terpakai +<br/>phone_verified = true"]
    U --> V["Generate JWT — role & company_id"]
    V --> W["AuthContext.login: simpan token + user"]
    W --> X["Cek flag onboarding → Dashboard"]
```

---

## 5. Alur Login Google (OAuth)

```mermaid
flowchart TD
    A["Klik Login dengan Google"] --> B["supabase.auth.signInWithOAuth<br/>provider = google"]
    B --> C["Redirect ke /auth/callback"]
    C --> D["Ambil session Supabase"]
    D --> E["POST /api/auth/exchange-token"]
    E --> F{"Token valid?"}
    F -- Tidak --> G["Tampilkan error → kembali ke /login"]
    F -- Ya --> H{"Profil sudah ada?"}
    H -- Belum --> I["Backend: buat company + user +<br/>subscription free (ensureProfile)"]
    H -- Ya --> J["Ambil profil existing"]
    I --> K["Return JWT internal + user"]
    J --> K
    K --> L["AuthContext.login → Dashboard / Onboarding"]
```

---

## 6. Alur Onboarding Pengguna Baru

```mermaid
flowchart TD
    A["Selesai login / register"] --> B{"localStorage onboarded_&lt;userId&gt; ada?"}
    B -- Sudah --> C["Langsung ke /dashboard"]
    B -- Belum --> D["Navigate → /onboarding"]
    D --> E["Slide pengenalan fitur"]
    E --> F{"Pilihan user"}
    F -- "Lanjut / Selesai" --> G["Simpan flag onboarded_&lt;userId&gt;"]
    F -- "Lewati" --> G
    G --> H["Redirect → /dashboard"]
```

> Logout **tidak** menghapus flag `onboarded_*` dan `theme` — onboarding cukup sekali per user.

---

## 7. Alur Chart of Accounts (COA)

CRUD akun dengan mapping tipe → `normal_balance`, hierarki `parent_id`, dan **soft delete**.

```mermaid
flowchart TD
    A["Buka /chart-of-accounts"] --> B{"Role?"}
    B -- "Akuntan / Owner" --> C["GET /api/accounts<br/>search + filter tipe/status + sort + pagination"]
    B -- "Role lain" --> D["Redirect → /error/403"]

    C --> E{"Aksi"}
    E -- "Tambah / Edit" --> F["Isi form: kode, nama, tipe, parent"]
    F --> G["POST / PUT /api/accounts"]
    G --> H{"Validasi kode unik &<br/>tipe valid?"}
    H -- Tidak --> I["422 + details → perbaiki form"]
    I --> F
    H -- Ya --> J["Backend tentukan normal_balance<br/>dari tipe akun"]
    J --> K["Simpan akun → refresh list"]

    E -- "Hapus" --> L{"Role = owner?"}
    L -- Tidak --> M["403 Forbidden"]
    L -- Ya --> N["DELETE /api/accounts/:id"]
    N --> O["Soft delete: is_active = false"]
    O --> K
```

---

## 8. Alur Input Jurnal sampai Posting

Double-entry: validasi debit = kredit, cek periode open, kuota plan Free, lalu posting
agar masuk Buku Besar & Laporan.

```mermaid
flowchart TD
    A["Buka /journal-entries"] --> B["GET /api/journal<br/>search + filter status/periode + sort + pagination"]
    B --> C["GET /api/journal/quota<br/>banner sisa kuota plan Free"]
    C --> D["Klik Tambah Jurnal"]
    D --> E{"Kuota bulan ini tersisa?<br/>Free = 50 jurnal/bulan"}
    E -- Penuh --> F["403: kuota habis → ajakan upgrade"]
    E -- Tersisa --> G["Isi tanggal + deskripsi +<br/>minimal 2 baris akun"]
    G --> H["POST /api/journal"]
    H --> I{"Validasi server"}
    I -- "Field kosong / tipe salah" --> J["422 + details → perbaiki"]
    J --> G
    I -- "Periode closed" --> K["Tolak: periode sudah ditutup"]
    I -- "Debit ≠ Kredit" --> L["Tampilkan selisih"]
    L --> G
    I -- Valid --> M["Auto-generate entry_number +<br/>deteksi period_id dari tanggal"]
    M --> N["Rollback otomatis bila insert gagal"]
    N --> O{"Status?"}
    O -- Draft --> P["Simpan sebagai draft"]
    O -- "Langsung posted" --> Q["Simpan status posted"]
    P --> R{"Edit lagi?"}
    R -- Ya --> S["PUT /api/journal/:id<br/>khusus draft"]
    S --> I
    R -- Tidak --> T["POST /api/journal/:id/post"]
    T --> Q
    Q --> U["Tercatat di Buku Besar & Laporan"]
    U --> V["DELETE /api/journal/:id<br/>soft delete, owner only"]

    style V fill:#fee2e2
```

---

## 9. Alur Buku Besar

Menampilkan mutasi per akun dengan **saldo awal** dari jurnal posted sebelum periode,
plus running balance.

```mermaid
flowchart TD
    A["Buka /buku-besar"] --> B["Pilih akun + periode / range tanggal"]
    B --> C["GET /api/ledger"]
    C --> D["Filter: company_id dari JWT (multi-tenant)"]
    D --> E["Hitung saldo awal:<br/>agregat jurnal posted dengan<br/>entry_date &lt; awal periode"]
    E --> F["Ambil mutasi debit/kredit dalam periode"]
    F --> G["Hitung saldo akhir =<br/>saldo awal + debit − kredit"]
    G --> H["Render tabel + running balance per transaksi"]
    H --> I["Filter mismatch? → tampilkan pesan kosong"]
```

> Arah saldo mengikuti `normal_balance` akun: Debit = D−C, Kredit = C−D.

---

## 10. Alur Laporan Keuangan & Export

```mermaid
flowchart TD
    A["Buka Laporan"] --> B{"Plan punya akses?<br/>ProtectedFeature"}
    B -- "Free / tidak aktif" --> C["Paywall → Upgrade"]
    B -- "Pro / Enterprise / Trial core" --> D{"Jenis laporan"}

    D -- "Laba Rugi" --> E["GET /api/reports/income-statement"]
    D -- "Neraca" --> F["GET /api/reports/balance-sheet"]
    D -- "Arus Kas" --> G["GET /api/reports/cash-flow<br/>metode tidak langsung"]

    E --> H["Pendapatan − Beban = Laba Bersih"]
    F --> I["Aset = Liabilitas + Ekuitas<br/>termasuk laba berjalan"]
    G --> J["Pisah Operasi / Investasi / Pendanaan"]

    H --> K["Pilih periode (GET /api/reports/periods)"]
    I --> K
    J --> K
    K --> L{"Export?"}
    L -- "PDF / CSV / Excel / Word" --> M["exportPDF via jsPDF + autotable"]
    L -- Tidak --> N["Selesai"]
    M --> N
```

---

## 11. Alur Manajemen Periode

```mermaid
flowchart TD
    A["Buka /period-management"] --> B{"Role = owner?"}
    B -- Tidak --> C["Redirect → /error/403"]
    B -- Ya --> D["GET /api/periods<br/>list semua periode"]

    D --> E{"Aksi"}
    E -- "Buka periode" --> F["POST /api/periods"]
    F --> G["Periode baru status = open"]

    E -- "Tutup periode" --> H["PATCH /api/periods/:id/close"]
    H --> I["Status = closed →<br/>jurnal baru di periode ini ditolak"]

    E -- "Hapus periode" --> J{"Periode kosong<br/>& belum closed?"}
    J -- Tidak --> K["Tolak: tidak boleh dihapus"]
    J -- Ya --> L["DELETE /api/periods/:id"]
```

---

## 12. Alur Manajemen User & RBAC

RBAC per company: **owner** (akses penuh) dan **akuntan** (fokus pencatatan).

```mermaid
flowchart TD
    A["Request ke endpoint terproteksi"] --> B["authMiddleware:<br/>verifikasi Bearer JWT (jose)"]
    B --> C{"Token valid?"}
    C -- Tidak --> D["401 Unauthorized"]
    C -- Ya --> E["Revalidasi role & company_id<br/>dari database (anti stale-JWT)"]
    E --> F{"Route butuh role tertentu?"}
    F -- Ya --> G{"requireRole(...)<br/>cocok?"}
    G -- Tidak --> H["403 Forbidden"]
    G -- Ya --> I["Lanjut ke handler"]
    F -- Tidak --> I

    I --> J["Buka /users-management (owner)"]
    J --> K["GET /api/users-management<br/>search + role + pagination"]
    K --> L{"Aksi"}
    L -- "Ubah role" --> M["PUT /api/users-management/:id/role"]
    L -- "Hapus anggota" --> N["DELETE /api/users-management/:id"]

    style D fill:#fee2e2
    style H fill:#fee2e2
```

---

## 13. Alur Subscription & Pembayaran (Midtrans)

```mermaid
flowchart TD
    A["Buka /pricing → GET /api/payments/plans"] --> B["Pilih plan + billing cycle"]
    B --> C["POST /api/payments/subscribe"]
    C --> D["Backend validasi plan + buat order ID"]
    D --> E["Midtrans Snap API → Snap token"]
    E --> F["Simpan payment status pending"]
    F --> G["Frontend tampilkan popup Snap"]

    G --> H{"Hasil pembayaran"}
    H -- "Settlement / capture" --> I["Webhook Midtrans → POST /api/payments/webhook"]
    H -- Pending --> J["Halaman /payment/pending"]
    J --> K["Upload bukti pembayaran manual<br/>POST /api/upload/proof"]
    K --> I
    H -- Gagal --> L["Halaman /payment/failed → coba lagi"]
    L --> B

    I --> M["verifySignature + mapping status"]
    M --> N["Update payment = paid +<br/>subscription = active"]
    N --> O["Fitur premium aktif<br/>GET /api/payments/check-access"]
    O --> P["Halaman /payment/success"]

    Q["GET /api/payments/is-sandbox"] --> R{"Mode sandbox?"}
    R -- Ya --> S["Tersedia POST /api/payments/test-complete<br/>untuk simulasi berhasil"]
    R -- Tidak --> T["Hanya webhook produksi"]

    U["POST /api/payments/cancel"] --> V["Downgrade ke Free — status canceled"]
```

---

## 14. Alur AI CFO Assistant (LangGraph)

Router heuristik (tanpa biaya LLM tambahan) memilih agent spesialis; `company_id` di-bind
ke tools dari JWT, bukan dari state graph.

```mermaid
flowchart TD
    A["Buka /ai-cfo atau FAB AI CFO"] --> B["Sapaan + quick actions<br/>(tidak auto-kirim ke LLM)"]
    B --> C["User kirim pesan"]
    C --> D["POST /api/ai/chat { message }<br/>Auth JWT, company_id dari token"]
    D --> E["createAIGraph(companyId)<br/>graph fresh per request"]
    E --> F["Router heuristik: keyword → agent"]

    F -- "cash flow / kas / likuiditas" --> G["Cashflow Agent"]
    F -- "forecast / proyeksi / prediksi" --> H["Forecast Agent"]
    F -- "risiko / bahaya / boros" --> I["Risk Agent"]
    F -- "laporan / laba / neraca / transaksi" --> J["Report Agent"]
    F -- "tanpa keyword cocok" --> J

    G --> K["Tools Supabase:<br/>get_cash_flow, get_monthly_cash_flow,<br/>get_transactions, get_top_expense_accounts"]
    H --> K
    I --> K
    J --> K

    K --> L["OpenRouter LLM → jawaban"]
    L --> M["Simpan riwayat hari ini<br/>di localStorage"]
    M --> N{"Error?"}
    N -- "429 / 504 / 503" --> O["Pesan error jelas ke user"]
    N -- Tidak --> P["Tampilkan jawaban di chat"]
```

---

## 15. Alur Request Backend (Middleware Pipeline)

Urutan middleware global dan penanganan error konsisten di `backend/src/index.ts`.

```mermaid
flowchart TD
    A["Request masuk"] --> B["logger() → catat request"]
    B --> C["prettyJSON() → respons rapi"]
    C --> D["securityHeaders()<br/>CSP + nosniff"]
    D --> E{"Origin diizinkan?<br/>localhost / FRONTEND_URL / Vercel"}
    E -- Tidak --> F["CORS blokir"]
    E -- Ya --> G["Rate limit:<br/>per-IP untuk /api/auth & /api/wa,<br/>per-user untuk /api/*"]
    G --> H{"Route cocok?"}
    H -- Tidak --> I["404 { error: 'Route not found' }"]
    H -- Ya --> J["authMiddleware (bila diproteksi)"]
    J --> K["validateBody (zod)"]
    K --> L{"Valid?"}
    L -- Tidak --> M["422 + details"]
    L -- Ya --> N["Handler route → Supabase"]

    N --> O{"Hasil"}
    O -- Sukses --> P["200/201 { data }"]
    O -- "AppError" --> Q["Status sesuai:<br/>400/401/403/404/409/410/422/<br/>429/503/504"]
    O -- "Error tak terduga" --> R["500 { error: 'Internal server error' }<br/>detail hanya di log server"]
```

---

## 16. Alur Upload File (Avatar & Bukti Pembayaran)

```mermaid
flowchart TD
    A["User pilih file"] --> B{"Jenis upload"}
    B -- "Avatar (profil)" --> C["Compress gambar di frontend<br/>→ dataUrl base64"]
    C --> D["POST /api/upload/avatar"]
    B -- "Bukti pembayaran" --> E["POST /api/upload/proof"]

    D --> F["Validasi backend"]
    E --> F
    F --> G{"Magic-bytes & ukuran<br/>maks 5MB?"}
    G -- Tidak --> H["Tolak: format/ukuran tidak valid"]
    G -- "Ya (PNG/JPG/WebP/GIF/PDF)" --> I["Upload ke Supabase Storage<br/>bucket avatars / payment-proofs"]
    I --> J{"Berhasil?"}
    J -- Tidak --> K["500 → tampilkan toast error"]
    J -- Ya --> L["Simpan public URL<br/>ke profil / payment record"]
    L --> M["Update tampilan (Toast success)"]
```

---

## Ringkasan Endpoint per Alur

| Alur | Endpoint Utama |
|---|---|
| Auth WhatsApp OTP | `POST /api/wa/{register,login}/{start,verify}` |
| Auth Google | `POST /api/auth/exchange-token` · `POST /api/auth/logout` |
| COA | `GET/POST/PUT/DELETE /api/accounts` |
| Jurnal | `GET/POST/PUT/DELETE /api/journal` · `POST /api/journal/:id/post` · `GET /api/journal/quota` |
| Buku Besar | `GET /api/ledger` |
| Laporan | `GET /api/reports/{income-statement,balance-sheet,cash-flow,periods}` |
| Periode | `GET/POST /api/periods` · `PATCH /api/periods/:id/close` · `DELETE /api/periods/:id` |
| User Management | `GET /api/users-management` · `PUT /api/users-management/:id/role` · `DELETE /api/users-management/:id` |
| Pembayaran | `GET /api/payments/plans` · `POST /api/payments/subscribe` · `POST /api/payments/webhook` · `POST /api/payments/cancel` |
| AI CFO | `POST /api/ai/chat` |
| Upload | `POST /api/upload/avatar` · `POST /api/upload/proof` |
| Sistem | `GET /health` |
