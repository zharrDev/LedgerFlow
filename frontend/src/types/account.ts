// Type akun untuk modul Chart of Accounts
export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense";

// Saldo normal akun
export type NormalBalance = "Debit" | "Credit";

// Tipe filter untuk UI akun
export type FilterStatus = "all" | "active" | "inactive";

// Bentuk data akun yang dipakai di frontend
export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  isActive: boolean;
}

// Bentuk data form tambah/edit akun
export interface AccountFormData {
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  isActive: boolean;
}

// Error per field form akun
export type FormErrors = Partial<Record<keyof AccountFormData, string>>;

// Tipe toast lokal sederhana
export interface Toast {
  id: number;
  msg: string;
  type: "success" | "error";
}
