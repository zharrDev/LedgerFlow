import { ChatOpenAI } from "@langchain/openai";

/** Timeout per panggilan LLM ke OpenRouter (ms). Free tier: gagal cepat, user bisa coba lagi manual. */
export const LLM_CALL_TIMEOUT_MS = 20_000;

/** Tanpa retry LangChain — retry cuma menggandakan waktu tunggu tanpa manfaat besar di tier gratis. */
export const LLM_MAX_RETRIES = 0;

/**
 * Budget waktu total graph.invoke (ms).
 * ReAct agent ≈ 2–3 panggilan LLM berurutan + eksekusi tool Supabase.
 * 3 × 20s LLM + buffer tool ≈ 95s (lebih besar dari AbortSignal lama 60s).
 */
export const AI_GRAPH_TIMEOUT_MS = 95_000;

/**
 * Default model :free spesifik (bukan openrouter/free auto-router).
 *
 * nvidia/nemotron-3-super-120b-a12b:free — MoE 120B (12B aktif → respons cepat),
 * support tool-calling, dirancang untuk agent (ReAct AI CFO).
 *
 * TRADE-OFF vs "openrouter/free":
 * - Spesifik: kecepatan & perilaku lebih predictable; cocok ReAct + tools.
 * - Spesifik: kalau OpenRouter deprecate model ini, fitur mati sampai OPENROUTER_MODEL diganti manual.
 * - openrouter/free: auto-failover ke model gratis lain, tapi variatif (bisa dapat model lambat/tanpa tools).
 *
 * Cek model :free aktif: https://openrouter.ai/models?order=pricing-low-to-high
 */
export const DEFAULT_OPENROUTER_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

// Provider LLM terpusat: OpenRouter (endpoint kompatibel OpenAI).
// Model dibaca dari env OPENROUTER_MODEL — jangan hardcode di runtime production.
export function createChatModel(): ChatOpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      "OPENROUTER_API_KEY belum diset. Ambil gratis di https://openrouter.ai/keys lalu isi di .env / Render env.",
    );
  }

  const modelName = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;

  return new ChatOpenAI({
    apiKey,
    modelName,
    temperature: 0.2,
    timeout: LLM_CALL_TIMEOUT_MS,
    maxRetries: LLM_MAX_RETRIES,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://ledgerflow.app",
        "X-Title": "LedgerFlow AI CFO",
      },
    },
  });
}
