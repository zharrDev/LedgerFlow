import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";

const ledger = new Hono();

// Semua endpoint ledger wajib login
ledger.use("*", authMiddleware);

// Helper: normalisasi nilai normal balance dari DB agar lebih enak dibaca di response
function normalizeBalance(nb: string): "Debit" | "Credit" {
  return String(nb).toUpperCase() === "CREDIT" ? "Credit" : "Debit";
}

const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

// Helper: ubah year + month menjadi tanggal awal dan akhir bulan
function monthRange(
  year: number,
  month: number,
): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${pad(month)}-${pad(lastDay)}`;
  return { start, end };
}

// GET /api/ledger
// Menampilkan buku besar per akun berdasarkan period_id atau range tanggal
ledger.get("/", async (c) => {
  const { company_id } = c.get("user");
  const { account_id, period_id, start_date, end_date } = c.req.query();

  if (!account_id) {
    return c.json({ error: "account_id wajib diisi" }, 400);
  }
  if (!period_id && (!start_date || !end_date)) {
    return c.json(
      { error: "Sertakan period_id, atau start_date + end_date" },
      400,
    );
  }

  const { data: accountRows, error: accErr } = await supabase
    .from("accounts")
    .select("id, code, name, normal_balance, is_active, company_id")
    .eq("id", account_id);

  if (accErr) {
    return c.json({ error: accErr.message }, 500);
  }

  const account = (accountRows ?? [])[0];

  if (!account) {
    return c.json(
      { error: "Akun tidak ditemukan (id tidak ada di tabel accounts)" },
      404,
    );
  }

  // Multi-tenant guard: akun harus milik company user login
  if (company_id && account.company_id && account.company_id !== company_id) {
    return c.json({ error: "Akun bukan milik perusahaan Anda" }, 403);
  }

  const normalBalance = normalizeBalance(account.normal_balance);

  let startDate = start_date as string;
  let endDate = end_date as string;
  let resolvedPeriod: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  } | null = null;

  // Jika period_id dikirim, tentukan startDate dan endDate dari periode tersebut
  if (period_id) {
    const { data: period, error: perErr } = await supabase
      .from("periods")
      .select("id, year, month, status")
      .eq("id", period_id)
      .eq("company_id", company_id)
      .single();

    if (perErr || !period) {
      return c.json({ error: "Periode tidak ditemukan" }, 404);
    }
    const { start, end } = monthRange(period.year, period.month);
    startDate = start;
    endDate = end;
    resolvedPeriod = {
      id: period.id,
      name: `${MONTH_NAMES_ID[period.month - 1] ?? period.month} ${period.year}`,
      startDate: start,
      endDate: end,
      isActive: period.status === "open",
    };
  }

  if (startDate > endDate) {
    return c.json(
      { error: "start_date harus sebelum atau sama dengan end_date" },
      400,
    );
  }

  // Query 1: ambil semua jurnal posted sampai endDate
  const { data: entries, error: entriesErr } = await supabase
    .from("journal_entries")
    .select("id, entry_date, entry_number, description")
    .eq("company_id", company_id)
    .eq("status", "posted")
    .lte("entry_date", endDate);

  if (entriesErr) {
    return c.json({ error: entriesErr.message }, 500);
  }

  const entryList = entries ?? [];
  const entryMap = new Map(entryList.map((e) => [e.id, e]));
  const entryIds = entryList.map((e) => e.id);

  let lineRows: Array<{
    id: string;
    journal_entry_id: string;
    debit: number | string;
    credit: number | string;
    memo: string | null;
  }> = [];

  // Query 2: ambil line jurnal untuk akun yang diminta
  if (entryIds.length > 0) {
    const { data: lines, error: linesErr } = await supabase
      .from("journal_entry_lines")
      .select("id, journal_entry_id, debit, credit, memo")
      .eq("account_id", account_id)
      .in("journal_entry_id", entryIds);

    if (linesErr) {
      return c.json({ error: linesErr.message }, 500);
    }
    lineRows = (lines ?? []) as typeof lineRows;
  }

  // Pisahkan saldo awal (< startDate) dan transaksi periode berjalan
  let openingDebit = 0;
  let openingCredit = 0;
  type Enriched = {
    id: string;
    date: string;
    journalNumber: string;
    description: string;
    debit: number;
    credit: number;
  };
  const inRange: Enriched[] = [];

  for (const r of lineRows) {
    const entry = entryMap.get(r.journal_entry_id);
    if (!entry) continue;
    const date = entry.entry_date;
    const debit = Number(r.debit || 0);
    const credit = Number(r.credit || 0);

    if (date < startDate) {
      openingDebit += debit;
      openingCredit += credit;
    } else {
      inRange.push({
        id: r.id,
        date,
        journalNumber: entry.entry_number,
        description: r.memo ?? entry.description ?? "",
        debit,
        credit,
      });
    }
  }

  const openingBalance =
    normalBalance === "Debit"
      ? openingDebit - openingCredit
      : openingCredit - openingDebit;

  // Urutkan transaksi agar running balance konsisten
  inRange.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.journalNumber !== b.journalNumber)
      return a.journalNumber < b.journalNumber ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });

  // Hitung running balance dan total debit/credit periode berjalan
  let running = openingBalance;
  let totalDebit = 0;
  let totalCredit = 0;

  const resultLines = inRange.map((l) => {
    totalDebit += l.debit;
    totalCredit += l.credit;
    running +=
      normalBalance === "Debit" ? l.debit - l.credit : l.credit - l.debit;
    return { ...l, balance: running };
  });

  const closingBalance =
    normalBalance === "Debit"
      ? openingBalance + totalDebit - totalCredit
      : openingBalance + totalCredit - totalDebit;

  return c.json({
    account: {
      id: account.id,
      code: account.code,
      name: account.name,
      normalBalance,
      isActive: account.is_active,
    },
    period: resolvedPeriod,
    startDate,
    endDate,
    openingBalance,
    closingBalance,
    totalDebit,
    totalCredit,
    lines: resultLines,
  });
});

export default ledger;
