import { useState, useEffect, useCallback } from "react";
import type { IncomeStatementResponse } from "../types/reports";
import { reportsService } from "../services/reportsService";
import { getErrorMessage } from "../lib/errorMessage";

// Hook untuk mengambil dan mengelola data laporan laba rugi
export function useIncomeStatement(initialPeriodId?: string) {
  const [periodId, setPeriodId] = useState<string | undefined>(initialPeriodId);
  const [data, setData] = useState<IncomeStatementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const result = await reportsService.getIncomeStatement(periodId, signal);
        setData(result);
      } catch (e) {
        // Request yang dibatalkan (ganti periode / unmount) → abaikan.
        if (signal?.aborted) return;
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [periodId],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchReport(controller.signal);
    return () => controller.abort();
  }, [fetchReport]);

  return { data, loading, error, periodId, setPeriodId, refetch: fetchReport };
}
