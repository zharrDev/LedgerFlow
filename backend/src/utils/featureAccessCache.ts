// ============================================================================
// Cache Manager: Fitur Access Caching - Cache akses feature untuk meningkatkan performa
// ============================================================================
// Mengurangi database calls untuk pengecekan fitur berulang kali, khususnya untuk dashboard
// dan page dengan banyak fitur check. Cache berlangsung 5 menit dan invalidasi saat subscription user berubah.

import { supabase } from "./supabase.js";

// Cache entry dengan timestamp
interface CacheEntry {
  data: FeatureAccessInfo;
  expiry: number;
}

// Info akses fitur yang disimpan di cache
interface FeatureAccessInfo {
  has_access: boolean;
  plan: string;
  is_trial: boolean;
  trial_days_left: number;
}

class FeatureAccessCache {
  // Cache utama: key = "feature_access:{userId}:{feature}"
  private cache = new Map<string, CacheEntry>();
  
  // TTL untuk cache dalam hitungan milidetik
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 menit
  private readonly SUBSCRIPTION_TTL_MS = 60 * 1000; // 1 menit (subscription berubah)
  
  // Key untuk cache subscription user
  private subscriptionKey(userId: string): string {
    return `subscription:${userId}`;
  }
  
  // Key untuk cache akses fitur
  private featureKey(userId: string, feature: string): string {
    return `feature_access:${userId}:${feature}`;
  }
  
  // Ambil data dari cache berdasarkan key
  get(key: string): FeatureAccessInfo | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Validasi expiry
    if (entry.expiry > Date.now()) {
      return entry.data;
    }
    
    // Hapus entry expired
    this.cache.delete(key);
    return null;
  }
  
  // Simpan data ke cache dengan TTL tertentu
  set(key: string, data: FeatureAccessInfo, ttlMs: number = this.DEFAULT_TTL_MS): void {
    const expiry = Date.now() + ttlMs;
    this.cache.set(key, { data, expiry });
  }
  
  // Clear all cache (berguna saat subscription berubah)
  clear(): void {
    this.cache.clear();
  }
  
  // Ambil subscription user dari cache
  async getUserSubscription(userId: string): Promise<FeatureAccessInfo | null> {
    const key = this.subscriptionKey(userId);
    let cached = this.get(key);
    
    if (cached) {
      return cached;
    }
    
    // Fallback: ambil dari database
    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        "*, plans(name, display_name), " +
        "users(name, email), " +
        "company_members(role), " +
        "company_members(status), " +
        "company_members(created_at), " +
        "company_members(company_id), " +
        "companies(name)"
      )
      .eq("user_id", userId)
      .maybeSingle();
    
    if (error || !data) {
      return null;
    }
    
    const planName = data.plans?.name || "free";
    const isTrial = data.status === "trialing";
    const trialDaysLeft = isTrial 
      ? Math.ceil((new Date(data.trial_end).getTime() - Date.now()) / 86,400,000)
      : 0;
    
    const result: FeatureAccessInfo = {
      has_access: true,
      plan: planName,
      is_trial: isTrial,
      trial_days_left: trialDaysLeft,
    };
    
    this.set(key, result, this.SUBSCRIPTION_TTL_MS);
    return result;
  }
  
  // Ambil akses fitur dari cache, jika tidak ada ambil dari database
  async getFeatureAccess(userId: string, feature: string): Promise<FeatureAccessInfo | null> {
    const key = this.featureKey(userId, feature);
    
    // Cek dulu cache
    let cached = this.get(key);
    if (cached) {
      return cached;
    }
    
    // Fallback: ambil data subscription user dari cache
    let subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      return null;
    }
    
    // Evaluasi akses berdasarkan plan dan trial status
    const planName = subscription.plan;
    const isTrial = subscription.is_trial;
    const trialDaysLeft = subscription.trial_days_left;
    
    // Definisikan fitur yang bisa diakses per plan
    const featureAccessMap: Record<string, string[]> = {
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
    
    // Logic access: trial (hanya 4 fitur inti) -> pro/enterprise plan
    const trialCoreFeatures = ["income_statement", "balance_sheet", "cash_flow", "export_pdf"];
    let hasAccess = false;
    
    if (isTrial) {
      hasAccess = trialCoreFeatures.includes(feature);
    } else {
      const allowedPlans = featureAccessMap[feature] || [];
      hasAccess = allowedPlans.includes(planName);
    }
    
    const result: FeatureAccessInfo = {
      has_access: hasAccess,
      plan: planName,
      is_trial: isTrial,
      trial_days_left: trialDaysLeft,
    };
    
    this.set(key, result, this.DEFAULT_TTL_MS);
    return result;
  }
  
  // Invalidasi cache user (berguna saat subscription berubah)
  invalidateUser(userId: string): void {
    this.cache.delete(this.subscriptionKey(userId));
    // Hapus semua key yang dimulai dengan pattern ini
    for (const key of this.cache.keys()) {
      if (key.startsWith(`feature_access:${userId}:`) || 
          key.startsWith(`subscription:${userId}`)) {
        this.cache.delete(key);
      }
    }
  }
  
  // Ambil statistik cache (berguna untuk monitoring)
  getStats(): { cacheSize: number; keys: string[] } {
    return {
      cacheSize: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const featureAccessCache = new FeatureAccessCache();
