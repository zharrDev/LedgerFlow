// frontend/src/hooks/useReports.ts
// React Query hooks untuk laporan keuangan.
//
// Pemakaian:
//   const { data, isLoading } = useIncomeStatement(periodId)
//   const { data: periods } = useReportPeriods()

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { reportsService } from "../services/reportsService";

/** Laporan laba rugi */
export function useIncomeStatement(periodId?: string) {
  return useQuery({
    queryKey: ["reports", "income-statement", periodId],
    queryFn: ({ signal }) =>
      reportsService.getIncomeStatement(periodId, signal),
    staleTime: 3 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

/** Laporan neraca */
export function useBalanceSheet(periodId: string, companyId: string) {
  return useQuery({
    queryKey: ["reports", "balance-sheet", periodId, companyId],
    queryFn: () => reportsService.getBalanceSheet(periodId, companyId),
    staleTime: 3 * 60 * 1000,
    enabled: !!companyId,
    placeholderData: keepPreviousData,
  });
}

/** Laporan arus kas */
export function useCashFlow(periodId?: string) {
  return useQuery({
    queryKey: ["reports", "cash-flow", periodId],
    queryFn: () => reportsService.getCashFlow(periodId),
    staleTime: 3 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

/** Daftar periode untuk filter laporan */
export function useReportPeriods() {
  return useQuery({
    queryKey: ["reports", "periods"],
    queryFn: reportsService.getPeriods,
    staleTime: 10 * 60 * 1000, // 10 menit — periode jarang berubah
  });
}
