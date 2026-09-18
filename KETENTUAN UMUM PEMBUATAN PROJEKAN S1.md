

## KETENTUAN UMUM PEMBUATAN PROJEKAN S1

FRONTEND (Client Side)
## 1. Responsive Layout
Website wajib responsif dan dapat digunakan dengan baik pada:
## • Mobile (≤ 768px)
## • Tablet (769px – 1024px)
## • Desktop (>1024px)
Setiap halaman utama harus memiliki tampilan yang menyesuaikan ukuran layar
tanpa terjadi overflow ataupun layout yang rusak.

## 2. Authentication Flow
Frontend wajib memiliki alur autentikasi lengkap.
Minimal terdiri dari:
## • Login
## • Register
## • Logout
## • Forgot Password
## • Reset Password
## Ketentuan:
- Token JWT harus disimpan menggunakan Local Storage atau Cookie.
- User yang belum login tidak dapat mengakses halaman yang bersifat
private.
- Setelah login berhasil, user otomatis diarahkan ke Dashboard.
- Session harus tetap aktif ketika browser di-refresh.
- Logout harus menghapus token dan seluruh data autentikasi.

## 3. Routing
## Menggunakan Client Side Routing.
Minimal memiliki:
## • Public Route
## • Private Route

- Role Route (berdasarkan role)
- Redirect ketika tidak memiliki hak akses.

## 4. Dashboard
Dashboard wajib menampilkan data secara real-time dari backend.
Minimal berisi:
## • Card Summary
## • Total Data
## • Statistik
- Aktivitas terbaru
Dashboard tidak boleh hanya berupa tampilan statis.

- CRUD Interface
Setiap data utama wajib memiliki halaman:
## • List Data
## • Detail Data
## • Tambah Data
## • Edit Data
## • Hapus Data
Semua proses harus terhubung dengan API.

## 6. Searching, Filtering & Sorting
Minimal memiliki:
## Search
- berdasarkan keyword
## Filter
- status
- kategori
- tanggal



## Sorting
- terbaru
- terlama
## • A-Z
## • Z-A
Seluruh fitur dapat digunakan secara bersamaan.

## 7. Pagination
Data list wajib menggunakan Pagination.
## Minimal:
## • Previous
## • Next
- Nomor halaman
- Informasi jumlah data
- Pilihan jumlah data per halaman

## 8. Upload File
Minimal mendukung untuk upload gambar atau PDF.

## 9. Form Validation
Semua form wajib memiliki validasi.
## Contoh:
## • Required
- Minimum karakter
- Maximum karakter
## • Format Email
## • Nomor Telepon
## • Password Confirmation
Error harus muncul secara realtime.



## 10. Notification
Seluruh proses CRUD wajib memiliki notifikasi.
## Contoh:
## • Success
## • Error
## • Warning
## • Info
## Menggunakan Toast Notification.

## 11. Error Handling
Minimal memiliki halaman:
## • 401 Unauthorized
## • 403 Forbidden
## • 404 Not Found
## • 500 Internal Server Error
Serta fallback ketika API gagal.

BACKEND (Server Side)
## 1. REST API
API wajib mengikuti standar REST.
## Minimal:
## • GET
## • POST
## • PUT
## • PATCH
## • DELETE
Menggunakan HTTP Status Code yang sesuai.



## 2. Authentication & Authorization
Wajib memiliki:
## • Register
## • Login
## • Logout
- Refresh Token (opsional menjadi nilai tambah)
## • Forgot Password
## • Reset Password

- Role Based Access Control (RBAC)
Minimal terdapat 2 role.
## Contoh:
## • Admin
## • User
Hak akses setiap role harus berbeda.

- CRUD Lengkap
Minimal terdapat 6 entitas utama.
Setiap entitas wajib memiliki:
## • Create
## • Read
## • Update
## • Delete
Tidak boleh ada CRUD yang hanya dummy.

## 5. Server Side Validation
Semua endpoint POST dan PUT wajib memiliki validasi.
## Contoh:
## • Required
## • Email
## • Unique

## • Minimum
## • Maximum
## • Enum
## • Numeric
## • Date
Error harus dikembalikan dalam format JSON.

## 6. Upload File
Backend wajib mendukung upload Gambar atau PDF.

## 7. Global Error Handling
Harus menangani:
## • 400 Bad Request
## • 401 Unauthorized
## • 403 Forbidden
## • 404 Not Found
## • 422 Validation Error
## • 500 Internal Server Error
Format response harus konsisten.

## 8. Database Relationship
Minimal memiliki:
- 6 tabel utama
- 5 relasi
Wajib terdapat:
## • One To One
## • One To Many
## • Many To One
## • Many To Many



## 9. Soft Delete
Minimal diterapkan pada 2 tabel. Data yang dihapus tidak langsung hilang dari
database.

- API Documentation
Menggunakan salah satu:
## • Swagger
- OpenAPI
## • Postman Collection
Dokumentasi harus dapat digunakan untuk menguji seluruh endpoint.

## 11. Security
Minimal menerapkan salah satu berikut ini:
## • Password Hashing
- JWT Authentication
## • CORS
## • Request Validation
- SQL Injection Prevention
- XSS Protection (nilai tambah)

- Search, Filter & Pagination API
Endpoint list wajib mendukung:
## • Search
## • Filter
## • Sorting
## • Pagination
## Contoh:
- GET /products?page=1&limit=10
- GET /products?search=laptop
- GET /products?status=active
- GET /products?sort=name
- GET /products?category=1

## DATABASE
Database minimal memenuhi ketentuan berikut:
- Minimal 6 tabel utama.
- Minimal 5 relasi antar tabel.
- Memiliki Primary Key dan Foreign Key.
- Menggunakan normalisasi minimal hingga 3NF.
- Menggunakan timestamp (created_at dan updated_at) pada setiap tabel
utama.
- Minimal terdapat 2 tabel yang menerapkan soft delete.
- Data awal (seed) minimal 20 data untuk setiap tabel utama agar aplikasi dapat
diuji dengan baik.

## TATA CARA PENGUMPULAN PROYEK
## Ketentuan Pengumpulan
- Proyek berupa aplikasi Fullstack yang terdiri dari Frontend dan Backend.
- Frontend dan Backend wajib berada dalam satu repository GitHub
## (monorepo).
- Repository GitHub wajib dapat diakses (Public).
- Setiap proyek wajib memiliki file README.md yang berisi minimal:
❖ Judul aplikasi
❖ Deskripsi singkat aplikasi
❖ Fitur utama
❖ Teknologi yang digunakan
❖ Struktur folder proyek
❖ Cara instalasi dan menjalankan aplikasi
- Akun demo (apabila diperlukan) seperti username  dan password.
- Wajib menyertakan dokumentasi perancangan sistem berupa Flowchart.
- Batas pengumpulan proyek adalah Jumat, 18 September 2026 Pukul 22.00
## WIB.
- Pengumpulan dilakukan melalui Google Form berikut:
https://forms.gle/TeMvXvpMzH1v93vNA
