// ============================================================================
// LEDGERFLOW - useSubscription Hook
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getSubscription,
  checkFeatureAccess,
  type Subscription,
} from "../services/paymentService";
import { getErrorMessage } from "../lib/errorMessage";

// Mapping fitur ke plan minimum yang boleh mengaksesnya
const FEATURE_PLAN: Record<string, string[]> = {
  income_statement: ["pro", "enterprise"],
  balance_sheet: ["pro", "enterprise"],
  cash_flow: ["pro", "enterprise"],
  export_pdf: ["pro", "enterprise"],
  export_csv: ["enterprise"],
  unlimited_journals: ["pro", "enterprise"],
  multi_company: ["pro", "enterprise"],
  multi_user: ["enterprise"],
  api_access: ["enterprise"],
};

// Hook subscription: ambil data langganan user dan bantu cek hak akses fitur
export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getSubscription();
      setSubscription(data);
    } catch (err) {
      console.error("[useSubscription] Error:", err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Computed properties agar komponen cukup pakai hasil siap pakai
  const planName = subscription?.plans?.name || "free";
  const isActive = subscription?.is_active ?? false;
  const isTrial = subscription?.is_trial ?? false;
  const trialDaysLeft = subscription?.trial_days_left ?? 0;

  const isFree = planName === "free";
  const isPro = planName === "pro";
  const isEnterprise = planName === "enterprise";

  // Cek akses fitur di sisi client berdasarkan plan aktif user
  const canAccess = useCallback(
    (feature: string): boolean => {
      if (!isActive) return false;

      const allowedPlans = FEATURE_PLAN[feature];
      if (!allowedPlans) return true;
      return allowedPlans.includes(planName);
    },
    [isActive, planName],
  );

  // Ambil plan minimum yang dibutuhkan untuk fitur tertentu
  const getRequiredPlan = useCallback((feature: string): string | null => {
    const plans = FEATURE_PLAN[feature];
    return plans ? plans[0] : null;
  }, []);

  // Ringkasan subscription yang siap dipakai di UI
  const subscriptionSummary = useMemo(() => {
    if (!subscription) return null;

    return {
      planName: subscription.plans?.display_name || "Free",
      status: subscription.status,
      billingCycle: subscription.billing_cycle,
      currentPeriodEnd: subscription.current_period_end,
      isActive,
      isTrial,
      trialDaysLeft,
    };
  }, [subscription, isActive, isTrial, trialDaysLeft]);

  return {
    subscription,
    subscriptionSummary,
    isLoading,
    error,
    planName,
    isActive,
    isFree,
    isPro,
    isEnterprise,
    isTrial,
    trialDaysLeft,
    canAccess,
    getRequiredPlan,
    refresh: fetchSubscription,
  };
}
