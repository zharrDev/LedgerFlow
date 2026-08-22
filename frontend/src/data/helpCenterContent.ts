export type L = { en: string; id: string };

export interface HelpFaq {
  q: L;
  a: L;
}

export interface HelpContactCard {
  type: "email" | "whatsapp" | "hours";
  label: L;
  value: L;
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
    q: {
      en: "How do I add a new account in Chart of Accounts?",
      id: "Bagaimana cara menambahkan akun baru di Chart of Accounts?",
    },
    a: {
      en: 'Open the Chart of Accounts menu → click the "Add Account" button → fill in the account code, name, type, and normal balance → click Save. The new account will appear in the list right away.',
      id: 'Buka menu Chart of Accounts → klik tombol "Add Account" → isi kode akun, nama, tipe, dan saldo normal → klik Simpan. Akun baru akan langsung muncul di daftar.',
    },
  },
  {
    q: {
      en: "What is the difference between Active and Inactive accounts?",
      id: "Apa perbedaan akun Aktif dan Non-Aktif?",
    },
    a: {
      en: "Active accounts can be used for journal transactions. Inactive accounts no longer appear in the account picker when creating journals, but their data is kept and they can be reactivated anytime.",
      id: "Akun Aktif bisa dipakai untuk transaksi jurnal. Akun Non-Aktif tidak akan muncul di pilihan akun saat membuat jurnal, tapi datanya tetap tersimpan dan bisa diaktifkan kembali kapan saja.",
    },
  },
  {
    q: {
      en: "How do I create a Journal Entry?",
      id: "Bagaimana cara membuat Jurnal Entry?",
    },
    a: {
      en: 'Open Journal Entries → click "New Entry" → pick a period → add debit & credit lines → make sure total debit equals total credit → click Save. The system automatically validates the balance.',
      id: 'Buka Journal Entries → klik "New Entry" → pilih periode → tambahkan baris debit & kredit → pastikan total debit = kredit → klik Simpan. Sistem otomatis memvalidasi keseimbangan.',
    },
  },
  {
    q: {
      en: "What is the General Ledger?",
      id: "Apa itu Buku Besar (General Ledger)?",
    },
    a: {
      en: "The General Ledger shows all transactions per account with a running balance. It is useful for tracking cash movement and verifying that your records are accurate.",
      id: "Buku Besar menampilkan semua transaksi per akun beserta saldo berjalan (running balance). Berguna untuk melacak arus kas dan memverifikasi keakuratan pencatatan.",
    },
  },
  {
    q: {
      en: "How do I open/close an accounting period?",
      id: "Bagaimana cara membuka/menutup periode akuntansi?",
    },
    a: {
      en: "Open Period Management → choose the period → click Open/Close. Closed periods can no longer be edited to protect data integrity.",
      id: "Buka Period Management → pilih periode yang diinginkan → klik tombol Open/Close. Periode yang sudah ditutup tidak bisa di-edit lagi untuk menjaga integritas data.",
    },
  },
  {
    q: {
      en: "Is my data safe?",
      id: "Apakah data saya aman?",
    },
    a: {
      en: "Yes! Your data is stored on Supabase with end-to-end encryption, automatic backups, and access limited only to users in your company.",
      id: "Ya! Data Anda disimpan di Supabase dengan enkripsi end-to-end, backup otomatis, dan akses terbatas hanya untuk user di perusahaan Anda.",
    },
  },
  {
    q: {
      en: "How do I switch to Dark Mode?",
      id: "Bagaimana cara mengganti tema ke Dark Mode?",
    },
    a: {
      en: "Click the theme icon in the header (☀️/🌙) or open Settings → Theme → choose Dark. You can also pick System to follow your device setting.",
      id: "Klik ikon tema di header (☀️/🌙) atau buka Settings → Theme → pilih Dark. Anda juga bisa memilih System untuk mengikuti pengaturan device Anda.",
    },
  },
  {
    q: {
      en: "What is the AI CFO Assistant?",
      id: "Apa itu AI CFO Assistant?",
    },
    a: {
      en: "AI CFO is a finance assistant behind the round button at the bottom-right corner. Ask it about cash flow, expenses, risks, and financial summaries — answers are generated from your company's journal data.",
      id: "AI CFO adalah asisten keuangan di tombol bulat pojok kanan bawah. Anda bisa bertanya soal arus kas, beban, risiko, dan ringkasan keuangan — jawaban digenerate dari data jurnal perusahaan Anda.",
    },
  },
];

export const helpContactCards: HelpContactCard[] = [
  {
    type: "email",
    label: { en: "Email", id: "Email" },
    value: { en: HELP_SUPPORT_EMAIL, id: HELP_SUPPORT_EMAIL },
    color: "primary",
    href: `mailto:${HELP_SUPPORT_EMAIL}`,
  },
  {
    type: "whatsapp",
    label: { en: "WhatsApp", id: "WhatsApp" },
    value: { en: HELP_SUPPORT_WHATSAPP_DISPLAY, id: HELP_SUPPORT_WHATSAPP_DISPLAY },
    color: "emerald",
    href: HELP_SUPPORT_WHATSAPP_LINK,
  },
  {
    type: "hours",
    label: { en: "Business Hours", id: "Jam Operasional" },
    value: { en: "Mon–Fri, 09:00–17:00", id: "Sen–Jum, 09:00–17:00" },
    color: "amber",
    href: null,
  },
];
