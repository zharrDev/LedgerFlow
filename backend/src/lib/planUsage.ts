import { supabase } from "./supabase.js";

// ============================================================================
// PLAN USAGE — konteks plan user + penghitungan pemakaian fitur berlimit
// ============================================================================
// Sumber kebenaran plan: subscriptions JOIN plans (satu baris per user).
// Limit yang ditegakkan:
//   - max_companies : jumlah perusahaan aktif (planAccess.ts)
//   - max_journals  : kuota jurnal/bulan (journal.ts getJournalQuota)
//   - max_ai_chats  : pesan AI/bulan (ai.ts) — NULL/-1 = unlimited
// Nilai NULL atau <= 0 selalu berarti TANPA batas (konvensi sama seperti
// max_companies di planAccess.ts), kecuali dinyatakan lain.
// ============================================================================

export type PlanContext = {
  planName: string;
  isActive: boolean;
  isTrial: boolean;
  maxCompanies: number | null;
  maxJournals: number | null;
  maxAiChats: number | null;
  features: string[];
};

type SubscriptionRow = {
  status: string;
  trial_end: string | null;
  current_period_end: string | null;
  plans:
    | {
        name: string | null;
        max_companies: number | null;
        max_journals: number | null;
        max_ai_chats: number | null;
        features: string[] | null;
      }
    | {
        name: string | null;
        max_companies: number | null;
        max_journals: number | null;
        max_ai_chats: number | null;
        features: string[] | null;
      }[]
    | null;
};

/** Normalisasi relasi plans yang bisa berupa objek atau array. */
function pickPlan(row: SubscriptionRow | null) {
  const plans = row?.plans;
  return Array.isArray(plans) ? plans[0] : plans;
}

/**
 * Ambil konteks plan user (nama plan, status aktif, semua limit, daftar fitur).
 * Mengembalikan null bila user tidak punya baris subscription.
 */
export async function getPlanContext(userId: string): Promise<PlanContext | null> {
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .select(
      "status, trial_end, current_period_end, plans(name, max_companies, max_journals, max_ai_chats, features)",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("getPlanContext: subscription lookup error", error);
    return null;
  }
  if (!sub) return null;

  const now = new Date();
  const isTrial =
    sub.status === "trialing" && !!sub.trial_end && new Date(sub.trial_end) > now;
  const isActive =
    isTrial ||
    (sub.status === "active" &&
      !!sub.current_period_end &&
      new Date(sub.current_period_end) > now);

  const plan = pickPlan(sub as SubscriptionRow);

  return {
    planName: plan?.name ?? "free",
    isActive,
    isTrial,
    maxCompanies: plan?.max_companies ?? null,
    maxJournals: plan?.max_journals ?? null,
    maxAiChats: plan?.max_ai_chats ?? null,
    features: plan?.features ?? [],
  };
}

// ── Pemakaian AI bulan berjalan ─────────────────────────────────────────────
// Satu chat sukses = satu baris di ai_usage_logs (dicatat backend setelah
// jawaban AI berhasil dihasilkan — chat yang gagal tidak mengurangi kuota).
// Reset otomatis setiap awal bulan kalender. Gagal dibaca = 0 (fail-open)
// agar fitur AI tidak mati hanya karena masalah pembacaan counter.
export async function getAiUsageThisMonth(userId: string): Promise<{
  used: number;
  periodStart: string;
  periodEnd: string;
}> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

  try {
    const { count, error } = await supabase
      .from("ai_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());

    if (error) {
      console.error("getAiUsageThisMonth: count error", error);
      return { used: 0, periodStart: start.toISOString(), periodEnd: end.toISOString() };
    }
    return { used: count ?? 0, periodStart: start.toISOString(), periodEnd: end.toISOString() };
  } catch (err) {
    console.error("getAiUsageThisMonth: gagal hitung pemakaian AI", err);
    return { used: 0, periodStart: start.toISOString(), periodEnd: end.toISOString() };
  }
}

/**
 * Catat satu pemakaian AI (fire-and-forget — dipanggil setelah chat sukses;
 * kegagalan pencatatan hanya di-log, tidak menggagalkan respons).
 */
export function recordAiUsage(userId: string, companyId: string | null): void {
  supabase
    .from("ai_usage_logs")
    .insert({ user_id: userId, company_id: companyId })
    .then(({ error }) => {
      if (error) console.error("recordAiUsage: gagal mencatat pemakaian AI", error);
    }, (err) => console.error("recordAiUsage: unexpected", err));
}
