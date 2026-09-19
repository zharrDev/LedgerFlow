import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import ThemeSwitcher from "./ThemeSwitcher";
import LanguageSwitcher from "./LanguageSwitcher";
import {
  HeaderSearchResults,
  type AccountHit,
  type JournalHit,
} from "./HeaderSearchResults";
import { accountsService } from "../services/accountsService";
import { journalService } from "../services/journalService";
import { api } from "../lib/api";
import logo from "../assets/ledgerflow.webp";
import { useLanguage } from "../hooks/useLanguage";
import { tx } from "../i18n/tx";
import {
  Menu,
  X,
  Search,
  Bell,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Command,
  CheckCircle2,
  Lock,
  Unlock,
  PlusCircle,
  FileEdit,
  Trash2,
  UserPlus,
  CreditCard,
  XCircle,
} from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
  mobileMenuOpen: boolean;
}

/* ───────── Notification Types ───────── */
export interface Notification {
  id: string;
  type:
    | "journal_posted"
    | "journal_created"
    | "journal_deleted"
    | "period_opened"
    | "period_closed"
    | "account_toggled"
    | "profile_updated"
    | "member_invited"
    | "payment_success"
    | "payment_failed";
  title: string;
  message: string;
  time: number; // epoch ms (dari created_at backend)
  read: boolean;
  link?: string;
}

const MAX_NOTIFS = 30;

// Baris mentah dari tabel notifications (backend) → bentuk yang dipakai UI.
function mapNotificationRow(row: Record<string, unknown>): Notification {
  return {
    id: String(row.id),
    type: row.type as Notification["type"],
    title: String(row.title ?? ""),
    message: String(row.message ?? ""),
    time: new Date(String(row.created_at)).getTime(),
    read: Boolean(row.read),
    link: typeof row.link === "string" ? row.link : undefined,
  };
}

// Ambil notifikasi terbaru dari backend. Dipakai Header untuk render.
export async function getNotifications(): Promise<Notification[]> {
  try {
    const res = await api.get("/api/notifications", {
      params: { limit: MAX_NOTIFS },
      skipErrorToast: true,
    });
    return ((res.data?.data ?? []) as Record<string, unknown>[]).map(
      mapNotificationRow,
    );
  } catch {
    return [];
  }
}

// Buat notifikasi untuk user yang sedang login (aksi lokal di UI).
// Fire-and-forget: kegagalan diabaikan diam-diam, badge akan tersinkron
// saat polling berikutnya.
export function pushNotification(
  notif: Omit<Notification, "id" | "time" | "read">,
) {
  api
    .post(
      "/api/notifications",
      {
        type: notif.type,
        title: notif.title,
        message: notif.message,
        link: notif.link,
      },
      { skipErrorToast: true },
    )
    .then(() => window.dispatchEvent(new CustomEvent("ledgerflow-notif")))
    .catch(() => {});
}

// Tandai semua notifikasi user sebagai dibaca.
export function markAllRead() {
  api
    .patch("/api/notifications/read-all", {}, { skipErrorToast: true })
    .then(() => window.dispatchEvent(new CustomEvent("ledgerflow-notif")))
    .catch(() => {});
}

/* ───────── Helpers ───────── */
function timeAgo(ts: number, language: "en" | "id"): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return language === "id" ? "Baru saja" : "Just now";
  if (mins < 60) return `${mins}${language === "id" ? "m lalu" : "m ago"}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}${language === "id" ? "j lalu" : "h ago"}`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}${language === "id" ? "h lalu" : "d ago"}`;
  return new Date(ts).toLocaleDateString(
    language === "id" ? "id-ID" : "en-US",
    {
      day: "numeric",
      month: "short",
    },
  );
}

const NOTIF_ICON: Record<string, { icon: typeof CheckCircle2; color: string }> =
  {
    journal_posted: { icon: CheckCircle2, color: "text-emerald-500" },
    journal_created: { icon: FileEdit, color: "text-primary-500" },
    journal_deleted: { icon: Trash2, color: "text-rose-500" },
    period_opened: { icon: Unlock, color: "text-emerald-500" },
    period_closed: { icon: Lock, color: "text-amber-500" },
    account_toggled: { icon: PlusCircle, color: "text-primary-500" },
    profile_updated: { icon: User, color: "text-primary-500" },
    member_invited: { icon: UserPlus, color: "text-primary-500" },
    payment_success: { icon: CreditCard, color: "text-emerald-500" },
    payment_failed: { icon: XCircle, color: "text-rose-500" },
  };

/* ─── Aksen elegan per tipe notifikasi ───────────────────────────
   Garis aksen kiri + lingkaran ikon tinted (jewel-tone kalem). */
const NOTIF_ACCENT: Record<string, { bar: string; tint: string }> = {
  journal_posted: { bar: "bg-emerald-500", tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  journal_created: { bar: "bg-primary-500", tint: "bg-primary-500/10 text-primary-600 dark:text-primary-400" },
  journal_deleted: { bar: "bg-rose-500", tint: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  period_opened: { bar: "bg-emerald-500", tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  period_closed: { bar: "bg-amber-500", tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  account_toggled: { bar: "bg-primary-500", tint: "bg-primary-500/10 text-primary-600 dark:text-primary-400" },
  profile_updated: { bar: "bg-primary-500", tint: "bg-primary-500/10 text-primary-600 dark:text-primary-400" },
  member_invited: { bar: "bg-primary-500", tint: "bg-primary-500/10 text-primary-600 dark:text-primary-400" },
  payment_success: { bar: "bg-emerald-500", tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  payment_failed: { bar: "bg-rose-500", tint: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
};

function notifAccent(type: string): { bar: string; tint: string } {
  return NOTIF_ACCENT[type] ?? NOTIF_ACCENT.journal_created;
}

// Kelompokkan notifikasi: Hari Ini / Kemarin / Lebih Lama.
function groupNotifications(
  notifs: Notification[],
  language: "en" | "id",
): Array<{ title: string; items: Notification[] }> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();
  const yesterday = today - 86400000;
  const buckets: Record<string, Notification[]> = { today: [], yesterday: [], older: [] };
  for (const n of notifs.slice(0, 10)) {
    if (n.time >= today) buckets.today.push(n);
    else if (n.time >= yesterday) buckets.yesterday.push(n);
    else buckets.older.push(n);
  }
  const titles: Record<string, string> =
    language === "id"
      ? { today: "Hari Ini", yesterday: "Kemarin", older: "Lebih Lama" }
      : { today: "Today", yesterday: "Yesterday", older: "Earlier" };
  return (Object.keys(buckets) as Array<keyof typeof buckets>)
    .filter((k) => buckets[k].length > 0)
    .map((k) => ({ title: titles[k], items: buckets[k] }));
}

/* ───────── Header Component ───────── */
export function Header({ onMenuClick, mobileMenuOpen }: HeaderProps) {
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [accountHits, setAccountHits] = useState<AccountHit[]>([]);
  const [journalHits, setJournalHits] = useState<JournalHit[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const notifCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Tandai sudah scroll (untuk shadow pemisah header di mobile).
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Muat notifikasi dari backend (async). Dengan polling 30 detik + refresh
  // saat event "ledgerflow-notif" (dipicu pushNotification/markAllRead) dan
  // saat tab kembali fokus — badge tetap segar tanpa manual reload.
  const loadNotifs = useCallback(() => {
    getNotifications().then(setNotifications);
  }, []);

  useEffect(() => {
    loadNotifs();
    window.addEventListener("ledgerflow-notif", loadNotifs);
    window.addEventListener("focus", loadNotifs);
    const interval = setInterval(loadNotifs, 30_000);
    return () => {
      window.removeEventListener("ledgerflow-notif", loadNotifs);
      window.removeEventListener("focus", loadNotifs);
      clearInterval(interval);
    };
  }, [loadNotifs]);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [searchOpen]);

  // Debounced search: navigasi lokal + akun/jurnal dari API yang sudah ada
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchQuery.trim();
    if (q.length < 2) {
      setAccountHits([]);
      setJournalHits([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const [accounts, journals] = await Promise.all([
          accountsService.getAll().catch(() => []),
          journalService.getAll().catch(() => []),
        ]);
        const ql = q.toLowerCase();
        setAccountHits(
          accounts
            .filter(
              (a) =>
                a.code?.toLowerCase().includes(ql) ||
                a.name?.toLowerCase().includes(ql),
            )
            .slice(0, 5)
            .map((a) => ({ id: a.id, code: a.code, name: a.name })),
        );
        setJournalHits(
          journals
            .filter(
              (j) =>
                j.number?.toLowerCase().includes(ql) ||
                j.description?.toLowerCase().includes(ql),
            )
            .slice(0, 5)
            .map((j) => ({
              id: j.id,
              number: j.number,
              description: j.description,
              date: j.date,
            })),
        );
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Tutup dropdown search desktop saat klik luar
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const goSearchResult = (path: string) => {
    setSearchOpen(false);
    setSearchFocused(false);
    setSearchQuery("");
    setAccountHits([]);
    setJournalHits([]);
    navigate(path);
  };

  // Ctrl+K search shortcut
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setSearchFocused(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchFocused(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleLogout = () => {
    setUserDropdownOpen(false);
    logout();
  };

  /* ── Hover notification handlers ── */
  const handleNotifMouseEnter = () => {
    if (notifCloseTimer.current) clearTimeout(notifCloseTimer.current);
    setNotifOpen(true);
  };

  const handleNotifMouseLeave = () => {
    notifCloseTimer.current = setTimeout(() => setNotifOpen(false), 200);
  };

  const handleNotifClick = (notif: Notification) => {
    // Optimistic update UI, lalu persist ke backend.
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
    );
    api
      .patch(`/api/notifications/${notif.id}/read`, {}, { skipErrorToast: true })
      .catch(() => {});
    if (notif.link) {
      setNotifOpen(false);
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllRead();
  };

  return (
    // Background + border-b permanen KHUSUS mobile (lg:... menonaktifkan
    // semuanya di desktop agar kembali transparan di dalam kartu AppShell
    // seperti semula). Di mobile Header telanjang, jadi tanpa ini konten
    // scroll tepat di belakangnya tanpa pemisah.
    <header
      className={`sticky top-0 z-50 bg-white dark:bg-[#0B1120] border-b border-gray-200 dark:border-white/10 lg:bg-transparent lg:dark:bg-transparent lg:border-transparent lg:dark:border-transparent transition-shadow duration-300 ${
        scrolled ? "shadow-[0_4px_16px_rgba(2,6,23,0.08)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.45)] lg:shadow-none lg:dark:shadow-none" : ""
      }`}
    >
      <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 h-16 w-full">
        {/* ── Left ── */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 sm:gap-2 group"
          >
            <img
              src={logo}
              alt="LedgerFlow"
              className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 object-contain transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shrink-0"
            />
            <div className="flex flex-col justify-center leading-none min-w-0">
              <span className="text-sm sm:text-base lg:text-lg font-bold tracking-tight text-gray-900 dark:text-white transition-all hidden sm:inline-block min-w-0">
                LedgerFlow
              </span>
              <span className="hidden md:inline-block text-[7px] sm:text-[8px] lg:text-[9px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-blue-500 transition-all mt-0.5">
                {tx(language, "Financial Platform", "Platform Keuangan")}
              </span>
            </div>
          </Link>
        </div>

        {/* ── Center: Search ── */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full" ref={searchWrapRef}>
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10"
            />
            <input
              type="text"
              placeholder={
                language === "id"
                  ? "Cari halaman, akun, jurnal..."
                  : "Search pages, accounts, journals..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              className="w-full pl-10 pr-16 py-2.5 text-sm rounded-xl bg-gray-100/80 dark:bg-darkCard/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50 transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-200/60 dark:bg-gray-700/60 rounded-md border border-gray-300/50 dark:border-gray-600/50">
              <Command size={10} />K
            </kbd>
            <AnimatePresence>
              {searchFocused && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  <HeaderSearchResults
                    query={searchQuery}
                    loading={searchLoading}
                    accounts={accountHits}
                    journals={journalHits}
                    onNavigate={goSearchResult}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Right ── */}
        <div className="flex items-center gap-1 lg:gap-3">
          {/* Mobile search */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="md:hidden p-1.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Search size={20} />
          </button>

          {/* Online badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Online
            </span>
          </div>

          {/* ── Notification Bell (HOVER dropdown) ── */}
          <div
            className="relative"
            onMouseEnter={handleNotifMouseEnter}
            onMouseLeave={handleNotifMouseLeave}
          >
            {/* Klik untuk toggle (wajib di layar sentuh — hover tidak ada). */}
            <button
              onClick={() => setNotifOpen((o) => !o)}
              aria-label="Notifikasi"
              aria-expanded={notifOpen}
              className="relative p-1.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white dark:ring-darkBg"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </motion.span>
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute right-0 mt-2 w-80 sm:w-[22rem] bg-white dark:bg-[#111827] rounded-2xl shadow-[0_8px_30px_rgba(2,6,23,0.12),0_2px_8px_rgba(2,6,23,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-gray-200/80 dark:border-white/10 overflow-hidden z-50"
                >
                  {/* Hairline gradien tepi atas */}
                  <div className="h-[2px] w-full bg-gradient-to-r from-primary-500 via-cyan-400 to-emerald-400" />
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 pt-3 pb-2.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">
                        {language === "id" ? "Notifikasi" : "Notifications"}
                      </h3>
                      {unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 text-[11px] font-bold tabular-nums ring-1 ring-inset ring-primary-500/20">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:underline font-medium transition-colors"
                      >
                        {language === "id"
                          ? "Tandai semua dibaca"
                          : "Mark all as read"}
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-[300px] overflow-y-auto scrollbar-thin px-2 pb-2">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/10 ring-1 ring-inset ring-primary-500/20">
                          <Bell size={20} className="text-primary-500" />
                        </span>
                        <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                          {language === "id"
                            ? "Belum ada notifikasi"
                            : "No notifications yet"}
                        </p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                          {language === "id"
                            ? "Aktivitas penting seperti jurnal, periode, dan pembayaran akan muncul di sini."
                            : "Important activity like journals, periods, and payments will appear here."}
                        </p>
                      </div>
                    ) : (
                      groupNotifications(notifications, language).map((group) => (
                        <div key={group.title}>
                          <p className="px-2 pt-2 pb-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.14em]">
                            {group.title}
                          </p>
                          {group.items.map((notif, idx) => {
                            const cfg =
                              NOTIF_ICON[notif.type] ||
                              NOTIF_ICON.journal_created;
                            const Icon = cfg.icon;
                            const accent = notifAccent(notif.type);
                            return (
                              <motion.button
                                key={notif.id}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.05 + idx * 0.03, duration: 0.25 }}
                                onClick={() => handleNotifClick(notif)}
                                className={`relative w-full flex items-start gap-3 pl-3 pr-3 py-2.5 text-left rounded-xl overflow-hidden transition-colors hover:bg-primary-50/60 dark:hover:bg-primary-500/[0.07] ${
                                  !notif.read
                                    ? "bg-primary-50/40 dark:bg-primary-500/[0.06]"
                                    : ""
                                }`}
                              >
                                {/* Accent bar */}
                                <span
                                  className={`absolute left-0 top-2 bottom-2 w-[2px] rounded-full ${accent.bar}`}
                                />
                                <span
                                  className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full ${accent.tint} mt-0.5`}
                                >
                                  <Icon size={14} />
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="flex items-start justify-between gap-2">
                                    <span
                                      className={`text-xs leading-snug ${!notif.read ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-600 dark:text-gray-300"}`}
                                    >
                                      {notif.title}
                                    </span>
                                    {!notif.read && (
                                      <span className="shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-primary-500" />
                                    )}
                                  </span>
                                  <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-snug">
                                    {notif.message}
                                  </span>
                                  <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-1 tabular-nums">
                                    {timeAgo(notif.time, language)}
                                  </span>
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02]">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center tabular-nums">
                        {notifications.length}{" "}
                        {language === "id" ? "notifikasi" : "notifications"} ·{" "}
                        {unreadCount}{" "}
                        {language === "id" ? "belum dibaca" : "unread"}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <div className="sm:hidden">
            <LanguageSwitcher variant="compact" />
          </div>
          <ThemeSwitcher />

          {/* ── User Dropdown (click) ── */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2.5 focus:outline-none group"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full blur-sm opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-sm shadow-md overflow-hidden">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user?.name?.charAt(0) || "U"
                  )}
                </div>
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 leading-tight">
                  {user?.name?.split(" ")[0] || "User"}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 capitalize">
                  {user?.role || "owner"}
                </p>
              </div>
              <ChevronDown
                size={14}
                className={`hidden lg:block text-gray-400 transition-transform duration-200 ${userDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {userDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-60 bg-white/95 dark:bg-darkCard/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700/50 overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-primary-500/5 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold shadow-md overflow-hidden">
                        {user?.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          user?.name?.charAt(0) || "U"
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                          {user?.name || "User"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user?.email || "user@ledgerflow.com"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="py-1.5">
                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                    >
                      <User size={16} className="text-gray-400" />{" "}
                      {language === "id" ? "Profil" : "Profile"}
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                    >
                      <Settings size={16} className="text-gray-400" />{" "}
                      {language === "id" ? "Pengaturan" : "Settings"}
                    </Link>
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-800 py-1.5">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 w-full text-left transition-colors"
                    >
                      <LogOut size={16} />{" "}
                      {language === "id" ? "Keluar" : "Logout"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Full-Screen Mobile Search Overlay ── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[99999] bg-white dark:bg-darkBg flex flex-col md:hidden"
          >
            {/* Top Search Bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200/80 dark:border-gray-800 bg-gray-50/50 dark:bg-darkCard/50">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={
                    language === "id"
                      ? "Cari transaksi, akun..."
                      : "Search transactions, accounts..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-base rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary-500 shadow-sm transition-all"
                />
              </div>
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
                className="px-3 py-2 text-sm font-bold text-primary-600 dark:text-primary-400 hover:underline shrink-0"
              >
                {language === "id" ? "Batal" : "Cancel"}
              </button>
            </div>

            {/* Results */}
            <HeaderSearchResults
              query={searchQuery}
              loading={searchLoading}
              accounts={accountHits}
              journals={journalHits}
              onNavigate={goSearchResult}
              compact
            />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
