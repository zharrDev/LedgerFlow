// src/hooks/useDashboardData.ts
import { useState, useEffect } from "react";
import { reportsService } from "../services/reportsService";
import { getSessionUser } from "../lib/session";
import { getErrorMessage } from "../lib/errorMessage";

// Ringkasan data dashboard dari beberapa laporan keuangan
export interface DashboardSummary {
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isBalanced: boolean;
  beginningCash: number;
  endingCash: number;
  netCashFlow: number;
  operatingCash: number;
  investingCash: number;
  financingCash: number;
}

// Hook dashboard: gabungkan income statement, balance sheet, dan cash flow
export function useDashboardData(periodId?: string) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = getSessionUser<{
          company_id?: string;
          company?: { id?: string };
        }>();
        const companyId = user?.company_id || user?.company?.id || "";

        const [income, balance, cashFlow] = await Promise.all([
          reportsService.getIncomeStatement(periodId).catch(() => null),
          reportsService
            .getBalanceSheet(periodId || "", companyId)
            .catch(() => null),
          reportsService.getCashFlow(periodId).catch(() => null),
        ]);

        if (!active) return;

        setSummary({
          totalRevenue: income?.totalRevenue ?? 0,
          totalExpense: income?.totalExpense ?? 0,
          netIncome: income?.netIncome ?? 0,
          totalAssets: balance?.total_assets ?? 0,
          totalLiabilities: balance?.total_liabilities ?? 0,
          totalEquity: balance?.total_equity ?? 0,
          isBalanced: balance?.is_balanced ?? true,
          beginningCash: cashFlow?.beginningCash ?? 0,
          endingCash: cashFlow?.endingCash ?? 0,
          netCashFlow: cashFlow?.netCashFlow ?? 0,
          operatingCash: cashFlow?.operating?.subtotal ?? 0,
          investingCash: cashFlow?.investing?.subtotal ?? 0,
          financingCash: cashFlow?.financing?.subtotal ?? 0,
        });
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      active = false;
    };
  }, [periodId]);

  return { summary, loading, error };
}
