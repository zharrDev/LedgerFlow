// ============================================================================
// Middleware: Access Logger - Melacak setiap permintaan ke fitur premium
// ============================================================================
// Digunakan untuk audit trails, analisis fitur, mendeteksi abuse, dan monitoring keamanan.
// Semua permintaan akses fitur premium dicatat dengan IP, user-agent, dan metadata lengkap.
// Digunakan oleh route /check-access, payment processing, dan admin features.

import type { Context, Next } from "hono";
import { supabase } from "../lib/supabase.js";

// Type untuk data log akses fitur premium
interface FeatureAccessLog {
  user_id: string;
  feature: string;
  plan_at_access: string;
  granted: boolean;
  ip_address: string;
  user_agent: string;
  request_path: string;
  method: string;
  user_email?: string;
  company_id?: string;
  timestamp: string;
}

// Middleware utama untuk logging akses fitur premium
export const featureAccessLogger = async (c: Context, next: Next) => {
  await next();
  
  // Dapatkan data user dari context (diset middleware auth)
  const user = c.get("user");
  if (!user?.sub) {
    return; // Tidak ada user yang diaudit
  }
  
  // Dapatkan fitur yang diakses dari query parameter / request body
  const feature = c.req.query("feature");
  const path = c.req.path;
  const method = c.req.method;
  
  // Ambil IP address dan user-agent untuk audit
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
             c.req.header("x-real-ip") || "Tidak diketahui";
  const userAgent = c.req.header("user-agent") || "Tidak diketahui";
  
  // Dapatkan nama email user untuk audit (opsional)
  const { data: userProfile } = await supabase
    .from("users")
    .select("email, company_id")
    .eq("id", user.sub)
    .maybeSingle();
  
  // Hanya lacak akses ke fitur premium (bukan fitur dasar)
  const premiumFeatures = [
    "income_statement", "balance_sheet", "cash_flow",
    "export_pdf", "export_csv", "unlimited_journals", 
    "multi_company", "multi_user", "api_access"
  ];
  
  const accessedFeature = feature && premiumFeatures.includes(feature);
  
  if (accessedFeature) {
    // Buat log akses fitur premium
    const logData: FeatureAccessLog = {
      user_id: user.sub,
      feature: feature as string,
      plan_at_access: user.role || "guest",
      granted: c.get("featureGranted") || false, // Diset oleh route setelah pengecekan akses
      ip_address: ip,
      user_agent: userAgent,
      request_path: path,
      method: method,
      user_email: userProfile?.email,
      company_id: user.company_id || userProfile?.company_id,
      timestamp: new Date().toISOString(),
    };
    
    // Simpan log ke database
    try {
      await supabase.from("feature_access_logs").insert(logData);
      console.log("[AccessLogger] Feature access logged:", {
        userId: user.sub,
        feature,
        granted: logData.granted,
        plan: logData.plan_at_access,
        ip: logData.ip_address,
      });
    } catch (logError) {
      console.error("[AccessLogger] Gagal menyimpan log:", logError);
      // Jangan ganggu flow utama meskipun logging gagal
    }
  }
};

// Helper function untuk log akses manual di route
export async function logFeatureAccess(
  userId: string,
  feature: string,
  granted: boolean,
  planAtAccess: string,
  c: Context,
  ip?: string,
  userAgent?: string
) {
  const resolvedIp = ip || c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
                     c.req.header("x-real-ip") || "Tidak diketahui";
  const resolvedUA = userAgent || c.req.header("user-agent") || "Tidak diketahui";
  
  const logData: FeatureAccessLog = {
    user_id: userId,
    feature,
    plan_at_access: planAtAccess,
    granted,
    ip_address: resolvedIp,
    user_agent: resolvedUA,
    request_path: c.req.path,
    method: c.req.method,
    user_email: undefined, // Bisa diresolusi jika diperlukan
    company_id: c.get("user")?.company_id,
    timestamp: new Date().toISOString(),
  };
  
  try {
    await supabase.from("feature_access_logs").insert(logData);
    console.log("[AccessLogger] Manual feature access logged:", {
      userId,
      feature,
      granted,
    });
  } catch (logError) {
    console.error("[AccessLogger] Gagal menyimpan log manual:", logError);
  }
}

// Middleware khusus untuk route pembayaran (mencatat semua akses fitur pembayaran)
export const paymentAccessLogger = async (c: Context, next: Next) => {
  await next();
  
  const user = c.get("user");
  if (!user?.sub) return;
  
  // Fitur yang terkait dengan pembayaran/premium
  const paymentFeatures = [
    "income_statement", "balance_sheet", "cash_flow", "export_pdf",
    "export_csv", "unlimited_journals", "multi_company", "multi_user", "api_access"
  ];
  
  // Cek apakah request melibatkan fitur premium
  const body = await c.req.json().catch(() => null);
  const accessedFeature = body?.feature && paymentFeatures.includes(body.feature);
  
  if (accessedFeature) {
    const logData: FeatureAccessLog = {
      user_id: user.sub,
      feature: body.feature,
      plan_at_access: user.role || "guest",
      granted: c.get("featureGranted") || false,
      ip_address: c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
                  c.req.header("x-real-ip") || "Tidak diketahui",
      user_agent: c.req.header("user-agent") || "Tidak diketahui",
      request_path: c.req.path,
      method: c.req.method,
      user_email: undefined,
      company_id: user.company_id,
      timestamp: new Date().toISOString(),
    };
    
    // Simpan log pembayaran secara terpisah untuk analisis
    try {
      await supabase.from("payment_feature_access_logs").insert(logData);
      console.log("[PaymentAccessLogger] Payment feature access logged:", {
        userId: user.sub,
        feature: body.feature,
        granted: logData.granted,
        payment_context: true,
      });
    } catch (logError) {
      console.error("[PaymentAccessLogger] Gagal menyimpan log pembayaran:", logError);
    }
  }
};

// Middleware audit komprehensif untuk admin routes
export const adminAuditLogger = async (c: Context, next: Next) => {
  await next();
  
  const user = c.get("user");
  if (!user?.sub) return;
  
  const logData: FeatureAccessLog = {
    user_id: user.sub,
    feature: "admin_access",
    plan_at_access: user.role || "guest",
    granted: true, // Admin selalu punya akses
    ip_address: c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
                c.req.header("x-real-ip") || "Tidak diketahui",
    user_agent: c.req.header("user-agent") || "Tidak diketahui",
    request_path: c.req.path,
    method: c.req.method,
    user_email: undefined,
    company_id: user.company_id,
    timestamp: new Date().toISOString(),
  };
  
  try {
    await supabase.from("admin_access_logs").insert(logData);
    console.log("[AdminAuditLogger] Admin access logged:", {
      userId: user.sub,
      path: c.req.path,
      method: c.req.method,
    });
  } catch (logError) {
    console.error("[AdminAuditLogger] Gagal menyimpan log admin:", logError);
  }
};