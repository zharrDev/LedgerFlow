// ============================================================================
// LEDGERFLOW - useSubscription Hook
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getSubscription,
  type Subscription,
} from "../services/paymentService";
import { getErrorMessage } from "../lib/errorMessage";

// Module-scope cache — subsequent mounts reuse data, refresh in background.
let cachedSubscription: Subscription | null = null;
let inflightFetch: Promise<Subscription | null> | null = null;

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

async function loadSubscription(): Promise<Subscription | null> {
  if (inflightFetch) return inflightFetch;
  inflightFetch = getSubscription()
    .then((data) => {
      cachedSubscription = data;
      return data;
    })
    .catch((err) => {
      console.error("[useSubscription] Error:", err);
      throw err;
    })
    .finally(() => {
      inflightFetch = null;
    });
  return inflightFetch;
}

// Hook subscription: ambil data langganan user dan bantu cek hak akses fitur
export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(
    cachedSubscription,
  );
  const [isLoading, setIsLoading] = useState(!cachedSubscription);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async (background = false) => {
    if (!background && !cachedSubscription) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await loadSubscription();
      setSubscription(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cachedSubscription) {
      fetchSubscription(true);
    } else {
      fetchSubscription(false);
    }
  }, [fetchSubscription]);

  // Computed properties agar komponen cukup pakai hasil siap pakai
  const planName = subscription?.plans?.name || "free";
  const isActive = subscription?.is_active ?? false;
  const isTrial = subscription?.is_trial ?? false;
  const trialDaysLeft = subscription?.trial_days_left ?? 0;

  const isFree = planName === "free";
  const isPro = planName === "pro";
  const isEnterprise = planName === "enterprise";

  const canAccess = useCallback(
    (feature: string): boolean => {
      if (!isActive) return false;
      if (isTrial) return true;

      const allowedPlans = FEATURE_PLAN[feature];
      if (!allowedPlans) return true;
      return allowedPlans.includes(planName);
    },
    [isActive, isTrial, planName],
  );

  const getRequiredPlan = useCallback((feature: string): string | null => {
    const plans = FEATURE_PLAN[feature];
    return plans ? plans[0] : null;
  }, []);

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
    refresh: () => fetchSubscription(true),
  };
}
