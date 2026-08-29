// frontend/src/hooks/useLedgerQueries.ts
// React Query hooks untuk buku besar (ledger).

import { useQuery } from "@tanstack/react-query";
import { ledgerService } from "../services/ledgerService";
import type { LedgerQueryParams } from "../types/ledger";

/** Data buku besar per akun */
export function useLedgerData(params: LedgerQueryParams | null) {
  return useQuery({
    queryKey: ["ledger", params],
    queryFn: () => ledgerService.getLedger(params!),
    staleTime: 2 * 60 * 1000,
    enabled: !!params?.accountId && (!!params?.periodId || (!!params?.startDate && !!params?.endDate)),
  });
}

/** Daftar akun untuk dropdown buku besar */
export function useLedgerAccounts() {
  return useQuery({
    queryKey: ["ledger-accounts"],
    queryFn: ledgerService.getAccounts,
    staleTime: 10 * 60 * 1000,
  });
}

/** Daftar periode untuk filter buku besar */
export function useLedgerPeriods() {
  return useQuery({
    queryKey: ["ledger-periods"],
    queryFn: ledgerService.getPeriods,
    staleTime: 10 * 60 * 1000,
  });
}
