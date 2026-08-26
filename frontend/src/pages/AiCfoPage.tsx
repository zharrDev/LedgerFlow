import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bot, MessageSquarePlus, PanelLeft } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { useLanguage } from "../hooks/useLanguage";
import { tx } from "../i18n/tx";
import { AiCfoChatBubble } from "../components/ai/AiCfoChatBubble";
import type { AiChatMessage } from "../components/ai/AiCfoChatBubble";
import { AiCfoChatComposer } from "../components/ai/AiCfoChatComposer";
import { AiCfoLoadingIndicator } from "../components/ai/AiCfoLoadingIndicator";
import { AiCfoHistoryPanel } from "../components/ai/AiCfoHistoryPanel";
import { AiCfoWelcome } from "../components/ai/AiCfoWelcome";
import { useAuth } from "../context/AuthContext";
import { useDashboardData } from "../hooks/useDashboardData";
import { getAiErrorMessage, sendAiChat } from "../services/aiService";
import {
  createSession,
  loadAiCfoSessions,
  saveAiCfoSessions,
  type AiCfoSession,
} from "../utils/aiCfoStorage";

export default function AiCfoPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { summary } = useDashboardData();
  const userId = user?.id ?? "";
  const companyId = user?.company_id ?? "";

  const [sessions, setSessions] = useState<AiCfoSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 768px)").matches
      : false,
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shouldAutoScroll = useRef(true);

  useEffect(() => {
    if (!userId || !companyId) {
      setHydrated(true);
      return;
    }
    const store = loadAiCfoSessions(userId, companyId);
    setSessions(store.sessions);
    if (store.activeSessionId) {
      const active = store.sessions.find((s) => s.id === store.activeSessionId);
      if (active) {
        setActiveSessionId(active.id);
        setMessages(active.messages);
      }
    }
    setHydrated(true);
  }, [userId, companyId]);

  const persist = useCallback(
    (nextSessions: AiCfoSession[], nextActiveId: string | null) => {
      if (!userId || !companyId) return;
      saveAiCfoSessions(userId, companyId, {
        date: new Date().toISOString().slice(0, 10),
        sessions: nextSessions,
        activeSessionId: nextActiveId,
      });
    },
    [userId, companyId],
  );

  const saveSession = useCallback(
    (
      sessionId: string,
      nextMessages: AiChatMessage[],
      opts?: { title?: string; newSession?: AiCfoSession },
    ) => {
      setSessions((prev) => {
        let updated: AiCfoSession[];
        if (opts?.newSession) {
          const merged: AiCfoSession = {
            ...opts.newSession,
            messages: nextMessages,
            title: opts.title ?? opts.newSession.title,
            updatedAt: new Date().toISOString(),
          };
          updated = [merged, ...prev.filter((s) => s.id !== merged.id)];
        } else {
          updated = prev.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: nextMessages,
                  updatedAt: new Date().toISOString(),
                  ...(opts?.title && s.messages.length === 0
                    ? { title: opts.title }
                    : {}),
                }
              : s,
          );
        }
        persist(updated, sessionId);
        return updated;
      });
    },
    [persist],
  );

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    if (!shouldAutoScroll.current) return;
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    shouldAutoScroll.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const selectSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    setActiveSessionId(sessionId);
    setMessages(session.messages);
    setInput("");
    shouldAutoScroll.current = true;
    persist(sessions, sessionId);
    requestAnimationFrame(() => scrollToBottom(false));
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setInput("");
    shouldAutoScroll.current = true;
    persist(sessions, null);
    inputRef.current?.focus();
  };

  const sendMessage = useCallback(
    async (text: string, displayText?: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading || !userId || !companyId) return;

      let sessionId = activeSessionId;
      const userDisplay = displayText?.trim() || trimmed;
      let newSession: AiCfoSession | undefined;

      if (!sessionId) {
        newSession = createSession(userDisplay);
        sessionId = newSession.id;
        setActiveSessionId(sessionId);
      }

      const userMsg: AiChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: userDisplay,
      };
      const withUser = [...messages, userMsg];
      setMessages(withUser);
      saveSession(sessionId, withUser, {
        title: userDisplay,
        newSession,
      });
      setInput("");
      setLoading(true);
      shouldAutoScroll.current = true;

      try {
        const reply = await sendAiChat(trimmed);
        const withReply: AiChatMessage[] = [
          ...withUser,
          { id: `a-${Date.now()}`, role: "assistant", content: reply },
        ];
        setMessages(withReply);
        saveSession(sessionId, withReply);
      } catch (err) {
        const withError: AiChatMessage[] = [
          ...withUser,
          {
            id: `e-${Date.now()}`,
            role: "error",
            content: getAiErrorMessage(err),
          },
        ];
        setMessages(withError);
        saveSession(sessionId, withError);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [loading, userId, companyId, activeSessionId, messages, saveSession],
  );

  const showWelcome = hydrated && messages.length === 0 && !loading;

  if (!hydrated) {
    return (
      <AppShell fullHeight hideTitle>
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell fullHeight hideTitle>
      <div className="flex flex-col flex-1 min-h-0 max-w-5xl mx-auto w-full">
        {/* Toolbar atas */}
        <div className="flex items-center justify-between gap-3 mb-2 shrink-0">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-500 transition-colors"
          >
            <ArrowLeft size={16} />
            {tx(language, "Back", "Kembali")}
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                historyOpen
                  ? "text-primary-600 dark:text-primary-400 bg-primary-500/10"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <PanelLeft size={16} />
              <span className="hidden sm:inline">{tx(language, "History", "Riwayat")}</span>
            </button>
            <button
              type="button"
              onClick={startNewChat}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-500/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              <MessageSquarePlus size={16} />
              <span className="hidden sm:inline">{tx(language, "New", "Baru")}</span>
            </button>
          </div>
        </div>

        {/* Container chat — tinggi penuh, scroll hanya di area pesan */}
        <div className="relative flex flex-1 min-h-0 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkCard shadow-md overflow-hidden">
          {/* Desktop: panel riwayat collapsible */}
          <AiCfoHistoryPanel
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelect={selectSession}
          />

          {/* Mobile: drawer overlay */}
          <div className="md:hidden">
            <AiCfoHistoryPanel
              open={historyOpen}
              onClose={() => setHistoryOpen(false)}
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelect={selectSession}
              overlay
            />
          </div>

          {/* Area chat utama */}
          <div className="flex flex-col flex-1 min-h-0 min-w-0">
            <div className="h-14 flex items-center gap-2 px-3 sm:px-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-500/10 to-emerald-500/10 shrink-0">
              {!historyOpen && (
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-white/60 dark:hover:bg-gray-800 transition-colors shrink-0"
                  title={tx(language, "Open chat history", "Buka riwayat chat")}
                  aria-label={tx(language, "Open chat history", "Buka riwayat chat")}
                >
                  <PanelLeft size={18} />
                </button>
              )}
              <div className="p-2 rounded-xl bg-primary-500/15 shrink-0">
                <Bot size={20} className="text-primary-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-semibold text-gray-900 dark:text-white truncate text-sm sm:text-base">
                  AI CFO Assistant
                </h1>
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                  {activeSessionId
                    ? sessions.find((s) => s.id === activeSessionId)?.title
                    : tx(language, "New conversation", "Percakapan baru")}
                </p>
              </div>
            </div>

            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth px-3 sm:px-4 py-4 space-y-4 scrollbar-thin"
            >
              {showWelcome && (
                <AiCfoWelcome
                  userName={user?.name}
                  summary={summary}
                  disabled={loading}
                  todaySessionCount={sessions.length}
                  onQuickAction={(prompt, display) => void sendMessage(prompt, display)}
                />
              )}

              {messages.map((msg) => (
                <AiCfoChatBubble key={msg.id} message={msg} />
              ))}

              {loading && (
                <AiCfoLoadingIndicator
                  variant={messages.length === 0 ? "initial" : "analyzing"}
                />
              )}
            </div>

            <AiCfoChatComposer
              input={input}
              loading={loading}
              onInputChange={setInput}
              onSubmit={() => void sendMessage(input)}
              inputRef={inputRef}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
