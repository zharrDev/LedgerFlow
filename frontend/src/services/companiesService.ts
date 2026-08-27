import { api } from "../lib/api";

export type CompanyInfo = {
  id: string;
  name: string;
  currency: string;
};

// Ambil company milik user yang login (currency disimpan per-company).
export async function getMyCompany(): Promise<CompanyInfo> {
  const res = await api.get("/api/companies", { skipErrorToast: true });
  const data = Array.isArray(res.data) ? res.data[0] : res.data;
  return data as CompanyInfo;
}

// Simpan mata uang default company ke database.
export async function updateCompanyCurrency(currency: string): Promise<CompanyInfo> {
  const res = await api.patch("/api/companies/currency", { currency });
  return res.data as CompanyInfo;
}
