// src/hooks/useCashFlow.ts
import { useState, useEffect, useCallback, useRef } from "react";
import type { CashFlowResponse } from "../types/reports";
import { reportsService } from "../services/reportsService";
import { getErrorMessage } from "../lib/errorMessage";

// Hook untuk mengambil dan mengelola data laporan arus kas.
// First load: loading=true. Refetch: data lama tetap, isRefetching=true.
export function useCashFlow(initialPeriodId?: string) {
  const [periodId, setPeriodId] = useState<string | undefined>(initialPeriodId);
  const [data, setData] = useState<CashFlowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  const fetchReport = useCallback(async () => {
    const isFirst = !hasDataRef.current;
    if (isFirst) setLoading(true);
    else setIsRefetching(true);
    setError(null);
    try {
      const result = await reportsService.getCashFlow(periodId);
      setData(result);
      hasDataRef.current = true;
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setIsRefetching(false);
    }
  }, [periodId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    data,
    loading,
    isRefetching,
    error,
    periodId,
    setPeriodId,
    refetch: fetchReport,
  };
}
