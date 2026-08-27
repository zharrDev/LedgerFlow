import { Hono } from "hono";
import { HumanMessage } from "@langchain/core/messages";
import { authMiddleware } from "../middleware/auth.js";
import { dbErrorResponse } from "../lib/errors.js";
import { createAIGraph } from "../ai/graph/graph.js";
import { AI_GRAPH_TIMEOUT_MS } from "../ai/models/provider.js";

const ai = new Hono();

ai.use("*", authMiddleware);

// POST /api/ai/chat
// Tanya AI CFO. companyId SELALU dari JWT — tidak pernah dari body.
// Error OpenRouter (429/timeout) diterjemahkan ke pesan yang jelas — TIDAK
// pernah gagal diam-diam (pelajaran dari bug email OTP sebelumnya).
ai.post("/chat", async (c) => {
  let message: unknown;
  try {
    ({ message } = await c.req.json());
  } catch {
    return c.json({ error: "Body harus JSON valid." }, 400);
  }

  if (typeof message !== "string" || !message.trim()) {
    return c.json({ error: "Field 'message' wajib diisi (teks)." }, 400);
  }
  if (message.trim().length > 4000) {
    return c.json({ error: "Pesan terlalu panjang (maks 4000 karakter)." }, 400);
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return c.json(
      {
        error:
          "AI belum dikonfigurasi: OPENROUTER_API_KEY belum diisi. Minta admin menambahkannya di environment (Render).",
      },
      503,
    );
  }

  try {
    const companyId = c.get("user").company_id;
    const graph = await createAIGraph(companyId);

    const result = await graph.invoke(
      { messages: [new HumanMessage(message.trim())] },
      { signal: AbortSignal.timeout(AI_GRAPH_TIMEOUT_MS) },
    );

    // Ambil jawaban AI terakhir (AIMessage paling akhir di riwayat)
    const aiMessages = [...result.messages].reverse().filter((m) => m._getType() === "ai");
    const last = aiMessages[0];
    if (!last) {
      return c.json({ error: "AI tidak menghasilkan jawaban. Coba lagi." }, 502);
    }

    const content = last.content;
    return c.json({ reply: typeof content === "string" ? content : JSON.stringify(content) });
  } catch (err: any) {
    const status = err?.status ?? err?.statusCode;
    const msg = String(err?.message || err?.error || err || "").toLowerCase();

    // Rate limit / kuota gratis habis (OpenRouter: HTTP 429)
    if (status === 429 || msg.includes("429") || msg.includes("rate limit") || msg.includes("too many requests") || msg.includes("quota")) {
      return c.json(
        {
          error:
            "Layanan AI sedang sibuk / limit gratis tercapai. Coba lagi beberapa saat lagi, atau upgrade model berbayar di env OPENROUTER_MODEL.",
        },
        429,
      );
    }

    // Timeout (model gratis kadang lambat/antri)
    if (
      err?.name === "AbortError" ||
      msg.includes("timeout") ||
      msg.includes("timed out") ||
      msg.includes("aborted") ||
      msg.includes("etimedout")
    ) {
      return c.json(
        {
          error:
            "AI tidak merespons tepat waktu (model gratis kadang antri). Silakan coba lagi — pertanyaan yang sama boleh diulang.",
        },
        504,
      );
    }

    // Model tidak tersedia / deprecated (mis. nama :free dihapus OpenRouter)
    if (msg.includes("model not found") || msg.includes("no model") || msg.includes("404")) {
      return c.json(
        {
          error:
            "Model AI yang dikonfigurasi tidak lagi tersedia di OpenRouter (model gratis sering dihapus). Minta admin mengganti OPENROUTER_MODEL.",
        },
        503,
      );
    }

    console.error("[AI CFO] Error:", err);
    return dbErrorResponse(c, err, "AI gagal memproses. Coba lagi beberapa saat.");
  }
});

export default ai;
