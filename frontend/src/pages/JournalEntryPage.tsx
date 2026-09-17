import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import type {
  JournalEntry,
  CreateJournalPayload,
  FilterStatus,
} from "../types/journal";
import { useJournal } from "../hooks/useJournal";
import { usePagination } from "../hooks/usePagination";
import { useLanguage } from "../hooks/useLanguage";
import { tx } from "../i18n/tx";
import { journalService } from "../services/journalService";
import { JournalList } from "../components/journal/JournalList";
import { JournalForm } from "../components/journal/JournalForm";
import { JournalDetail } from "../components/journal/JournalDetail";
import { ConfirmDialog } from "../components/journal/ConfirmDialog";
import { IconJournal } from "../components/journal/JournalShared";
import { useAuth } from "../context/AuthContext";

import { HoverDropdown } from "../components/HoverDropdown";
import { ScrollReveal } from "../components/ScrollReveal";
import { formatCurrency } from "../utils/currency";
import {
  ArrowLeft,
  Search,
  CircleDollarSign,
  Plus,
  X,
} from "lucide-react";

// ─── View state machine ─────────────────────────────────────────────
type ViewState =
  | { mode: "list" }
  | { mode: "new" }
  | { mode: "edit"; entry: JournalEntry }
  | { mode: "detail"; entry: JournalEntry };

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
    updateEntry,
    postEntry,
    deleteEntry,
    voidEntry,
  } = useJournal();

  const { language } = useLanguage();
  const { user } = useAuth();
  const myRole = user?.role || "";
  // Izin sesuai backend: buat/edit/post = owner & akuntan; hapus & void = owner only.
  // Disembunyikan di frontend agar tidak muncul tombol yang pasti ditolak 403.
  const canCreatePost = myRole === "owner" || myRole === "akuntan";
  const canDelete = myRole === "owner";
  const canVoid = myRole === "owner";

  const location = useLocation();
  const [view, setView] = useState<ViewState>({ mode: "list" });
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterDate, setFilterDate] = useState<string>("all");
  const [sortKey, setSortKey] = useState<string>("newest");
  const [quota, setQuota] = useState<{
    max: number | null;
    used: number;
    left: number | null;
    planName?: string;
  } | null>(null);

  // Ambil sisa kuota jurnal bulan ini (plan Free) untuk banner
  useEffect(() => {
    journalService
      .getQuota()
      .then(setQuota)
      .catch(() => setQuota(null));
  }, []);
  const [search, setSearch] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("search") || "";
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("search");
    if (q !== null) setSearch(q);
  }, [location.search]);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<
    "post" | "delete" | "void"
  >("post");
  const [confirmEntry, setConfirmEntry] = useState<JournalEntry | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  // Alasan void (wajib, dikirim ke backend & tampil di riwayat)
  const [voidReason, setVoidReason] = useState("");
  const [voidReasonError, setVoidReasonError] = useState("");

  // ── Filter + Sorting (ketentuan S1: search/filter/sort bersamaan) ──
  const filtered = useMemo(() => {
    const q = (search ?? "").toLowerCase();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const list = (entries ?? []).filter((e) => {
      const matchSearch =
        (e.number ?? "").toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q);
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && e.status === "posted") ||
        (filterStatus === "inactive" && e.status === "draft");
      let matchDate = true;
      if (filterDate !== "all") {
        const t = new Date(e.date).getTime();
        if (Number.isNaN(t)) matchDate = false;
        else if (filterDate === "today") matchDate = now - t < dayMs;
        else if (filterDate === "week") matchDate = now - t < 7 * dayMs;
        else if (filterDate === "month") matchDate = now - t < 30 * dayMs;
      }
      return matchSearch && matchStatus && matchDate;
    });
    const sorted = [...list];
    switch (sortKey) {
      case "oldest":
        sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case "number-az":
        sorted.sort((a, b) => (a.number ?? "").localeCompare(b.number ?? ""));
        break;
      case "number-za":
        sorted.sort((a, b) => (b.number ?? "").localeCompare(a.number ?? ""));
        break;
      case "newest":
      default:
        sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
    }
    return sorted;
  }, [entries, search, filterStatus, filterDate, sortKey]);

  // Pagination client-side untuk list view
  const pagination = usePagination(filtered, 5);

  // ── Stats ── (entry void tidak ikut dihitung — konsisten dengan laporan)
  const stats = useMemo(() => {
    const posted = entries.filter((e) => e.status === "posted" && !e.voided_at);
    return {
      total: entries.length,
      posted: posted.length,
      draft: entries.filter((e) => e.status === "draft").length,
      voided: entries.filter((e) => !!e.voided_at).length,
      totalPostedDebit: posted.reduce((s, e) => s + e.totalDebit, 0),
    };
  }, [entries]);

  // fmtIDR (full) dipakai untuk baris tabel/list.
  const fmtIDR = (n: number) => formatCurrency(n);

  // ── Handlers ──
  const handleSave = async (
    payload: CreateJournalPayload,
  ): Promise<boolean> => {
    const result = await createEntry(payload);
    return result !== null;
  };

  const handleUpdate = async (
    payload: CreateJournalPayload,
  ): Promise<boolean> => {
    if (view.mode !== "edit") return false;
    const result = await updateEntry(view.entry.id, payload);
    if (result) setView({ mode: "detail", entry: result });
    return result !== null;
  };

  const openConfirm = (mode: "post" | "delete" | "void", entry: JournalEntry) => {
    setConfirmMode(mode);
    setConfirmEntry(entry);
    if (mode === "void") {
      setVoidReason("");
      setVoidReasonError("");
    }
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmEntry) return;
    if (confirmMode === "void" && voidReason.trim().length < 3) {
      setVoidReasonError(
        tx(language, "Void reason is required (min. 3 characters).", "Alasan void wajib diisi (minimal 3 karakter)."),
      );
      return;
    }
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
      } else if (confirmMode === "void") {
        const ok = await voidEntry(confirmEntry.id, voidReason.trim());
        if (ok) {
          const fresh = await journalService.getById(confirmEntry.id).catch(() => null);
          setView((v) =>
            v.mode === "detail" && v.entry.id === confirmEntry.id
              ? { mode: "detail", entry: fresh ?? v.entry }
              : v,
          );
          if (!fresh) setView({ mode: "list" });
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
      ? tx(language, "New Entry", "Buat Entry Baru")
      : view.mode === "edit"
        ? tx(language, "Edit Entry", "Edit Entry")
        : view.mode === "detail"
          ? view.entry.number
          : tx(language, "Journal Entry", "Entri Jurnal");

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-4">
        {/* ── Page Header ── */}
        <ScrollReveal
          direction="left"
          className="flex items-start justify-between gap-4 flex-wrap"
        >
          <div>
            {view.mode !== "list" && (
              <button
                type="button"
                onClick={() => setView({ mode: "list" })}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-2 transition-colors"
              >
                <ArrowLeft size={12} /> {tx(language, "Journal Entry", "Entri Jurnal")}
              </button>
            )}
            <div className="flex items-center gap-2.5 mb-1 min-w-0">
              <div className="p-2 rounded-xl bg-primary-500/10 text-primary-500">
                <IconJournal size={20} />
              </div>
              <motion.h1
                key={`${language}-${pageTitle}`}
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight min-w-0 break-words"
              >
                {pageTitle}
              </motion.h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {view.mode === "list"
                ? tx(language, "Record transactions in the general journal", "Pencatatan transaksi ke dalam buku jurnal umum")
                : view.mode === "new"
                  ? tx(language, "Fill in transaction details and ensure debit = credit", "Isi detail transaksi dan pastikan debit = kredit")
                  : tx(language, "Journal entry detail", "Detail entri jurnal")}
            </p>
          </div>

          {view.mode === "list" && canCreatePost && (
            <button
              type="button"
              onClick={() => setView({ mode: "new" })}
              className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium shadow-md hover:shadow-lg hover:scale-105 transition-all whitespace-nowrap"
            >
              <Plus
                size={16}
                className="transition-transform group-hover:rotate-90"
              />
              {tx(language, "New Entry", "Buat Entry Baru")}
            </button>
          )}
        </ScrollReveal>

        {/* ── Main Content: tepat di bawah header, tanpa blok penghalang ── */}
        {view.mode === "list" && (
          <ScrollReveal direction="up">
            <JournalList
              toolbar={
                <>
                  <div className="relative flex-1 min-w-[100%] sm:min-w-48">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder={tx(language, "Search number or description...", "Cari nomor atau deskripsi...")}
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
                      { value: "all", label: tx(language, "All Status", "Semua Status") },
                      { value: "active", label: tx(language, "Posted", "Diposting") },
                      { value: "inactive", label: tx(language, "Draft", "Draf") },
                    ]}
                  />

                  <HoverDropdown
                    value={filterDate}
                    onChange={setFilterDate}
                    minWidth={150}
                    options={[
                      { value: "all", label: tx(language, "All Dates", "Semua Tanggal") },
                      { value: "today", label: tx(language, "Today", "Hari Ini") },
                      { value: "week", label: tx(language, "Last 7 Days", "7 Hari Terakhir") },
                      { value: "month", label: tx(language, "Last 30 Days", "30 Hari Terakhir") },
                    ]}
                  />

                  <HoverDropdown
                    value={sortKey}
                    onChange={setSortKey}
                    minWidth={150}
                    options={[
                      { value: "newest", label: tx(language, "Newest", "Terbaru") },
                      { value: "oldest", label: tx(language, "Oldest", "Terlama") },
                      { value: "number-az", label: tx(language, "Number A-Z", "Nomor A-Z") },
                      { value: "number-za", label: tx(language, "Number Z-A", "Nomor Z-A") },
                    ]}
                  />

                  {(search || filterStatus !== "all" || filterDate !== "all" || sortKey !== "newest") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setFilterStatus("all");
                        setFilterDate("all");
                        setSortKey("newest");
                      }}
                      className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <X size={12} /> {tx(language, "Reset", "Reset")}
                    </button>
                  )}

                  {quota && quota.max !== null && quota.max > 0 && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border ${
                        (quota.left ?? 0) <= 10
                          ? "border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400"
                          : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      <CircleDollarSign size={12} />
                      {quota.left}/{quota.max}
                      {(quota.left ?? 0) <= 10 && (
                        <a
                          href="/pricing"
                          className="font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                        >
                          {tx(language, "Upgrade", "Upgrade")}
                        </a>
                      )}
                    </span>
                  )}
                </>
              }
              entries={pagination.pageItems}
              loading={loading}
              error={error}
              onRetry={fetchEntries}
              onNew={() => setView({ mode: "new" })}
              onView={handleViewEntry}
              onPost={(entry) => openConfirm("post", entry)}
              onDelete={(entry) => openConfirm("delete", entry)}
              onVoid={(entry) => openConfirm("void", entry)}
              canPost={canCreatePost}
              canDelete={canDelete}
              canVoid={canVoid}
              pagination={{
                page: pagination.page,
                totalPages: pagination.totalPages,
                totalItems: pagination.totalItems,
                startIndex: pagination.startIndex,
                endIndex: pagination.endIndex,
                canPrev: pagination.canPrev,
                canNext: pagination.canNext,
                onPrev: pagination.prev,
                onNext: pagination.next,
                onGoTo: pagination.goTo,
                pageSize: pagination.pageSize,
                onPageSizeChange: pagination.setPageSize,
                itemLabel: tx(language, "entries", "entry"),
                summary: (
                  <>
                    {pagination.startIndex}–{pagination.endIndex} {tx(language, "of", "dari")}{" "}
                    {pagination.totalItems} {tx(language, "entries", "entry")} · {stats.posted} {tx(language, "posted", "diposting")} ·{" "}
                    {stats.draft} {tx(language, "draft", "draf")} · {tx(language, "Total Debit:", "Total Debit:")}{" "}
                    <span className="font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                      {fmtIDR(stats.totalPostedDebit)}
                    </span>
                  </>
                ),
              }}
            />
          </ScrollReveal>
        )}

        {view.mode === "new" && (
          <JournalForm
            saving={saving}
            onSave={handleSave}
            onBack={() => setView({ mode: "list" })}
          />
        )}

        {view.mode === "edit" && (
          <JournalForm
            saving={saving}
            onSave={handleUpdate}
            onBack={() => setView({ mode: "detail", entry: view.entry })}
            initialEntry={{
              date: view.entry.date,
              description: view.entry.description,
              lines: view.entry.lines.map((l) => ({
                accountCode: l.accountCode,
                accountName: l.accountName,
                description: l.description,
                debit: l.debit,
                credit: l.credit,
              })),
            }}
            submitLabel={tx(language, "Update Entry", "Perbarui Entry")}
          />
        )}

        {view.mode === "detail" && (
          <JournalDetail
            entry={view.entry}
            posting={posting}
            onBack={() => setView({ mode: "list" })}
            onPost={(entry) => openConfirm("post", entry)}
            onDelete={(entry) => openConfirm("delete", entry)}
            onVoid={(entry) => openConfirm("void", entry)}
            onEdit={(entry) => setView({ mode: "edit", entry })}
            canPost={canCreatePost}
            canDelete={canDelete}
            canVoid={canVoid}
          />
        )}
      </div>

      {/* ── Confirm Dialog ── */}
      <ConfirmDialog
        open={confirmOpen}
        mode={confirmMode}
        entry={confirmEntry}
        loading={confirmLoading}
        onConfirm={handleConfirm}
        reason={voidReason}
        onReasonChange={(v) => {
          setVoidReason(v);
          if (v.trim().length >= 3) setVoidReasonError("");
        }}
        reasonError={voidReasonError}
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
    </>
  );
}
