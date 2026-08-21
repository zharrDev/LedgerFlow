// Types untuk modul laporan keuangan

export interface IncomeStatementItem {
  accountCode: string;
  accountName: string;
  amount: number;
}

// Response laporan laba rugi
export interface IncomeStatementResponse {
  periodId: string;
  revenue: IncomeStatementItem[];
  totalRevenue: number;
  expense: IncomeStatementItem[];
  totalExpense: number;
  netIncome: number;
}

export interface BalanceSheetAccount {
  account_id: string;
  account_code: string;
  account_name: string;
  balance: number;
}

// Response laporan neraca
export interface BalanceSheetResponse {
  assets: BalanceSheetAccount[];
  liabilities: BalanceSheetAccount[];
  equity: BalanceSheetAccount[];
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  is_balanced: boolean;
}

// Bentuk data periode akuntansi
export interface Period {
  id: string;
  company_id: string;
  year: number;
  month: number;
  status: "open" | "closed";
  closed_at?: string | null;
  /** Label periode (mis. "Januari 2026") — diisi backend /api/reports/periods */
  name?: string;
}

export interface CashFlowItem {
  accountCode?: string;
  accountName?: string;
  label?: string;
  amount: number;
}

export interface CashFlowSection {
  description: string;
  items: CashFlowItem[];
  subtotal: number;
}

// Response laporan arus kas
export interface CashFlowResponse {
  periodId: string | null;
  periodName: string;
  operating: CashFlowSection;
  investing: CashFlowSection;
  financing: CashFlowSection;
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
}
