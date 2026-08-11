import type { AiChatMessage } from "../components/ai/AiCfoChatBubble";

export interface AiCfoSession {
  id: string;
  /** Judul singkat dari pertanyaan pertama user */
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AiChatMessage[];
}

interface AiCfoSessionStore {
  /** YYYY-MM-DD — hanya sesi hari ini yang ditampilkan */
  date: string;
  sessions: AiCfoSession[];
  activeSessionId: string | null;
}

const STORAGE_PREFIX = "ai_cfo_sessions";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function storageKey(userId: string, companyId: string): string {
  return `${STORAGE_PREFIX}_${userId}_${companyId}`;
}

function readStore(userId: string, companyId: string): AiCfoSessionStore {
  try {
    const raw = localStorage.getItem(storageKey(userId, companyId));
    if (!raw) return { date: todayKey(), sessions: [], activeSessionId: null };
    const parsed = JSON.parse(raw) as AiCfoSessionStore;
    // Hari berganti → reset daftar (riwayat kemarin tidak ditampilkan)
    if (parsed.date !== todayKey()) {
      return { date: todayKey(), sessions: [], activeSessionId: null };
    }
    return parsed;
  } catch {
    return { date: todayKey(), sessions: [], activeSessionId: null };
  }
}

function writeStore(userId: string, companyId: string, store: AiCfoSessionStore): void {
  localStorage.setItem(storageKey(userId, companyId), JSON.stringify(store));
}

export function loadAiCfoSessions(
  userId: string,
  companyId: string,
): AiCfoSessionStore {
  return readStore(userId, companyId);
}

export function saveAiCfoSessions(
  userId: string,
  companyId: string,
  store: AiCfoSessionStore,
): void {
  writeStore(userId, companyId, { ...store, date: todayKey() });
}

export function createSession(title: string): AiCfoSession {
  const now = new Date().toISOString();
  return {
    id: `s-${Date.now()}`,
    title: title.slice(0, 80),
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function upsertSession(
  store: AiCfoSessionStore,
  session: AiCfoSession,
): AiCfoSessionStore {
  const idx = store.sessions.findIndex((s) => s.id === session.id);
  const sessions =
    idx >= 0
      ? store.sessions.map((s) => (s.id === session.id ? session : s))
      : [session, ...store.sessions];
  return {
    ...store,
    date: todayKey(),
    sessions,
    activeSessionId: session.id,
  };
}

export function formatSessionTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
