// src/services/reportsService.ts
import { api } from "../lib/api";
import { getSessionUser } from "../lib/session";
import type {
  IncomeStatementResponse,
  BalanceSheetResponse,
  CashFlowResponse,
  Period,
} from "../types/reports";

// Helper: ambil company_id user dari sesi
const getCompanyId = () => {
  const user = getSessionUser<{
    company_id?: string;
    company?: { id?: string };
  }>();
  return user?.company_id || user?.company?.id || "";
};

// Ambil laporan laba rugi
export const getIncomeStatement = async (
  periodId?: string,
  signal?: AbortSignal,
): Promise<IncomeStatementResponse> => {
  const { data } = await api.get<IncomeStatementResponse>(
    "/api/reports/income-statement",
    {
      params: {
        // Normalisasi "" → undefined agar parameter tidak dikirim kosong.
        ...(periodId ? { period_id: periodId } : {}),
        company_id: getCompanyId(),
      },
      signal,
      skipErrorToast: true,
    },
  );
  return data;
};

// Ambil laporan neraca
export const getBalanceSheet = async (
  periodId: string,
  companyId: string,
): Promise<BalanceSheetResponse> => {
  const { data } = await api.get<BalanceSheetResponse>(
    "/api/reports/balance-sheet",
    {
      params: {
        period_id: periodId,
        company_id: companyId,
      },
      skipErrorToast: true,
    },
  );
  return data;
};

// Ambil laporan arus kas
export const getCashFlow = async (
  periodId?: string,
): Promise<CashFlowResponse> => {
  const { data } = await api.get<CashFlowResponse>("/api/reports/cash-flow", {
    params: {
      period_id: periodId,
      company_id: getCompanyId(),
    },
    skipErrorToast: true,
  });
  return data;
};

// Ambil daftar periode untuk filter laporan
export const getPeriods = async (): Promise<Period[]> => {
  const companyId = getCompanyId();

  const { data } = await api.get("/api/reports/periods", {
    params: { company_id: companyId },
    skipErrorToast: true,
  });

  return Array.isArray(data) ? data : [];
};

// Gabungan fungsi service laporan
export const reportsService = {
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getPeriods,
};

export default reportsService;
