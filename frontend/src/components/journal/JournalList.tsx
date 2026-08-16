import type { JournalEntry } from "../../types/journal";
import {
  StatusBadge,
  ActionButton,
  SpinnerIcon,
  IconEdit,
  IconSend,
  IconTrash,
  formatIDR,
  formatDate,
} from "./JournalShared";
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
  pagination?: TablePaginationProps;
  /** Izin sesuai role (backend): post/edit = owner/akuntan, delete = admin/owner. */
  canPost?: boolean;
  canDelete?: boolean;
}

const HEADERS = [
  "Nomor",
  "Tanggal",
  "Deskripsi",
  "Status",
  "Total Debit",
  "Aksi",
] as const;

export function JournalList({
  entries,
  loading,
  error,
  onRetry,
  onNew,
  onView,
  onPost,
  onDelete,
  pagination,
  canPost = true,
  canDelete = true,
}: JournalListProps) {

  return (
    <div className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md overflow-hidden">
      {loading ? (
        <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
          <SpinnerIcon className="w-6 h-6" />
          <span className="text-sm">Memuat data...</span>
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
            Coba Lagi
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-800/50">
                  {HEADERS.map((h, i) => {
                    const minW =
                      h === "Nomor" || h === "Tanggal"
                        ? "min-w-[120px]"
                        : h === "Deskripsi"
                          ? "min-w-[220px]"
                          : h === "Status"
                            ? "min-w-[110px]"
                            : h === "Total Debit"
                              ? "min-w-[160px]"
                              : "min-w-[150px]";
                    return (
                      <th
                        key={h}
                        className={`px-4 py-3.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${minW} ${
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
                        Belum ada journal entry
                      </p>
                      {canPost && (
                        <button
                          type="button"
                          onClick={onNew}
                          className="px-4 py-2 text-sm bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:shadow-lg transition-all"
                        >
                          Buat Entry Pertama
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
                      canPost={canPost}
                      canDelete={canDelete}
                    />
                  ))
                )}
              </tbody>
            </table>
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
  canPost: boolean;
  canDelete: boolean;
}

function JournalRow({
  entry,
  onView,
  onPost,
  onDelete,
  canPost,
  canDelete,
}: JournalRowProps) {
  const isDraft = entry.status === "draft";

  return (
    <tr
      className="hover:bg-primary-50/30 dark:hover:bg-white/5 transition-colors cursor-pointer"
      onClick={() => onView(entry)}
    >
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="inline-block font-mono text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-2 py-0.5 rounded-md border border-primary-200 dark:border-primary-500/20 whitespace-nowrap">
          {entry.number}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {formatDate(entry.date)}
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-800 dark:text-gray-200 line-clamp-1">
          {entry.description}
        </span>
        <span className="text-xs text-gray-400">
          {entry.lines?.length ?? 0} baris
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <StatusBadge status={entry.status} />
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 tabular-nums">
          {formatIDR(entry.totalDebit)}
        </span>
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1.5 justify-end">
          <ActionButton
            title="Lihat detail"
            onClick={() => onView(entry)}
            icon={<IconEdit size={14} />}
            variant="default"
          />
          {isDraft && (
            <>
              {canPost && (
                <ActionButton
                  title="Posting ke buku besar"
                  onClick={() => onPost(entry)}
                  icon={<IconSend size={14} />}
                  variant="primary"
                />
              )}
              {canDelete && (
                <ActionButton
                  title="Hapus draft"
                  onClick={() => onDelete(entry)}
                  icon={<IconTrash size={14} />}
                  variant="danger"
                />
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
