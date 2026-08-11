import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Loader2, Send, X, AlertCircle } from "lucide-react";
import { getAiErrorMessage, sendAiChat } from "../services/aiService";
import type { DashboardSummary } from "../hooks/useDashboardData";

type ChatRole = "user" | "assistant" | "error";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

interface AICfoPanelProps {
  open: boolean;
  onClose: () => void;
  summary: DashboardSummary | null;
  periodLabel?: string;
}

function buildInitialPrompt(
  summary: DashboardSummary | null,
  periodLabel?: string,
): string {
  const periode = periodLabel || "periode terpilih / YTD";
  if (!summary) {
    return `Berikan ringkasan kondisi keuangan perusahaan saya untuk ${periode}. Jelaskan pendapatan, beban, laba bersih, arus kas, dan risiko utama — gunakan data dari sistem.`;
  }
  return [
    `Berikan ringkasan CFO untuk ${periode} berdasarkan data LedgerFlow:`,
    `- Pendapatan: Rp ${summary.totalRevenue.toLocaleString("id-ID")}`,
    `- Beban: Rp ${summary.totalExpense.toLocaleString("id-ID")}`,
    `- Laba bersih: Rp ${summary.netIncome.toLocaleString("id-ID")}`,
    `- Arus kas bersih: Rp ${summary.netCashFlow.toLocaleString("id-ID")}`,
    `- Kas akhir: Rp ${summary.endingCash.toLocaleString("id-ID")}`,
    `- Total aset: Rp ${summary.totalAssets.toLocaleString("id-ID")}`,
    `- Ekuitas: Rp ${summary.totalEquity.toLocaleString("id-ID")}`,
    "",
    "Verifikasi dengan tool, jelaskan kondisi keuangan, tren, dan 2-3 rekomendasi praktis.",
  ].join("\n");
}

export function AICfoPanel({
  open,
  onClose,
  summary,
  periodLabel,
}: AICfoPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoSent, setAutoSent] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string, displayText?: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: displayText?.trim() || trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const reply = await sendAiChat(trimmed);
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: "assistant", content: reply },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "error",
            content: getAiErrorMessage(err),
          },
        ]);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [loading],
  );

  // Auto-kirim prompt ringkasan saat panel pertama kali dibuka
  useEffect(() => {
    if (!open || autoSent) return;
    setAutoSent(true);
    const prompt = buildInitialPrompt(summary, periodLabel);
    void sendMessage(
      prompt,
      "Berikan ringkasan kondisi keuangan perusahaan saya saat ini.",
    );
  }, [open, autoSent, summary, periodLabel, sendMessage]);

  // Reset saat panel ditutup agar auto-prompt jalan lagi di sesi berikutnya
  useEffect(() => {
    if (!open) {
      setAutoSent(false);
      setMessages([]);
      setInput("");
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed top-0 right-0 z-50 flex flex-col h-full w-full sm:w-[420px] bg-white dark:bg-[#0f172a] border-l border-gray-200 dark:border-gray-700 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-500/10 to-emerald-500/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary-500/15">
                  <Bot size={20} className="text-primary-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    AI CFO Assistant
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Analisis keuangan berbasis data LedgerFlow
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                aria-label="Tutup panel AI"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && loading && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 size={16} className="animate-spin" />
                  Menyiapkan ringkasan keuangan...
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary-500 text-white rounded-br-md"
                        : msg.role === "error"
                          ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-bl-md"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-md"
                    }`}
                  >
                    {msg.role === "error" && (
                      <span className="flex items-start gap-1.5 font-medium mb-1">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        AI tidak tersedia
                      </span>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && messages.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 size={16} className="animate-spin" />
                  AI sedang menganalisis...
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50"
            >
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage(input);
                    }
                  }}
                  placeholder="Tanya tentang arus kas, beban, risiko..."
                  rows={2}
                  disabled={loading}
                  className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="p-2.5 rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                  aria-label="Kirim pesan"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                Model gratis OpenRouter — bisa lambat atau limit saat sibuk
              </p>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
