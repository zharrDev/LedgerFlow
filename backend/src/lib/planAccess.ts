import { supabase } from "./supabase.js";

/**
 * Mengecek apakah user bisa menambah company baru berdasarkan plan subscription-nya.
 * @returns { allowed: boolean; limit: number | null; currentCount: number; reason?: string }
 */
export async function canAddCompany(userId: string): Promise<{
  allowed: boolean;
  limit: number | null;
  currentCount: number;
  reason?: string;
}> {
  // Get user's active subscription with plan details
  const { data: subscription, error: subErr } = await supabase
    .from("subscriptions")
    .select("plan_id, status, plans!inner (max_companies)")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  if (subErr) {
    console.error("canAddCompany: subscription lookup error", subErr);
    return { allowed: false, limit: null, currentCount: 0, reason: "Gagal memeriksa subscription" };
  }

  if (!subscription) {
    return { allowed: false, limit: 1, currentCount: 0, reason: "Tidak ada subscription aktif" };
  }

  // Get max_companies from the joined plans table
  const plan = subscription.plans as { max_companies: number | null } | { max_companies: number | null }[] | null;
  const maxCompanies = Array.isArray(plan) ? (plan[0]?.max_companies ?? 1) : (plan?.max_companies ?? 1);
  const limit = maxCompanies;

  // -1, 0, null = unlimited
  if (limit <= 0) {
    return { allowed: true, limit: null, currentCount: 0 };
  }

  // Count active company memberships for this user
  const { count, error: countErr } = await supabase
    .from("company_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");

  if (countErr) {
    console.error("canAddCompany: count error", countErr);
    return { allowed: false, limit, currentCount: 0, reason: "Gagal menghitung company" };
  }

  const currentCount = count ?? 0;
  const allowed = currentCount < limit;

  return {
    allowed,
    limit,
    currentCount,
    reason: allowed ? undefined : `Batas maksimum ${limit} perusahaan tercapai (saat ini: ${currentCount})`,
  };
}

/**
 * Mengecek apakah user bisa bergabung ke company tertentu (invite).
 * Perlu: user punya akses invite (owner), company target punya slot, user belum member.
 */
export async function canJoinCompany(
  userId: string,
  companyId: string,
  inviterRole: "owner" | "akuntan",
): Promise<{ allowed: boolean; reason?: string }> {
  // Hanya owner yang bisa invite
  if (inviterRole !== "owner") {
    return { allowed: false, reason: "Hanya owner yang bisa mengundang anggota" };
  }

  // Cek apakah user sudah member
  const { data: existing, error: memberErr } = await supabase
    .from("company_members")
    .select("id, status")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (memberErr) {
    return { allowed: false, reason: "Gagal memeriksa keanggotaan" };
  }

  if (existing) {
    if (existing.status === "active") {
      return { allowed: false, reason: "User sudah menjadi anggota perusahaan ini" };
    }
    // Jika suspended/inactive, bisa di-reactivate - tapi tetap hitung limit
  }

  // Cek limit company (max_companies)
  const { allowed, reason } = await canAddCompany(userId);
  if (!allowed) {
    return { allowed: false, reason: reason || "Batas maksimum perusahaan tercapai" };
  }

  return { allowed: true };
}

/**
 * Mengecek apakah user bisa membuat company baru (register via WA/Google).
 * Hanya izin jika user belum punya company atau limit blm tercapai.
 * Untuk user baru yang belum punya user_id, gunakan phone sebagai identifier.
 */
export async function canCreateCompany(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  // Cek apakah userId adalah identifier sementara untuk user baru (format: "new-user-{phone}")
  const isNewUser = userId.startsWith("new-user-");
  const phone = userId.startsWith("new-user-") ? userId.replace("new-user-", "") : null;

  if (isNewUser && phone) {
    // Cek apakah sudah ada user dengan phone ini yang punya company
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existingUser) {
      // User dengan phone ini sudah ada, cek limit company-nya
      return canAddCompany(existingUser.id);
    }

    // User baru benar - Free plan = 1 company, dan dia belum punya apa-apa
    return { allowed: true, reason: undefined };
  }

  // User sudah ada - cek apakah sudah punya company
  const { count, error: countErr } = await supabase
    .from("company_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");

  if (countErr) {
    console.error("canCreateCompany: count error", countErr);
    return { allowed: false, reason: "Gagal memeriksa company" };
  }

  if ((count ?? 0) > 0) {
    // User sudah punya company, cek limit
    return canAddCompany(userId);
  }

  return { allowed: true };
}

/**
 * Validasi company switch - user hanya bisa pindah ke company yang dia member aktif.
 */
export async function validateCompanySwitch(
  userId: string,
  targetCompanyId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const { data: membership, error } = await supabase
    .from("company_members")
    .select("status")
    .eq("user_id", userId)
    .eq("company_id", targetCompanyId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    return { allowed: false, reason: "Gagal memvalidasi company" };
  }

  if (!membership) {
    return { allowed: false, reason: "Anda bukan anggota aktif perusahaan tersebut" };
  }

  return { allowed: true };
}