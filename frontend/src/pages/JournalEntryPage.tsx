import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import type {
  JournalEntry,
  CreateJournalPayload,
  FilterStatus,
} from "../types/journal";
import { useJournal } from "../hooks/useJournal";
import { usePagination } from "../hooks/usePagination";
import { TablePagination } from "../components/TablePagination";
import { JournalList } from "../components/journal/JournalList";
import { JournalForm } from "../components/journal/JournalForm";
import { JournalDetail } from "../components/journal/JournalDetail";
import { ConfirmDialog } from "../components/journal/ConfirmDialog";
import { IconJournal, IconPlus } from "../components/journal/JournalShared";
import { useToast } from "../context/ToastContext";
import { AppShell } from "../components/AppShell";
import { HoverDropdown } from "../components/HoverDropdown";
import {
  ArrowLeft,
  Search,
  CheckCircle,
  FileEdit,
  CircleDollarSign,
  Plus,
  X,
} from "lucide-react";

// ─── View state machine ─────────────────────────────────────────────
type ViewState =
  | { mode: "list" }
  | { mode: "new" }
  | { mode: "detail"; entry: JournalEntry };

// ─── Animation variants ─────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};
const letterContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.3 },
  },
};
const letterVariants = {
  hidden: { y: 40, opacity: 0, rotateX: -90 },
  visible: {
    y: 0,
    opacity: 1,
    rotateX: 0,
    transition: { type: "spring", stiffness: 200, damping: 18 },
  },
};

// ─── Stat Card ──────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4 }}
      className={`group relative rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md hover:shadow-lg transition-all p-5 overflow-hidden`}
    >
      <div
        className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-40 group-hover:opacity-80 transition-opacity ${accent}`}
      ></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {label}
          </span>
          <div className={`p-1.5 rounded-lg ${accent}`}>{icon}</div>
        </div>
        <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tabular-nums break-words">
          {value}
        </p>
        {sub && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────
export default function JournalEntryPage() {
  const {
    entries,
    loading,
    error,
    saving,
    posting,
    fetchEntries,
    createEntry,
    postEntry,
    deleteEntry,
  } = useJournal();

  const [view, setView] = useState<ViewState>({ mode: "list" });
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"post" | "delete">("post");
  const [confirmEntry, setConfirmEntry] = useState<JournalEntry | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // ── Filter ──
  const filtered = useMemo(() => {
    const q = (search ?? "").toLowerCase();
    return (entries ?? []).filter((e) => {
      const matchSearch =
        (e.number ?? "").toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q);
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && e.status === "posted") ||
        (filterStatus === "inactive" && e.status === "draft");
      return matchSearch && matchStatus;
    });
  }, [entries, search, filterStatus]);

  // Pagination client-side untuk list view
  const pagination = usePagination(filtered, 5);

  // ── Stats ──
  const stats = useMemo(() => {
    const posted = entries.filter((e) => e.status === "posted");
    return {
      total: entries.length,
      posted: posted.length,
      draft: entries.filter((e) => e.status === "draft").length,
      totalPostedDebit: posted.reduce((s, e) => s + e.totalDebit, 0),
    };
  }, [entries]);

  const fmtIDR = (n: number) =>
    n === 0
      ? "Rp 0"
      : new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
        }).format(n);

  // ── Handlers ──
  const handleSave = async (
    payload: CreateJournalPayload,
  ): Promise<boolean> => {
    const result = await createEntry(payload);
    return result !== null;
  };

  const openConfirm = (mode: "post" | "delete", entry: JournalEntry) => {
    setConfirmMode(mode);
    setConfirmEntry(entry);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmEntry) return;
    setConfirmLoading(true);
    try {
      if (confirmMode === "post") {
        const ok = await postEntry(confirmEntry.id);
        if (ok) {
          setView((v) =>
            v.mode === "detail" && v.entry.id === confirmEntry.id
              ? {
                  mode: "detail",
                  entry: { ...v.entry, status: "posted" },
                }
              : v,
          );
        }
      } else {
        const ok = await deleteEntry(confirmEntry.id);
        if (ok) {
          setView({ mode: "list" });
        }
      }
      setConfirmOpen(false);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleViewEntry = (entry: JournalEntry) => {
    const fresh = entries.find((e) => e.id === entry.id) ?? entry;
    setView({ mode: "detail", entry: fresh });
  };

  const pageTitle =
    view.mode === "new"
      ? "Buat Entry Baru"
      : view.mode === "detail"
        ? view.entry.number
        : "Journal Entry";

  return (
    <AppShell>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8"
      >
        {/* ── Page Header ── */}
        <motion.div
          variants={itemVariants}
          className="flex items-start justify-between gap-4 flex-wrap"
        >
          <div>
            {view.mode !== "list" && (
              <button
                type="button"
                onClick={() => setView({ mode: "list" })}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-2 transition-colors"
              >
                <ArrowLeft size={12} /> Journal Entry
              </button>
            )}
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 rounded-xl bg-primary-500/10 text-primary-500">
                <IconJournal size={20} />
              </div>
              <motion.h1
                variants={letterContainerVariants}
                initial="hidden"
                animate="visible"
                className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center flex-wrap"
                style={{ perspective: "600px" }}
              >
                {pageTitle.split("").map((char, i) => (
                  <motion.span
                    key={`${pageTitle}-${i}`}
                    variants={letterVariants}
                    className="inline-block"
                    style={{ transformOrigin: "bottom center" }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </motion.h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {view.mode === "list"
                ? "Pencatatan transaksi ke dalam buku jurnal umum"
                : view.mode === "new"
                  ? "Isi detail transaksi dan pastikan debit = kredit"
                  : "Detail journal entry"}
            </p>
          </div>

          {view.mode === "list" && (
            <button
              type="button"
              onClick={() => setView({ mode: "new" })}
              className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium shadow-md hover:shadow-lg hover:scale-105 transition-all whitespace-nowrap"
            >
              <Plus
                size={16}
                className="transition-transform group-hover:rotate-90"
              />
              Buat Entry Baru
            </button>
          )}
        </motion.div>

        {/* ── Stats (list view only) ── */}
        {view.mode === "list" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Entry"
              value={stats.total}
              icon={<FileEdit size={14} className="text-gray-500" />}
              accent="bg-gray-500/10"
            />
            <StatCard
              label="Posted"
              value={stats.posted}
              icon={<CheckCircle size={14} className="text-emerald-500" />}
              accent="bg-emerald-500/10"
            />
            <StatCard
              label="Draft"
              value={stats.draft}
              icon={<FileEdit size={14} className="text-amber-500" />}
              accent="bg-amber-500/10"
            />
            <StatCard
              label="Total Posted"
              value={fmtIDR(stats.totalPostedDebit)}
              sub="Total Debit"
              icon={<CircleDollarSign size={14} className="text-primary-500" />}
              accent="bg-primary-500/10"
            />
          </div>
        )}

        {/* ── Filters (list view only) ── */}
        {view.mode === "list" && (
          <motion.div
            variants={itemVariants}
            className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center"
          >
            <div className="relative flex-1 min-w-[100%] sm:min-w-48">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Cari nomor atau deskripsi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-darkBg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition"
              />
            </div>

            <HoverDropdown
              value={filterStatus}
              onChange={(v) => setFilterStatus(v as FilterStatus)}
              minWidth={150}
              options={[
                { value: "all", label: "Semua Status" },
                { value: "active", label: "Posted" },
                { value: "inactive", label: "Draft" },
              ]}
            />

            {(search || filterStatus !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilterStatus("all");
                }}
                className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <X size={12} /> Reset
              </button>
            )}
          </motion.div>
        )}

        {/* ── Main Content ── */}
        {view.mode === "list" && (
          <>
            <JournalList
              entries={pagination.pageItems}
              loading={loading}
              error={error}
              onRetry={fetchEntries}
              onNew={() => setView({ mode: "new" })}
              onView={handleViewEntry}
              onPost={(entry) => openConfirm("post", entry)}
              onDelete={(entry) => openConfirm("delete", entry)}
            />
            <TablePagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              canPrev={pagination.canPrev}
              canNext={pagination.canNext}
              onPrev={pagination.prev}
              onNext={pagination.next}
              onGoTo={pagination.goTo}
              itemLabel="entry"
            />
          </>
        )}

        {view.mode === "new" && (
          <JournalForm
            saving={saving}
            onSave={handleSave}
            onBack={() => setView({ mode: "list" })}
          />
        )}

        {view.mode === "detail" && (
          <JournalDetail
            entry={view.entry}
            posting={posting}
            onBack={() => setView({ mode: "list" })}
            onPost={(entry) => openConfirm("post", entry)}
            onDelete={(entry) => openConfirm("delete", entry)}
          />
        )}
      </motion.div>

      {/* ── Confirm Dialog ── */}
      <ConfirmDialog
        open={confirmOpen}
        mode={confirmMode}
        entry={confirmEntry}
        loading={confirmLoading}
        onConfirm={handleConfirm}
        onClose={() => {
          if (!confirmLoading) setConfirmOpen(false);
        }}
      />

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AppShell>
  );
}
