import { Loader2, Send } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { tx } from "../../i18n/tx";

interface AiCfoChatComposerProps {
  input: string;
  loading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function AiCfoChatComposer({
  input,
  loading,
  onInputChange,
  onSubmit,
  inputRef,
}: AiCfoChatComposerProps) {
  const { language } = useLanguage();
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50"
    >
      <div className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={tx(language, "Ask about cash flow, expenses, risks...", "Tanya tentang arus kas, beban, risiko...")}
          rows={2}
          disabled={loading}
          className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          aria-label={tx(language, "Send message", "Kirim pesan")}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mt-2 text-center">
        {tx(language, "Responses may take longer when free models are queuing", "Respons bisa memakan waktu lebih lama saat model gratis sedang antri")}
      </p>
    </form>
  );
}
