// src/types/journal.ts
export type JournalStatus = "draft" | "posted";

export interface JournalEntry {
  id: string;
  number: string;
  date: string;
  description: string;
  status: JournalStatus;
  createdAt: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
}

export interface JournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

export interface CreateJournalPayload {
  entry_date: string;
  description: string;
  period_id?: string;
  status?: "draft" | "posted";
  lines: Array<{
    accountCode: string;
    debit: number;
    credit: number;
    memo?: string;
  }>;
}

export interface JournalEntryForm {
  date: string;
  period_id?: string;
  description: string;
  lines: JournalLineForm[];
}

export interface JournalLineForm {
  uid: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: string;
  credit: string;
}

export interface JournalFormErrors {
  date?: string;
  description?: string;
  lines?: string;
  balance?: string;
}

export type FilterStatus = "all" | "active" | "inactive";

// Tipe toast lokal sederhana (sama seperti di types/account.ts & types/ledger.ts)
export interface Toast {
  id: number;
  msg: string;
  type: "success" | "error";
}
