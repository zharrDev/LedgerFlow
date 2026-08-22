import { useState } from "react";
import { formatCurrency } from "../../utils/currency";
import type { BalanceSheetAccount } from "../../types/reports";
import { usePagination } from "../../hooks/usePagination";
import { TablePagination } from "../TablePagination";
import { FileText } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";

interface BalanceSheetTableProps {
  title: string;
  accounts: BalanceSheetAccount[];
  total: number;
  emptyMessage?: string;
}

/**
 * Blok section neraca — dipakai di dalam SATU panel glass besar (parent).
 * Header seragam (tint primary), divider tipis antar baris, hover row.
 */
export const BalanceSheetTable = ({
  title,
  accounts,
  total,
  emptyMessage,
}: BalanceSheetTableProps) => {
  const { language } = useLanguage();
  const id = language === "id";
  const resolvedEmptyMessage = emptyMessage ?? (id ? "Tidak ada data" : "No data");
  const {
    page,
    setPage,
    totalPages,
    pageItems,
    totalItems,
    startIndex,
    endIndex,
    canPrev,
    canNext,
    next,
    prev,
  } = usePagination(accounts, 5);

  const [expanded, setExpanded] = useState(false);

  return (
    <div className="min-w-0 h-full flex flex-col">
      <div className="flex items-center gap-2 px-5 sm:px-6 py-3.5 bg-primary-500/10 dark:bg-primary-500/15 border-b border-white/10 dark:border-white/5 shrink-0">
        <FileText size={14} className="text-primary-600 dark:text-primary-300" />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
          {title}
        </h3>
      </div>

      {/* Tampilan Desktop (table) — area konten flex-1, Total jadi footer menempel bawah */}
      {accounts.length === 0 ? (
        <div className="hidden sm:flex flex-1 min-h-0 items-center justify-center px-6 py-10 text-center text-gray-400">
          {resolvedEmptyMessage}
        </div>
      ) : (
        <div className="hidden sm:flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/70 dark:bg-white/[0.03] border-b border-white/10 dark:border-white/5">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {id ? "Kode" : "Code"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {id ? "Nama Akun" : "Account Name"}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {id ? "Saldo" : "Balance"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((account) => (
                  <tr
                    key={account.account_id}
                    className="border-b border-white/5 hover:bg-white/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-3.5 whitespace-nowrap text-sm font-mono font-medium text-gray-700 dark:text-slate-200">
                      {account.account_code}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-800 dark:text-slate-300">
                      {account.account_name}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-sm text-right font-semibold tabular-nums text-gray-900 dark:text-white">
                      {formatCurrency(account.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="shrink-0 bg-gray-50/70 dark:bg-white/[0.03] px-6 py-3.5 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-800 dark:text-white">
              Total {title}
            </span>
            <span className="text-sm font-bold text-right tabular-nums text-gray-900 dark:text-white">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      )}

      {/* Tampilan Mobile (card list) */}
      <div className="sm:hidden p-4 space-y-3 flex flex-col flex-1 min-h-0">
        {accounts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-8 text-center text-gray-400 text-sm">
            {resolvedEmptyMessage}
          </div>
        ) : (
          <>
            {pageItems.map((account) => (
              <div
                key={account.account_id}
                className="bg-white/50 dark:bg-white/5 rounded-xl p-4 border border-white/10 dark:border-white/10"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                      {account.account_name}
                    </p>
                    <span className="text-xs font-mono text-gray-500 dark:text-slate-400 mt-0.5 block">
                      {account.account_code}
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white ml-3 shrink-0 text-right max-w-[45%] break-words">
                    {formatCurrency(account.balance)}
                  </span>
                </div>
              </div>
            ))}

            {accounts.length > 5 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full py-2 text-center text-xs text-gray-500 dark:text-slate-400 hover:text-primary-500 transition-colors"
              >
                {expanded
                  ? id
                    ? "Tampilkan lebih sedikit"
                    : "Show less"
                  : id
                  ? "Tampilkan semua"
                  : "Show all"}
              </button>
            )}
          </>
        )}

        {accounts.length > 0 && (
          <div className="flex justify-between items-center bg-white/50 dark:bg-white/5 rounded-xl p-4 mt-auto border border-white/10 dark:border-white/10">
            <span className="text-sm font-bold text-gray-700 dark:text-white">
              Total {title}
            </span>
            <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white break-words text-right max-w-[55%]">
              {formatCurrency(total)}
            </span>
          </div>
        )}
      </div>

      {/* Pagination */}
      {accounts.length > 0 && totalPages > 1 && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={prev}
          onNext={next}
          onGoTo={setPage}
          itemLabel={id ? "akun" : "accounts"}
        />
      )}
    </div>
  );
};