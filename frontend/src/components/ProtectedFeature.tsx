// ============================================================================
// LEDGERFLOW - ProtectedFeature Wrapper
// ============================================================================

import { Loader2 } from "lucide-react";
import { useSubscription } from "../hooks/useSubscription";
import { Paywall } from "./Paywall";

interface ProtectedFeatureProps {
  feature: string;
  children: React.ReactNode;
}

export function ProtectedFeature({ feature, children }: ProtectedFeatureProps) {
  const { subscription, canAccess, planName, getRequiredPlan, isLoading } =
    useSubscription();

  // Spinner hanya saat belum ada data subscription (bukan setiap navigasi)
  if (isLoading && !subscription) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!canAccess(feature)) {
    return (
      <Paywall
        feature={feature}
        currentPlan={planName}
        requiredPlan={getRequiredPlan(feature) || "pro"}
      />
    );
  }

  return <>{children}</>;
}
