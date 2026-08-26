import { AlertCircle } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { tx } from "../../i18n/tx";
import { AiCfoFormattedContent } from "./AiCfoFormattedContent";

export type AiChatRole = "user" | "assistant" | "error";

export interface AiChatMessage {
  id: string;
  role: AiChatRole;
  content: string;
}

interface AiCfoChatBubbleProps {
  message: AiChatMessage;
}

export function AiCfoChatBubble({ message }: AiCfoChatBubbleProps) {
  const { language } = useLanguage();
  return (
    <div
      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 py-2.5 ${
          message.role === "user"
            ? "bg-primary-500 text-white rounded-br-md text-sm leading-relaxed whitespace-pre-wrap"
            : message.role === "error"
              ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-bl-md text-sm leading-relaxed whitespace-pre-wrap"
              : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-md"
        }`}
      >
        {message.role === "error" && (
          <span className="flex items-start gap-1.5 font-medium mb-1">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {tx(language, "AI not available", "AI tidak tersedia")}
          </span>
        )}
        {message.role === "assistant" ? (
          <AiCfoFormattedContent content={message.content} />
        ) : (
          message.content
        )}
      </div>
    </div>
  );
}
