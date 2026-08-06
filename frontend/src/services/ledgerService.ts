import type {
  AccountOption,
  Period,
  LedgerResult,
  LedgerQueryParams,
  NormalBalance,
} from "../types/ledger";
import { api } from "../lib/api";

// Helper: normalisasi normal balance dari format backend ke format frontend
function normalizeBalance(nb: any): NormalBalance {
  return String(nb).toUpperCase() === "CREDIT" ? "Credit" : "Debit";
}

// Mapper data account dari backend -> frontend
function mapAccount(a: any): AccountOption {
  return {
    id: a.id,
    code: a.code,
    name: a.name,
    normalBalance: normalizeBalance(a.normalBalance ?? a.normal_balance),
    isActive: a.isActive ?? a.is_active ?? true,
  };
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

// Mapper data periode dari backend -> frontend
function mapPeriod(p: any): Period {
  if (p.startDate || p.start_date || p.name) {
    return {
      id: p.id,
      name:
        p.name ??
        `${MONTH_NAMES_ID[(p.month ?? 1) - 1] ?? ""} ${p.year ?? ""}`.trim(),
      startDate: p.startDate ?? p.start_date,
      endDate: p.endDate ?? p.end_date,
      isActive: p.isActive ?? p.is_active ?? p.status === "open",
    };
  }

  const year = Number(p.year);
  const month = Number(p.month);
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    id: p.id,
    name: `${MONTH_NAMES_ID[month - 1] ?? month} ${year}`,
    startDate: `${year}-${pad(month)}-01`,
    endDate: `${year}-${pad(month)}-${pad(lastDay)}`,
    isActive: p.status === "open",
  };
}

// Service buku besar: ambil akun referensi, periode, dan hasil ledger
export const ledgerService = {
  // Ambil daftar akun untuk dropdown/filter buku besar
  getAccounts: async (): Promise<AccountOption[]> => {
    const { data } = await api.get("/api/accounts");
    const list = Array.isArray(data) ? data : (data?.data ?? []);
    return (list ?? []).map(mapAccount);
  },

  // Ambil daftar periode, kalau endpoint belum ada maka kembalikan array kosong
  getPeriods: async (): Promise<Period[]> => {
    try {
      const { data } = await api.get("/api/periods");
      return (data ?? []).map(mapPeriod);
    } catch {
      return [];
    }
  },

  // Ambil hasil buku besar berdasarkan account_id + period/range tanggal
  getLedger: async (params: LedgerQueryParams): Promise<LedgerResult> => {
    const query: Record<string, string> = {
      account_id: String(params.accountId),
    };
    if (params.periodId !== undefined && params.periodId !== "") {
      query.period_id = String(params.periodId);
    }
    if (params.startDate) query.start_date = params.startDate;
    if (params.endDate) query.end_date = params.endDate;

    const { data } = await api.get("/api/ledger", { params: query });
    return data as LedgerResult;
  },
};
