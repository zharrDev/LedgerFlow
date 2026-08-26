import { MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../../hooks/useLanguage";
import { tx } from "../../i18n/tx";
import type { AiCfoSession } from "../../utils/aiCfoStorage";
import { formatSessionTime } from "../../utils/aiCfoStorage";

interface AiCfoHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  sessions: AiCfoSession[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  /** true = overlay drawer (mobile), false = inline sidebar (desktop) */
  overlay?: boolean;
}

function SessionListBody({
  sessions,
  activeSessionId,
  onSelect,
  onItemSelect,
  language,
}: {
  sessions: AiCfoSession[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onItemSelect?: () => void;
  language: "en" | "id";
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-3 h-14 flex items-center shrink-0 border-b border-gray-200 dark:border-gray-700">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {tx(language, "Today's History", "Riwayat hari ini")} ({sessions.length})
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-2 scrollbar-thin">
        {sessions.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 px-2 py-6 text-center leading-relaxed">
            {tx(language, "No conversations today", "Belum ada percakapan hari ini")}
          </p>
        ) : (
          <ul className="space-y-1">
            {sessions.map((session) => {
              const active = session.id === activeSessionId;
              const msgCount = session.messages.filter((m) => m.role === "user").length;
              return (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(session.id);
                      onItemSelect?.();
                    }}
                    className={`w-full text-left px-2.5 py-2.5 rounded-xl transition-all ${
                      active
                        ? "bg-primary-500/15 border border-primary-500/30 text-primary-700 dark:text-primary-300"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <MessageCircle
                        size={14}
                        className={`shrink-0 mt-0.5 ${active ? "text-primary-500" : "text-gray-400"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{session.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {formatSessionTime(session.updatedAt)}
                          {msgCount > 1 ? ` · ${msgCount} ${tx(language, "questions", "pertanyaan")}` : ""}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export function AiCfoHistoryPanel({
  open,
  onClose,
  sessions,
  activeSessionId,
  onSelect,
  overlay = false,
}: AiCfoHistoryPanelProps) {
  const { language } = useLanguage();
  if (overlay) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[1px]"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="absolute top-0 left-0 bottom-0 z-30 w-[min(100%,17rem)] flex flex-col min-h-0 bg-white dark:bg-darkCard border-r border-gray-200 dark:border-gray-700 shadow-xl"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {tx(language, "Chat History", "Riwayat chat")}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label={tx(language, "Close history", "Tutup riwayat")}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex flex-col flex-1 min-h-0">
                <SessionListBody
                  sessions={sessions}
                  activeSessionId={activeSessionId}
                  onSelect={onSelect}
                  onItemSelect={onClose}
                  language={language}
                />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? 256 : 0, opacity: open ? 1 : 0 }}
      transition={{ duration: 0.22, ease: "easeInOut" }}
      className="hidden md:flex flex-col shrink-0 overflow-hidden border-r border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40"
    >
      <div className="flex w-64 flex-col flex-1 min-h-0 h-full">
        <SessionListBody
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={onSelect}
          language={language}
        />
      </div>
    </motion.aside>
  );
}
