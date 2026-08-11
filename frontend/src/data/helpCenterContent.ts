export interface HelpFaq {
  q: string;
  a: string;
}

export interface HelpContactCard {
  type: "email" | "whatsapp" | "hours";
  label: string;
  value: string;
  color: "primary" | "emerald" | "amber";
  href: string | null;
}

/** Kontak support — sumber tunggal untuk Help Center publik & login. */
export const HELP_SUPPORT_EMAIL = "zzxcvnnnnn@gmail.com";
/** Format tampilan WhatsApp */
export const HELP_SUPPORT_WHATSAPP_DISPLAY = "+62 895 4116 92899";
/** Format wa.me internasional (tanpa +, spasi, atau 0 depan) */
export const HELP_SUPPORT_WHATSAPP_LINK = "https://wa.me/62895411692899";

export const helpFaqs: HelpFaq[] = [
  {
    q: "Bagaimana cara menambahkan akun baru di Chart of Accounts?",
    a: 'Buka menu Chart of Accounts → klik tombol "Add Account" → isi kode akun, nama, tipe, dan saldo normal → klik Simpan. Akun baru akan langsung muncul di daftar.',
  },
  {
    q: "Apa perbedaan akun Aktif dan Non-Aktif?",
    a: "Akun Aktif bisa dipakai untuk transaksi jurnal. Akun Non-Aktif tidak akan muncul di pilihan akun saat membuat jurnal, tapi datanya tetap tersimpan dan bisa diaktifkan kembali kapan saja.",
  },
  {
    q: "Bagaimana cara membuat Jurnal Entry?",
    a: 'Buka Journal Entries → klik "New Entry" → pilih periode → tambahkan baris debit & kredit → pastikan total debit = kredit → klik Simpan. Sistem otomatis memvalidasi keseimbangan.',
  },
  {
    q: "Apa itu Buku Besar (General Ledger)?",
    a: "Buku Besar menampilkan semua transaksi per akun beserta saldo berjalan (running balance). Berguna untuk melacak arus kas dan memverifikasi keakuratan pencatatan.",
  },
  {
    q: "Bagaimana cara membuka/menutup periode akuntansi?",
    a: "Buka Period Management → pilih periode yang diinginkan → klik tombol Open/Close. Periode yang sudah ditutup tidak bisa di-edit lagi untuk menjaga integritas data.",
  },
  {
    q: "Apakah data saya aman?",
    a: "Ya! Data Anda disimpan di Supabase dengan enkripsi end-to-end, backup otomatis, dan akses terbatas hanya untuk user di perusahaan Anda.",
  },
  {
    q: "Bagaimana cara mengganti tema ke Dark Mode?",
    a: "Klik ikon tema di header (☀️/🌙) atau buka Settings → Theme → pilih Dark. Anda juga bisa memilih System untuk mengikuti pengaturan device Anda.",
  },
  {
    q: "Apa itu AI CFO Assistant?",
    a: "AI CFO adalah asisten keuangan di tombol bulat pojok kanan bawah. Anda bisa bertanya soal arus kas, beban, risiko, dan ringkasan keuangan — jawaban digenerate dari data jurnal perusahaan Anda.",
  },
];

export const helpContactCards: HelpContactCard[] = [
  {
    type: "email",
    label: "Email",
    value: HELP_SUPPORT_EMAIL,
    color: "primary",
    href: `mailto:${HELP_SUPPORT_EMAIL}`,
  },
  {
    type: "whatsapp",
    label: "WhatsApp",
    value: HELP_SUPPORT_WHATSAPP_DISPLAY,
    color: "emerald",
    href: HELP_SUPPORT_WHATSAPP_LINK,
  },
  {
    type: "hours",
    label: "Jam Operasional",
    value: "Sen–Jum, 09:00–17:00",
    color: "amber",
    href: null,
  },
];
