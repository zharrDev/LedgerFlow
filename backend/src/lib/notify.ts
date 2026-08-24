// Helper notifikasi backend-driven. Semua pembuatan notifikasi dari route
// lain lewat sini supaya konsisten: fire-and-forget (tidak pernah membuat
// request utama gagal), type aman, dan selalu log bila insert gagal.
import { supabase } from "./supabase.js";

export type NotificationType =
  | "journal_posted"
  | "journal_created"
  | "journal_deleted"
  | "period_opened"
  | "period_closed"
  | "account_toggled"
  | "profile_updated"
  | "member_invited"
  | "payment_success"
  | "payment_failed";

export interface CreateNotificationInput {
  /** Penerima notifikasi (wajib). */
  userId: string;
  /** Perusahaan terkait (opsional, untuk filter/konteks). */
  companyId?: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Path frontend untuk deep-link saat notifikasi diklik (opsional). */
  link?: string;
}

/**
 * Buat notifikasi untuk satu user. Fire-and-forget: error di-log saja dan
 * TIDAK di-throw — notifikasi tidak boleh menggagalkan operasi utama
 * (mis. webhook pembayaran tetap harus sukses walau notifikasi gagal).
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: input.userId,
      company_id: input.companyId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
    });
    if (error) {
      console.error("[notify] gagal insert notifikasi:", error.message);
    }
  } catch (err) {
    console.error("[notify] error tak terduga:", err);
  }
}

/**
 * Kirim notifikasi yang sama ke beberapa user sekaligus (mis. semua owner
 * perusahaan). Tetap fire-and-forget per penerima.
 */
export async function createNotificationsForUsers(
  userIds: string[],
  input: Omit<CreateNotificationInput, "userId">,
): Promise<void> {
  const unique = [...new Set(userIds)].filter(Boolean);
  await Promise.all(
    unique.map((userId) => createNotification({ ...input, userId })),
  );
}
