import { api } from "../lib/api";

export interface AiChatResponse {
  reply: string;
}

export interface AiChatError {
  error: string;
}

// Sisa kuota AI (dari GET /api/ai/quota). limit null = tanpa batas.
export interface AiQuota {
  limit: number | null;
  used: number | null;
  left: number | null;
  plan: string;
  is_trial?: boolean;
}

/** Ambil sisa kuota AI bulan ini (untuk banner di halaman AI CFO). */
export async function fetchAiQuota(): Promise<AiQuota> {
  const { data } = await api.get<AiQuota>("/api/ai/quota", { skipErrorToast: true });
  return data;
}

/** Timeout axios khusus AI — sedikit di atas AI_GRAPH_TIMEOUT_MS backend (95s). */
export const AI_CHAT_TIMEOUT_MS = 110_000;

/** Kirim pesan ke AI CFO. Error dari backend (429/504/503) diteruskan ke UI. */
export async function sendAiChat(message: string): Promise<string> {
  const { data } = await api.post<AiChatResponse>(
    "/api/ai/chat",
    { message },
    { timeout: AI_CHAT_TIMEOUT_MS },
  );
  if (!data?.reply?.trim()) {
    throw new Error("AI tidak menghasilkan jawaban. Coba lagi.");
  }
  return data.reply;
}

/**
 * Ambil alasan penolakan dari backend (mis. "ai_limit_reached",
 * "upgrade_required") supaya UI bisa membedakan paywall vs error teknis.
 */
export function getAiErrorReason(err: unknown): string | null {
  if (err && typeof err === "object" && "response" in err) {
    const ax = err as { response?: { data?: { reason?: string } } };
    return ax.response?.data?.reason ?? null;
  }
  return null;
}

/** Ekstrak pesan error yang jelas dari response axios. */
export function getAiErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const ax = err as { response?: { data?: AiChatError; status?: number } };
    const msg = ax.response?.data?.error;
    if (msg) return msg;
    if (ax.response?.status === 429) {
      return "Layanan AI sedang sibuk / limit gratis tercapai. Coba lagi beberapa saat lagi.";
    }
    if (ax.response?.status === 504) {
      return "AI tidak merespons tepat waktu. Silakan coba lagi.";
    }
    if (ax.response?.status === 503) {
      return "Layanan AI belum dikonfigurasi atau model tidak tersedia.";
    }
  }
  if (err instanceof Error && err.message) {
    if (err.message.includes("timeout") || err.message.includes("Timeout")) {
      return "AI tidak merespons tepat waktu (model gratis kadang antri). Silakan coba lagi.";
    }
    return err.message;
  }
  return "Gagal menghubungi AI CFO. Periksa koneksi dan coba lagi.";
}
