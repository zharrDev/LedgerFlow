import type { JournalEntry } from "../../types/journal";
import {
  StatusBadge,
  ActionButton,
  SpinnerIcon,
  IconEdit,
  IconSend,
  IconTrash,
  IconVoid,
  formatIDR,
  formatDate,
} from "./JournalShared";
import { useLanguage } from "../../hooks/useLanguage";
import { tx } from "../../i18n/tx";
import { AlertCircle, BookOpen } from "lucide-react";
import { TablePagination, type TablePaginationProps } from "../TablePagination";

interface JournalListProps {
  entries: JournalEntry[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onNew: () => void;
  onView: (entry: JournalEntry) => void;
  onPost: (entry: JournalEntry) => void;
  onDelete: (entry: JournalEntry) => void;
  onVoid?: (entry: JournalEntry) => void;
  pagination?: TablePaginationProps;
  /** Izin sesuai role (backend): post/edit = owner/akuntan, delete & void = owner. */
  canPost?: boolean;
  canDelete?: boolean;
  canVoid?: boolean;
}

export function JournalList({
  entries,
  loading,
  error,
  onRetry,
  onNew,
  onView,
  onPost,
  onDelete,
  onVoid,
  pagination,
  canPost = true,
  canDelete = true,
  canVoid = false,
}: JournalListProps) {
  const { language } = useLanguage();

  const HEADERS = [
    tx(language, "No.", "Nomor"),
    tx(language, "Date", "Tanggal"),
    tx(language, "Description", "Deskripsi"),
    tx(language, "Status", "Status"),
    tx(language, "Total Debit", "Total Debit"),
    tx(language, "Actions", "Aksi"),
  ] as const;

  return (
    <div className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md overflow-hidden">
      {loading ? (
        <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
          <SpinnerIcon className="w-6 h-6" />
          <span className="text-sm">{tx(language, "Loading...", "Memuat data...")}</span>
        </div>
      ) : error ? (
        <div className="py-20 flex flex-col items-center gap-3">
          <AlertCircle size={32} className="text-rose-500" />
          <p className="text-sm text-rose-500 dark:text-rose-400">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-gray-700 dark:text-gray-300"
          >
            {tx(language, "Try Again", "Coba Lagi")}
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-800/50">
                  {HEADERS.map((h, i) => {
                    const minW =
                      i === 0 || i === 1
                        ? "min-w-[120px]"
                        : i === 2
                          ? "min-w-[220px]"
                          : i === 3
                            ? "min-w-[110px]"
                            : i === 4
                              ? "min-w-[160px]"
                              : "min-w-[150px]";
                    return (
                      <th
                        key={h}
                        className={`px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${minW} ${
                          i >= 4 ? "text-right" : "text-left"
                        }`}
                      >
                        {h}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <BookOpen
                        size={32}
                        className="mx-auto mb-3 text-gray-300 dark:text-gray-600"
                      />
                      <p className="text-sm text-gray-400 mb-3">
                        {tx(language, "No journal entries yet", "Belum ada journal entry")}
                      </p>
                      {canPost && (
                        <button
                          type="button"
                          onClick={onNew}
                          className="px-4 py-2 text-sm bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:shadow-lg transition-all"
                        >
                          {tx(language, "Create First Entry", "Buat Entry Pertama")}
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <JournalRow
                      key={entry.id}
                      entry={entry}
                      onView={onView}
                      onPost={onPost}
                      onDelete={onDelete}
                      onVoid={onVoid}
                      canPost={canPost}
                      canDelete={canDelete}
                      canVoid={canVoid}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-800/50">
            {entries.length === 0 ? (
              <div className="py-16 text-center">
                <BookOpen size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-400 mb-3">
                  {tx(language, "No journal entries yet", "Belum ada journal entry")}
                </p>
                {canPost && (
                  <button
                    type="button"
                    onClick={onNew}
                    className="px-4 py-2 text-sm bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:shadow-lg transition-all"
                  >
                    {tx(language, "Create First Entry", "Buat Entry Pertama")}
                  </button>
                )}
              </div>
            ) : (
              entries.map((entry) => (
                <JournalMobileCard
                  key={entry.id}
                  entry={entry}
                  onView={onView}
                  onPost={onPost}
                  onDelete={onDelete}
                  onVoid={onVoid}
                  canPost={canPost}
                  canDelete={canDelete}
                  canVoid={canVoid}
                />
              ))
            )}
          </div>

          {pagination && (
            <TablePagination {...pagination} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

interface JournalRowProps {
  entry: JournalEntry;
  onView: (e: JournalEntry) => void;
  onPost: (e: JournalEntry) => void;
  onDelete: (e: JournalEntry) => void;
  onVoid?: (e: JournalEntry) => void;
  canPost: boolean;
  canDelete: boolean;
  canVoid?: boolean;
}

function JournalRow({
  entry,
  onView,
  onPost,
  onDelete,
  onVoid,
  canPost,
  canDelete,
  canVoid,
}: JournalRowProps) {
  const { language } = useLanguage();
  const isDraft = entry.status === "draft";
  const isVoided = !!entry.voided_at;

  return (
    <tr
      className={`hover:bg-primary-50/30 dark:hover:bg-white/5 transition-colors cursor-pointer ${
        isVoided ? "opacity-50" : ""
      }`}
      onClick={() => onView(entry)}
    >
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="inline-block font-mono text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-2 py-0.5 rounded-md border border-primary-200 dark:border-primary-500/20 whitespace-nowrap">
          {entry.number}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {formatDate(entry.date, language)}
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-800 dark:text-gray-200 line-clamp-1">
          {entry.description}
        </span>
        <span className="text-xs text-gray-400">
          {entry.lines?.length ?? 0} {tx(language, "lines", "baris")}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <StatusBadge status={entry.status} voided={isVoided} />
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <span className={`text-sm font-medium text-gray-700 dark:text-gray-300 tabular-nums ${isVoided ? "line-through decoration-rose-400/70" : ""}`}>
          {formatIDR(entry.totalDebit)}
        </span>
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1.5 justify-end">
          <ActionButton
            title={tx(language, "View detail", "Lihat detail")}
            onClick={() => onView(entry)}
            icon={<IconEdit size={14} />}
            variant="default"
          />
          {isDraft && (
            <>
              {canPost && (
                <ActionButton
                  title={tx(language, "Post to ledger", "Posting ke buku besar")}
                  onClick={() => onPost(entry)}
                  icon={<IconSend size={14} />}
                  variant="primary"
                />
              )}
              {canDelete && (
                <ActionButton
                  title={tx(language, "Delete draft", "Hapus draft")}
                  onClick={() => onDelete(entry)}
                  icon={<IconTrash size={14} />}
                  variant="danger"
                />
              )}
            </>
          )}
          {!isDraft && !isVoided && canVoid && onVoid && (
            <ActionButton
              title={tx(language, "Void entry", "Void entry")}
              onClick={() => onVoid(entry)}
              icon={<IconVoid size={14} />}
              variant="danger"
            />
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Mobile Card ──────────────────────────────────────────────────────────────

function JournalMobileCard({
  entry,
  onView,
  onPost,
  onDelete,
  onVoid,
  canPost,
  canDelete,
  canVoid,
}: JournalRowProps) {
  const { language } = useLanguage();
  const isDraft = entry.status === "draft";
  const isVoided = !!entry.voided_at;

  return (
    <div
      className={`p-3 cursor-pointer hover:bg-primary-50/30 dark:hover:bg-white/5 transition-colors ${
        isVoided ? "opacity-50" : ""
      }`}
      onClick={() => onView(entry)}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="font-mono text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-2 py-0.5 rounded-md border border-primary-200 dark:border-primary-500/20">
          {entry.number}
        </span>
        <StatusBadge status={entry.status} voided={isVoided} />
      </div>
      <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-1 mb-0.5">
        {entry.description}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-400">
          {formatDate(entry.date, language)} · {entry.lines?.length ?? 0} {tx(language, "lines", "baris")}
        </span>
        <span className={`text-xs font-medium text-gray-700 dark:text-gray-300 tabular-nums ${isVoided ? "line-through decoration-rose-400/70" : ""}`}>
          {formatIDR(entry.totalDebit)}
        </span>
      </div>
      {(isDraft && (canPost || canDelete)) ||
      (!isDraft && !isVoided && canVoid && onVoid) ? (
        <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800/50" onClick={(e) => e.stopPropagation()}>
          {isDraft && canPost && (
            <ActionButton
              title={tx(language, "Post to ledger", "Posting ke buku besar")}
              onClick={() => onPost(entry)}
              icon={<IconSend size={14} />}
              variant="primary"
            />
          )}
          {isDraft && canDelete && (
            <ActionButton
              title={tx(language, "Delete draft", "Hapus draft")}
              onClick={() => onDelete(entry)}
              icon={<IconTrash size={14} />}
              variant="danger"
            />
          )}
          {!isDraft && !isVoided && canVoid && onVoid && (
            <ActionButton
              title={tx(language, "Void entry", "Void entry")}
              onClick={() => onVoid(entry)}
              icon={<IconVoid size={14} />}
              variant="danger"
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
