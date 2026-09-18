// ============================================================================
// LEDGERFLOW - useSubscription Hook
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getSubscription,
  type Subscription,
} from "../services/paymentService";
import { getErrorMessage } from "../lib/errorMessage";

// Cache modul + sessionStorage: mount ulang / full reload (mis. setelah
// pindah company) tidak menunggu fetch ulang - UI langsung render dari
// cache, lalu data di-refresh di belakang (stale-while-revalidate).
const SUB_CACHE_KEY = "subscription_cache";
const SUB_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedSubscription: Subscription | null = readSessionCache();
let inflightFetch: Promise<Subscription | null> | null = null;

function readSessionCache(): Subscription | null {
  try {
    const raw = sessionStorage.getItem(SUB_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t: number; d: Subscription | null };
    if (!parsed || Date.now() - parsed.t > SUB_CACHE_TTL_MS) return null;
    return parsed.d ?? null;
  } catch {
    return null;
  }
}

function writeSessionCache(data: Subscription | null): void {
  try {
    sessionStorage.setItem(SUB_CACHE_KEY, JSON.stringify({ t: Date.now(), d: data }));
  } catch {
    // sessionStorage penuh / diblokir - cache modul tetap bekerja.
  }
}

/**
 * Hapus cache subscription (modul + sessionStorage).
 * Wajib dipanggil saat checkout dimulai supaya badge plan & CTA pricing
 * tidak menampilkan data basi ("Upgrade ke Pro" padahal sudah Pro).
 */
export function clearSubscriptionCache(): void {
  cachedSubscription = null;
  try {
    sessionStorage.removeItem(SUB_CACHE_KEY);
  } catch {
    // sessionStorage mungkin diblokir — abaikan
  }
}

/**
 * Paksa fetch subscription terbaru dari server dan perbarui semua cache.
 * Dipanggil setelah pembayaran sukses / cancel agar UI langsung akurat.
 */
export function refreshSubscription(): Promise<Subscription | null> {
  return loadSubscription();
}

async function loadSubscription(): Promise<Subscription | null> {
  if (inflightFetch) return inflightFetch;
  inflightFetch = getSubscription()
    .then((data) => {
      cachedSubscription = data;
      writeSessionCache(data);
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
  const billingCycle = subscription?.billing_cycle === "yearly" ? "yearly" : "monthly";
  const isActive = subscription?.is_active ?? false;
  const isTrial = subscription?.is_trial ?? false;
  const trialDaysLeft = subscription?.trial_days_left ?? 0;
  const planFeatures: string[] = subscription?.plans?.features ?? [];

  const isFree = planName === "free";
  const isPro = planName === "pro";
  const isEnterprise = planName === "enterprise";

  const canAccess = useCallback(
    (feature: string): boolean => {
      if (!isActive) return false;
      // Trial grants access only to core features: income_statement, balance_sheet, cash_flow, export_pdf
      const trialCoreFeatures = ["income_statement", "balance_sheet", "cash_flow", "export_pdf"];
      if (isTrial && trialCoreFeatures.includes(feature)) {
        return true;
      }

      // Cek apakah feature ada di plan features
      return planFeatures.includes(feature);
    },
    [isActive, isTrial, planFeatures],
  );

  const getRequiredPlan = useCallback((feature: string): string | null => {
    // Cari plan minimum yang punya feature ini
    // Karena features sekarang di DB, kita pakai fallback mapping untuk required_plan
    const FEATURE_PLAN_FALLBACK: Record<string, string[]> = {
      income_statement: ["pro", "enterprise"],
      balance_sheet: ["pro", "enterprise"],
      cash_flow: ["pro", "enterprise"],
      export_pdf: ["pro", "enterprise"],
      export_csv: ["enterprise"],
      unlimited_journals: ["pro", "enterprise"],
      multi_company: ["pro", "enterprise"],
      multi_user: ["enterprise"],
      api_access: ["enterprise"],
      custom_reports: ["enterprise"],
      audit_trail: ["enterprise"],
      priority_support: ["pro", "enterprise"],
      dedicated_support: ["enterprise"],
    };
    const plans = FEATURE_PLAN_FALLBACK[feature];
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
    billingCycle,
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