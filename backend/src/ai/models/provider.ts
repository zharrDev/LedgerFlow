import { ChatOpenAI } from "@langchain/openai";

// Provider LLM terpusat: OpenRouter (endpoint kompatibel OpenAI).
// Model TIDAK di-hardcode — dibaca dari env OPENROUTER_MODEL supaya mudah
// diganti bila model :free yang dipakai di-deprecate OpenRouter (sering terjadi).
export function createChatModel(): ChatOpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      "OPENROUTER_API_KEY belum diset. Ambil gratis di https://openrouter.ai/keys lalu isi di .env / Render env.",
    );
  }

  const modelName = process.env.OPENROUTER_MODEL || "openrouter/free";

  return new ChatOpenAI({
    apiKey,
    modelName,
    // Analisis keuangan: jawaban lebih konservatif & faktual
    temperature: 0.2,
    // Model gratis kadang lambat/antri — batasi tunggu agar request tidak menggantung
    timeout: 30_000,
    // Free tier flaky; satu kali ulang saja, jangan retry berkali-kali
    maxRetries: 1,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      // Header opsional yang disarankan OpenRouter (untuk credit tracking)
      defaultHeaders: {
        "HTTP-Referer": "https://ledgerflow.app",
        "X-Title": "LedgerFlow AI CFO",
      },
    },
  });
}
