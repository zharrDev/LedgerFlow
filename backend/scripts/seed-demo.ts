/**
 * Seed Demo Data untuk LedgerFlow
 * Jalankan: npm run seed
 *
 * Membuat:
 *  - 2 akun demo (Owner / Akuntan) via Supabase Auth admin API
 *  - 1 company demo
 *  - Chart of Accounts (26 akun)
 *  - 12 periode (1 tahun berjalan)
 *  - 24 jurnal entry + lines (double-entry, debit = kredit)
 *  - Company members (M:M)
 *
 * Idempotent: aman dijalankan berulang kali (upsert + cek email).
 */
import { loadEnv } from "../src/lib/env.js";
loadEnv();
import { supabase } from "../src/lib/supabase.js";
import { normalizePhoneNumber } from "../src/lib/whatsapp.js";
import { DEMO_PHONES } from "../src/lib/demoConfig.js";

const DEMO_PASSWORD = "Demo123!";

const DEMO_COMPANY = {
  name: "PT Demo Nusantara",
  code: "PT-DEMO-001",
  currency: "IDR",
};

const DEMO_USERS = [
  { email: "owner@demo.com", name: "Budi Santoso", role: "owner" },
  { email: "akuntan@demo.com", name: "Agus Wijaya", role: "akuntan" },
];

const ACCOUNTS = [
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

interface SeedEntry {
  company_id: string;
  period_id: string;
  created_by: string;
  entry_number: string;
  entry_date: string;
  description: string;
  status: "draft" | "posted";
}

interface SeedLine {
  entryNumber: string;
  accountCode: string;
  debit: number;
  credit: number;
  memo: string | null;
}

// Tiap bulan menghasilkan 9 jurnal (draft & posted) — total 54 entry untuk Jan–Jun
function buildJournalData(
  companyId: string,
  periods: { id: string; year: number; month: number }[],
  createdBy: string,
): { entries: SeedEntry[]; lines: SeedLine[] } {
  const entries: SeedEntry[] = [];
  const lines: SeedLine[] = [];
  let num = 1;

  for (const period of periods) {
    const prefix = `JE-${period.year}${String(period.month).padStart(2, "0")}`;

    const add = (
      description: string,
      data: [string, number, number][],
      status: "draft" | "posted",
    ) => {
      const entryNumber = `${prefix}-${String(num++).padStart(4, "0")}`;
      entries.push({
        company_id: companyId,
        period_id: period.id,
        created_by: createdBy,
        entry_number: entryNumber,
        entry_date: new Date(period.year, period.month - 1, 5).toISOString().slice(0, 10),
        description,
        status,
      });
      for (const [accountCode, debit, credit] of data) {
        lines.push({
          entryNumber,
          accountCode,
          debit,
          credit,
          memo: null,
        });
      }
    };

    add(
      `Pendapatan jasa konsultasi ${monthLabel(period.month)}`,
      [
        ["1100", 30000000, 0],
        ["1200", 20000000, 0],
        ["4000", 0, 45000000],
        ["2400", 0, 5000000],
      ],
      "posted",
    );
    add(`Pembayaran gaji karyawan ${monthLabel(period.month)}`, [
      ["5000", 25000000, 0],
      ["1100", 0, 25000000],
    ], "posted");
    add(`Pembayaran sewa kantor ${monthLabel(period.month)}`, [
      ["5100", 10000000, 0],
      ["1100", 0, 10000000],
    ], "posted");
    add(`Biaya listrik & air ${monthLabel(period.month)}`, [
      ["5200", 3000000, 0],
      ["1100", 0, 3000000],
    ], "posted");
    add(`Biaya internet ${monthLabel(period.month)}`, [
      ["5300", 1500000, 0],
      ["1100", 0, 1500000],
    ], "posted");
    add(`Pembelian perlengkapan ${monthLabel(period.month)}`, [
      ["1400", 5000000, 0],
      ["2100", 0, 5000000],
    ], "posted");
    add(`Pembayaran hutang usaha ${monthLabel(period.month)}`, [
      ["2100", 3000000, 0],
      ["1100", 0, 3000000],
    ], "posted");
    add(`Penerimaan piutang ${monthLabel(period.month)}`, [
      ["1100", 12000000, 0],
      ["1200", 0, 12000000],
    ], "posted");
    add(`Penyusutan peralatan ${monthLabel(period.month)}`, [
      ["5500", 1000000, 0],
      ["1700", 0, 1000000],
    ], "draft");
  }

  return { entries, lines };
}

function monthLabel(m: number): string {
  return [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ][m - 1];
}

async function main() {
  console.log("=== SEED LEDGERFLOW DEMO DATA ===");

  console.log("→ Upsert company demo...");
  const { data: existingCompany } = await supabase
    .from("companies")
    .select("*")
    .eq("code", DEMO_COMPANY.code)
    .maybeSingle();

  let company = existingCompany;
  if (!company) {
    const { data: created, error: createErr } = await supabase
      .from("companies")
      .insert(DEMO_COMPANY)
      .select()
      .single();
    if (createErr) {
      console.error("  ! Gagal buat company:", createErr.message);
      process.exit(1);
    }
    company = created;
    console.log("  Company dibuat:", company?.name, company?.id);
  } else {
    const { error: updateErr } = await supabase
      .from("companies")
      .update({ name: DEMO_COMPANY.name, currency: DEMO_COMPANY.currency })
      .eq("id", existingCompany.id);
    if (updateErr) {
      console.error("  ! Gagal update company:", updateErr.message);
    }
    console.log("  Company sudah ada:", company?.name, company?.id);
  }

  // ── Users ──
  const userIds: Record<string, string> = {};
  for (const du of DEMO_USERS) {
    const phone = normalizePhoneNumber(DEMO_PHONES[du.email] || "");
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", du.email)
      .single();

    if (existing) {
      // Repair existing profile: pastikan verified + ter-attach ke PT Demo.
      // (Profile lama bisa email_verified=false dari seed sebelumnya, atau
      // ter-attach ke company kosong hasil auto-heal login — "Perusahaan X".)
      const { error: repairErr } = await supabase
        .from("users")
        .update({ phone, email_verified: true, company_id: company!.id })
        .eq("id", existing.id);
      if (repairErr) {
        console.error(`  ! Gagal update phone ${du.email}: ${repairErr.message}`);
      } else {
        console.log(`  User sudah ada (di-repair verified+company): ${du.email} (phone ${phone})`);
      }
      userIds[du.email] = existing.id;
      continue;
    }

    // Auth user bisa saja sudah ada (seed sebelumnya) tapi profilnya hilang.
    // Cari by email supaya bisa reattach, bukan biarkan auto-heal login
    // bikin company kosong baru ("Perusahaan X").
    let authUserId: string | undefined;
    let existingAuthUser: { id: string } | undefined;
    try {
      const list = await supabase.auth.admin.listUsers();
      existingAuthUser = list.data.users.find((u) => u.email === du.email);
    } catch {
      existingAuthUser = undefined;
    }

    let authErr: { message: string } | null = null;
    if (existingAuthUser) {
      authUserId = existingAuthUser.id;
    } else {
      const res = await supabase.auth.admin.createUser({
        email: du.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: du.name },
      });
      authErr = res.error;
      if (res.data.user) authUserId = res.data.user.id;
    }

    if (authErr || !authUserId) {
      console.error(`  ! Gagal siapkan auth user ${du.email}:`, authErr?.message);
      continue;
    }
    console.log(`  Auth user siap: ${du.email}`);

    const { data: user, error: userErr } = await supabase
      .from("users")
      .upsert(
        {
          id: authUserId,
          company_id: company!.id,
          email: du.email,
          name: du.name,
          role: du.role,
          phone,
          email_verified: true,
        },
        { onConflict: "id" },
      )
      .select()
      .single();
    if (userErr) {
      console.error(`  Gagal insert users ${du.email}: ${userErr.message}`);
      continue;
    }
    userIds[du.email] = user.id;
    console.log(`  Profil user dibuat: ${du.name} (${du.role}, phone ${phone})`);
  }

  // ── Company members (M:M) ──
  for (const du of DEMO_USERS) {
    const uid = userIds[du.email];
    if (!uid) continue;
    await supabase.from("company_members").upsert(
      { user_id: uid, company_id: company!.id, role: du.role },
      { onConflict: "user_id,company_id" },
    );
  }
  console.log("  Company members (M:M) terisi.");

  // ── Accounts ──
  console.log("→ Menyiapkan Chart of Accounts...");
  const accountMap: Record<string, string> = {};
  for (const acc of ACCOUNTS) {
    const { data, error } = await supabase
      .from("accounts")
      .upsert(
        {
          company_id: company!.id,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          normal_balance: acc.normal_balance,
          is_active: true,
        },
        { onConflict: "company_id,code" },
      )
      .select()
      .single();
    if (error) {
      console.error(`  Gagal upsert akun ${acc.code}: ${error.message}`);
      continue;
    }
    accountMap[acc.code] = data.id;
  }
  console.log(`  ${Object.keys(accountMap).length} akun siap.`);

  // ── Periods ──
  const year = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  console.log(`→ Membuat periode ${year}...`);
  const periods: { id: string; year: number; month: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    const status = m < currentMonth ? "closed" : "open";
    const { data, error } = await supabase
      .from("periods")
      .upsert(
        { company_id: company!.id, year, month: m, status },
        { onConflict: "company_id,year,month" },
      )
      .select()
      .single();
    if (error) {
      console.error(`  Gagal upsert periode ${year}-${m}: ${error.message}`);
      continue;
    }
    periods.push({ id: data.id, year, month: m });
  }
  console.log(`  ${periods.length} periode siap.`);

  // ── Journal entries ──
  const ownerId = userIds["owner@demo.com"];
  if (!ownerId) {
    console.error("  ⛔ Owner demo tidak ditemukan, jurnal dilewati.");
    return;
  }
  const monthsToUse = periods.filter((p) => p.month <= 6 && p.month < currentMonth);
  console.log(`→ Membuat jurnal untuk ${monthsToUse.length} bulan...`);

  const built = buildJournalData(company!.id, monthsToUse, ownerId);

  const entryToId: Record<string, string> = {};
  let inserted = 0;
  for (const e of built.entries) {
    const { data: entry, error } = await supabase
      .from("journal_entries")
      .upsert(
        {
          company_id: e.company_id,
          period_id: e.period_id,
          created_by: e.created_by,
          entry_number: e.entry_number,
          entry_date: e.entry_date,
          description: e.description,
          status: e.status,
        },
        { onConflict: "company_id,entry_number" },
      )
      .select()
      .single();
    if (error) {
      console.error(`  Gagal insert jurnal ${e.entry_number}: ${error.message}`);
      continue;
    }
    entryToId[e.entry_number] = entry.id;
    inserted++;
  }
  console.log(`  ${inserted} jurnal entry dibuat.`);

  // ── Journal entry lines ──
  let lineInserted = 0;
  for (const l of built.lines) {
    const entryId = entryToId[l.entryNumber];
    if (!entryId) continue;
    const accountId = accountMap[l.accountCode];
    if (!accountId) continue;
    const { error } = await supabase.from("journal_entry_lines").insert({
      journal_entry_id: entryId,
      account_id: accountId,
      debit: l.debit,
      credit: l.credit,
      memo: l.memo,
    });
    if (error) {
      console.error(`  Gagal insert line jurnal: ${error.message}`);
      continue;
    }
    lineInserted++;
  }
  console.log(`  ${lineInserted} baris jurnal (journal_entry_lines) dibuat.`);

  console.log("=== SEED SELESAI ===");
}

main().catch((err) => {
  console.error("SEED ERROR:", err);
  process.exit(1);
});