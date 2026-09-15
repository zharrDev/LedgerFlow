// ============================================================================
// Admin Analytics Dashboard - Metrics dan insights untuk admin platform
// ============================================================================
// Melacak penggunaan fitur premium, konversi trial, analisis rate limit, dan health checks.
// Berguna untuk monitoring, debugging, dan optimasi bisnis.

import { supabase } from "../lib/supabase.js";
import { featureAccessCache } from "../utils/featureAccessCache.js";
import { getRateLimitStats } from "../middleware/rateLimit.js";

// Interface untuk dashboard metrics
interface DashboardMetrics {
  userMetrics: UserMetrics;
  revenueMetrics: RevenueMetrics;
  featureUsageMetrics: FeatureUsageMetrics;
  securityMetrics: SecurityMetrics;
}

interface UserMetrics {
  totalUsers: number;
  activeUsers24h: number;
  newUsersToday: number;
  trialConversionRate: number;
  subscriptionRetentionRate: number;
  topPlans: Array<{ plan: string; count: number; percentage: number }>;
}

interface RevenueMetrics {
  monthlyRevenue: number;
  monthlyRecurringRevenue: number;
  averageRevenuePerUser: number;
  revenueByPlan: Array<{ plan: string; revenue: number; percentage: number }>;
}

interface FeatureUsageMetrics {
  totalFeatureAccessRequests: number;
  featureAccessByFeature: Array<{ feature: string; accessCount: number; percentage: number }>;
  peakAccessTimes: Array<{ hour: number; requests: number }>;
  topActiveUsers: Array<{ userId: string; accessCount: number; email?: string }>;
}

interface SecurityMetrics {
  totalRateLimitEvents: number;
  activeRateLimitViolations: number;
  blockedIPs: number;
  featureAccessLogs: number;
  failedLoginAttempts: number;
}

// Mengambil semua metrik dashboard
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Data user
  const { data: users } = await supabase
    .from("users")
    .select("id, created_at, email, role")
    .gte("created_at", startOfDay.toISOString());
  
  const { data: activeUsers24h } = await supabase
    .from("users")
    .select("id")
    .gt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  
  // Subscription data untuk trial conversion dan revenue
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select(
      "*, " +
      "plans(name, price_monthly, price_yearly), " +
      "users(name, email)"
    )
    .gte("created_at", startOfMonth.toISOString());
  
  // Feature access logs hari ini
  const { data: featureLogs } = await supabase
    .from("feature_access_logs")
    .select("feature, user_id, granted")
    .gte("timestamp", startOfDay.toISOString());
  
  // Rate limit logs hari ini
  const { data: rateLimitLogs } = await supabase
    .from("rate_limit_logs")
    .select("*")
    .gte("timestamp", startOfDay.toISOString());
  
  // Hitung metrics utama
  const userMetrics: UserMetrics = {
    totalUsers: users?.length || 0,
    activeUsers24h: activeUsers24h?.length || 0,
    newUsersToday: users?.length || 0,
    trialConversionRate: calculateTrialConversionRate(subscriptions || []),
    subscriptionRetentionRate: calculateSubscriptionRetention(subscriptions || []),
    topPlans: calculateTopPlans(subscriptions || []),
  };
  
  const revenueMetrics: RevenueMetrics = {
    monthlyRevenue: calculateMonthlyRevenue(subscriptions || []),
    monthlyRecurringRevenue: calculateMonthlyRecurringRevenue(subscriptions || []),
    averageRevenuePerUser: calculateAverageRevenuePerUser(subscriptions || []),
    revenueByPlan: calculateRevenueByPlan(subscriptions || []),
  };
  
  const featureUsageMetrics: FeatureUsageMetrics = {
    totalFeatureAccessRequests: featureLogs?.length || 0,
    featureAccessByFeature: calculateFeatureAccessByFeature(featureLogs || []),
    peakAccessTimes: calculatePeakAccessTimes(featureLogs || []),
    topActiveUsers: calculateTopActiveUsers(featureLogs || []),
  };
  
  const securityMetrics: SecurityMetrics = {
    totalRateLimitEvents: rateLimitLogs?.length || 0,
    activeRateLimitViolations: rateLimitLogs?.filter(log => log.reset_at && new Date(log.reset_at) > now).length || 0,
    blockedIPs: calculateUniqueBlockedIPs(rateLimitLogs || []),
    featureAccessLogs: featureLogs?.length || 0,
    failedLoginAttempts: await calculateFailedLoginAttempts(),
  };
  
  return {
    userMetrics,
    revenueMetrics,
    featureUsageMetrics,
    securityMetrics,
  };
}

// Kalkulasi tingkat konversi trial ke paid (berdasarkan subscription yang dibuat hari ini)
function calculateTrialConversionRate(subscriptions: any[]): number {
  const trialSubscriptions = subscriptions.filter(s => s.status === "trialing");
  const paidSubscriptions = subscriptions.filter(s => s.status === "active");
  const total = trialSubscriptions.length + paidSubscriptions.length;
  return total === 0 ? 0 : (paidSubscriptions.length / total) * 100;
}

// Kalkulasi retention subscription (berdasarkan subscription yang dibuat bulan ini)
function calculateSubscriptionRetention(subscriptions: any[]): number {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  const olderSubscriptions = subscriptions.filter(s => 
    new Date(s.created_at) < oneMonthAgo
  );
  const recentSubscriptions = subscriptions.filter(s =>
    new Date(s.created_at) >= oneMonthAgo
  );
  
  const retained = olderSubscriptions.filter(s => s.status === "active");
  const totalOld = olderSubscriptions.length;
  
  return totalOld === 0 ? 0 : (retained.length / totalOld) * 100;
}

// Kalkulasi distribusi plan
function calculateTopPlans(subscriptions: any[]): Array<{ plan: string; count: number; percentage: number }> {
  const planCounts = subscriptions.reduce((acc, sub) => {
    const planName = sub.plans?.name || "unknown";
    acc[planName] = (acc[planName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const total = Object.values(planCounts).reduce((sum, count) => sum + count, 0);
  
  return Object.entries(planCounts)
    .map(([plan, count]) => ({
      plan,
      count,
      percentage: total === 0 ? 0 : (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

// Kalkulasi pendapatan bulanan
function calculateMonthlyRevenue(subscriptions: any[]): number {
  return subscriptions.reduce((sum, sub) => {
    const price = sub.plans?.price_monthly || sub.plans?.price_yearly || 0;
    // Asumsikan semua subscription bulanan untuk kesederhanaan
    return sum + price;
  }, 0);
}

// Kalkulasi Monthly Recurring Revenue (MRR)
function calculateMonthlyRecurringRevenue(subscriptions: any[]): number {
  return subscriptions.reduce((sum, sub) => {
    const price = sub.plans?.price_monthly || 0;
    return sum + price;
  }, 0);
}

// Kalkulasi Average Revenue Per User (ARPU)
function calculateAverageRevenuePerUser(subscriptions: any[]): number {
  const totalRevenue = calculateMonthlyRevenue(subscriptions);
  const uniqueUsers = new Set(subscriptions.map(s => s.user_id)).size;
  return uniqueUsers === 0 ? 0 : totalRevenue / uniqueUsers;
}

// Kalkulasi revenue berdasarkan plan
function calculateRevenueByPlan(subscriptions: any[]): Array<{ plan: string; revenue: number; percentage: number }> {
  const revenueByPlan = subscriptions.reduce((acc, sub) => {
    const planName = sub.plans?.name || "unknown";
    const price = sub.plans?.price_monthly || 0;
    acc[planName] = (acc[planName] || 0) + price;
    return acc;
  }, {} as Record<string, number>);
  
  const totalRevenue = Object.values(revenueByPlan).reduce((sum, revenue) => sum + revenue, 0);
  
  return Object.entries(revenueByPlan)
    .map(([plan, revenue]) => ({
      plan,
      revenue,
      percentage: totalRevenue === 0 ? 0 : (revenue / totalRevenue) * 100,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

// Kalkulasi akses fitur berdasarkan fitur
function calculateFeatureAccessByFeature(logs: any[]): Array<{ feature: string; accessCount: number; percentage: number }> {
  const featureCounts = logs.reduce((acc, log) => {
    acc[log.feature] = (acc[log.feature] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const totalAccess = Object.values(featureCounts).reduce((sum, count) => sum + count, 0);
  
  return Object.entries(featureCounts)
    .map(([feature, count]) => ({
      feature,
      accessCount: count,
      percentage: totalAccess === 0 ? 0 : (count / totalAccess) * 100,
    }))
    .sort((a, b) => b.accessCount - a.accessCount);
}

// Kalkulasi waktu puncak akses (jam dengan request terbanyak)
function calculatePeakAccessTimes(logs: any[]): Array<{ hour: number; requests: number }> {
  const hourCounts: Record<number, number> = {};
  
  logs.forEach(log => {
    const hour = new Date(log.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  return Object.entries(hourCounts)
    .map(([hour, requests]) => ({
      hour: parseInt(hour),
      requests,
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 5); // Top 5 jam paling sibuk
}

// Kalkulasi user paling aktif berdasarkan akses fitur
function calculateTopActiveUsers(logs: any[]): Array<{ userId: string; accessCount: number; email?: string }> {
  const userAccessCounts: Record<string, { count: number; email?: string }> = {};
  
  logs.forEach(log => {
    if (!userAccessCounts[log.user_id]) {
      userAccessCounts[log.user_id] = {
        count: 0,
        email: log.user_email,
      };
    }
    userAccessCounts[log.user_id].count++;
  });
  
  return Object.entries(userAccessCounts)
    .map(([userId, data]) => ({
      userId,
      accessCount: data.count,
      email: data.email,
    }))
    .sort((a, b) => b.accessCount - a.accessCount)
    .slice(0, 10); // Top 10 user paling aktif
}

// Kalkulasi unique IP yang diblokir
function calculateUniqueBlockedIPs(logs: any[]): number {
  const uniqueIPs = new Set(logs.map(log => log.ip_address));
  return uniqueIPs.size;
}

// Kalkulasi failed login attempts (perkiraan)
async function calculateFailedLoginAttempts(): Promise<number> {
  const { count, error } = await supabase
    .from("user_auth_logs")
    .select("id", { count: "exact", head: true })
    .eq("action", "failed_login");
  
  if (error) {
    console.error("Gagal menghitung failed login attempts:", error);
    return 0;
  }
  
  return count || 0;
}

// Export helper functions untuk route
export const analyticsService = {
  getDashboardMetrics,
  getRateLimitStats,
  featureAccessCache,
};