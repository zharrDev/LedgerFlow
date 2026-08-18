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

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await reportsService.getIncomeStatement(periodId);
      setData(result);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { data, loading, error, periodId, setPeriodId, refetch: fetchReport };
}
