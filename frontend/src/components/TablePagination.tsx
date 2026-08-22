import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useLanguage } from "../hooks/useLanguage";

export interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (page: number) => void;
  /** Konten kiri opsional (mis. ringkasan jumlah / total) */
  summary?: ReactNode;
  /** Kata untuk satuan item, mis. "akun", "entry", "transaksi" */
  itemLabel?: string;
}

export function TablePagination({
  page,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onGoTo,
  summary,
  itemLabel,
}: TablePaginationProps) {
  const { language } = useLanguage();
  const id = language === "id";
  const resolvedItemLabel = itemLabel ?? (id ? "data" : "items");
  if (totalItems === 0) return null;

  // Buat daftar nomor halaman ringkas (maks 5 tombol di sekitar halaman aktif)
  const pages: number[] = [];
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  let end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30 rounded-b-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <span className="text-xs text-gray-500 dark:text-gray-400 order-2 sm:order-1">
        {summary ?? (
          <>
            {id ? "Menampilkan" : "Showing"}{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {startIndex}–{endIndex}
            </span>{" "}
            {id ? "dari" : "of"}{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {totalItems}
            </span>{" "}
            {resolvedItemLabel}
          </>
        )}
      </span>

      {totalPages > 1 && (
        <div className="flex items-center gap-1 order-1 sm:order-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canPrev}
            aria-label={id ? "Halaman sebelumnya" : "Previous page"}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={15} />
          </button>

          {pages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onGoTo(p)}
              aria-current={p === page ? "page" : undefined}
              className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-medium border transition-colors ${
                p === page
                  ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/5"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            aria-label={id ? "Halaman berikutnya" : "Next page"}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

export default TablePagination;
