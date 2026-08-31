import { useState, useEffect, useCallback, useRef } from "react";
import type { IncomeStatementResponse } from "../types/reports";
import { reportsService } from "../services/reportsService";
import { getErrorMessage } from "../lib/errorMessage";

// Hook untuk mengambil dan mengelola data laporan laba rugi.
// First load: loading=true. Refetch: data lama tetap, isRefetching=true.
export function useIncomeStatement(initialPeriodId?: string) {
  const [periodId, setPeriodId] = useState<string | undefined>(initialPeriodId);
  const [data, setData] = useState<IncomeStatementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  const fetchReport = useCallback(
    async (signal?: AbortSignal) => {
      const isFirst = !hasDataRef.current;
      if (isFirst) setLoading(true);
      else setIsRefetching(true);
      setError(null);
      try {
        const result = await reportsService.getIncomeStatement(periodId, signal);
        setData(result);
        hasDataRef.current = true;
      } catch (e) {
        if (signal?.aborted) return;
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
        setIsRefetching(false);
      }
    },
    [periodId],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchReport(controller.signal);
    return () => controller.abort();
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
