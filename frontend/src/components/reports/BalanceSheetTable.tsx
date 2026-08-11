import { useState } from "react";
import { motion } from "framer-motion";
import { formatCurrency } from "../../utils/currency";
import type { BalanceSheetAccount } from "../../types/reports";
import { usePagination } from "../../hooks/usePagination";
import { TablePagination } from "../TablePagination";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

interface BalanceSheetTableProps {
  title: string;
  accounts: BalanceSheetAccount[];
  total: number;
  colorClass: string; // contoh: "text-emerald-600 dark:text-emerald-400"
  accentColor?: string; // opsional untuk bg header, contoh: "from-emerald-500 to-teal-500"
  emptyMessage?: string;
}

export const BalanceSheetTable = ({
  title,
  accounts,
  total,
  colorClass,
  accentColor = "from-indigo-500 to-violet-600",
  emptyMessage = "Tidak ada data",
}: BalanceSheetTableProps) => {
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
  // Filter untuk tampilan mobile: hanya tampilkan 3 data pertama secara default, lalu expand
  const displayItems = pageItems; // sudah dipaginasi

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      {/* Header dengan gradient modern */}
      <div
        className={`px-5 sm:px-6 py-4 bg-gradient-to-r ${accentColor} text-white flex items-center justify-between`}
      >
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
        <FileText size={16} className="opacity-60" />
      </div>

      {/* Tampilan Desktop (table) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                Kode
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                Nama Akun
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                Saldo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {accounts.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-10 text-center text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              displayItems.map((account, idx) => (
                <motion.tr
                  key={account.account_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-700 dark:text-slate-200">
                    {account.account_code}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-800 dark:text-slate-300">
                    {account.account_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold tabular-nums text-gray-900 dark:text-white">
                    {formatCurrency(account.balance)}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-slate-800/30 border-t border-gray-200 dark:border-slate-700">
            <tr>
              <td
                colSpan={2}
                className="px-6 py-4 text-sm font-bold text-gray-800 dark:text-white"
              >
                Total {title}
              </td>
              <td
                className={`px-6 py-4 text-sm font-bold text-right ${colorClass}`}
              >
                {formatCurrency(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Tampilan Mobile (card list) */}
      <div className="sm:hidden p-4 space-y-3">
        {accounts.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            {emptyMessage}
          </div>
        ) : (
          <>
            {displayItems.map((account, idx) => (
              <motion.div
                key={account.account_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-gray-50 dark:bg-slate-800/40 rounded-xl p-4 border border-gray-200 dark:border-slate-700/50"
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
              </motion.div>
            ))}

            {/* Tombol Expand jika data melebihi batas tertentu (opsional) */}
            {accounts.length > 5 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full py-2 text-center text-xs text-gray-500 dark:text-slate-400 hover:text-indigo-500 transition-colors"
              >
                {expanded ? "Tampilkan lebih sedikit" : "Tampilkan semua"}
              </button>
            )}
          </>
        )}

        {/* Total di Mobile */}
        {accounts.length > 0 && (
          <div className="flex justify-between items-center bg-gradient-to-r from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-800/60 rounded-xl p-4 mt-3 border border-gray-200 dark:border-slate-700/50">
            <span className="text-sm font-bold text-gray-700 dark:text-white">
              Total {title}
            </span>
            <span className={`text-sm font-bold tabular-nums break-words text-right max-w-[55%] ${colorClass}`}>
              {formatCurrency(total)}
            </span>
          </div>
        )}
      </div>

      {/* Pagination (desktop & mobile) */}
      {accounts.length > 0 && totalPages > 1 && (
        <div className="px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-slate-700/50 bg-white dark:bg-slate-900">
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
            itemLabel="akun"
          />
        </div>
      )}
    </motion.div>
  );
};
