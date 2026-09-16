// Fondasi otomatis untuk SETIAP company baru (bukan cuma demo).
//
// Latar: register WA-OTP maupun Google sebelumnya hanya membuat baris
// `companies` kosong — user baru membuka aplikasi tanpa CoA/periode dan
// mengira data hilang/rusak. Fungsi ini mengisi 26 akun standar + 12
// periode tahun berjalan secara idempoten (upsert, aman diulang).
//
// Dipakai oleh: routes/wa-auth.ts (register), lib/ensureProfile.ts
// (provision Google), scripts/backfill-company-foundation.ts.
import { supabase } from "./supabase.js";

export interface DefaultAccount {
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  normal_balance: "DEBIT" | "CREDIT";
}

// Sama dengan daftar di scripts/seed-demo.ts (satu bentuk CoA standar).
// seed-demo.ts TIDAK diubah agar script demo tetap stabil mandiri.
export const DEFAULT_ACCOUNTS: DefaultAccount[] = [
  { code: "1000", name: "Kas", type: "ASSET", normal_balance: "DEBIT" },
  { code: "1100", name: "Bank BCA", type: "ASSET", normal_balance: "DEBIT" },
  { code: "1200", name: "Piutang Usaha", type: "ASSET", normal_balance: "DEBIT" },
  { code: "1300", name: "Persediaan Barang", type: "ASSET", normal_balance: "DEBIT" },
  { code: "1400", name: "Perlengkapan Kantor", type: "ASSET", normal_balance: "DEBIT" },
  { code: "1500", name: "Peralatan Kantor", type: "ASSET", normal_balance: "DEBIT" },
  { code: "1600", name: "Kendaraan", type: "ASSET", normal_balance: "DEBIT" },
  { code: "1700", name: "Akumulasi Penyusutan", type: "ASSET", normal_balance: "CREDIT" },
  { code: "2100", name: "Hutang Usaha", type: "LIABILITY", normal_balance: "CREDIT" },
  { code: "2200", name: "Hutang Bank", type: "LIABILITY", normal_balance: "CREDIT" },
  { code: "2300", name: "Hutang Gaji", type: "LIABILITY", normal_balance: "CREDIT" },
  { code: "2400", name: "PPN Keluaran", type: "LIABILITY", normal_balance: "CREDIT" },
  { code: "3000", name: "Modal Awal", type: "EQUITY", normal_balance: "CREDIT" },
  { code: "3100", name: "Prive Owner", type: "EQUITY", normal_balance: "DEBIT" },
  { code: "3200", name: "Laba Ditahan", type: "EQUITY", normal_balance: "CREDIT" },
  { code: "4000", name: "Pendapatan Jasa", type: "REVENUE", normal_balance: "CREDIT" },
  { code: "4100", name: "Pendapatan Bunga", type: "REVENUE", normal_balance: "CREDIT" },
  { code: "4200", name: "Pendapatan Lain-lain", type: "REVENUE", normal_balance: "CREDIT" },
  { code: "5000", name: "Beban Gaji", type: "EXPENSE", normal_balance: "DEBIT" },
  { code: "5100", name: "Beban Sewa", type: "EXPENSE", normal_balance: "DEBIT" },
  { code: "5200", name: "Beban Listrik & Air", type: "EXPENSE", normal_balance: "DEBIT" },
  { code: "5300", name: "Beban Telepon & Internet", type: "EXPENSE", normal_balance: "DEBIT" },
  { code: "5400", name: "Beban Perlengkapan", type: "EXPENSE", normal_balance: "DEBIT" },
  { code: "5500", name: "Beban Penyusutan", type: "EXPENSE", normal_balance: "DEBIT" },
  { code: "5600", name: "Beban Iklan", type: "EXPENSE", normal_balance: "DEBIT" },
  { code: "5700", name: "Beban Transportasi", type: "EXPENSE", normal_balance: "DEBIT" },
];

function fmtErr(err: any): string {
  return err?.message ? String(err.message) : String(err);
}

/**
 * Isi fondasi company: 26 akun standar + 12 periode tahun berjalan
 * (bulan lampau = closed, bulan berjalan dst = open — sama seperti seed).
 * Idempoten via onConflict; hanya 2 round-trip Supabase (upsert batch).
 * Throw bila gagal — pemanggil yang memutuskan rollback vs lanjut.
 */
export async function provisionCompanyFoundation(companyId: string): Promise<void> {
  const { error: accErr } = await supabase.from("accounts").upsert(
    DEFAULT_ACCOUNTS.map((a) => ({
      company_id: companyId,
      code: a.code,
      name: a.name,
      type: a.type,
      normal_balance: a.normal_balance,
      is_active: true,
    })),
    { onConflict: "company_id,code" },
  );
  if (accErr) {
    throw new Error(`seed_accounts: ${fmtErr(accErr)}`);
  }

  const year = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const periodRows = Array.from({ length: 12 }, (_, i) => ({
    company_id: companyId,
    year,
    month: i + 1,
    status: i + 1 < currentMonth ? "closed" : "open",
  }));
  const { error: perErr } = await supabase.from("periods").upsert(periodRows, {
    onConflict: "company_id,year,month",
  });
  if (perErr) {
    throw new Error(`seed_periods: ${fmtErr(perErr)}`);
  }
}
