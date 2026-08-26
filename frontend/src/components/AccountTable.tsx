import { motion } from "framer-motion";
import type { Account } from "../types/account";
import {
  TypeBadge,
  StatusBadge,
  ActionButton,
  SpinnerIcon,
  IconEdit,
  IconDeactivate,
  IconActivate,
} from "./AccountShared";
import { TablePagination, type TablePaginationProps } from "./TablePagination";
import { useLanguage } from "../hooks/useLanguage";
import { tx } from "../i18n/tx";

interface AccountTableProps {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onEdit: (account: Account) => void;
  onToggleStatus: (account: Account) => void;
  toggling?: boolean;
  pagination?: TablePaginationProps;
}

export function AccountTable({
  accounts,
  loading,
  error,
  onRetry,
  onEdit,
  onToggleStatus,
  toggling,
  pagination,
}: AccountTableProps) {
  const { language } = useLanguage();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3 z-10">
        <SpinnerIcon className="w-6 h-6 animate-spin text-primary-500" />
        <p className="text-sm">{tx(language, "Loading accounts...", "Memuat akun...")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-red-500 text-sm mb-2">{error}</p>
        <button
          onClick={onRetry}
          className="text-primary-500 text-sm hover:underline"
        >
          {tx(language, "Try again", "Coba lagi")}
        </button>
      </div>
    );
  }

  return (
    // TIDAK ADA overflow-hidden di sini
    <div className="rounded-2xl bg-white/80 dark:bg-darkBg/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700/50 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700/50 top-0 z-1">
            <tr>
              {[
                tx(language, "Code", "Kode"),
                tx(language, "Account Name", "Nama Akun"),
                tx(language, "Type", "Tipe"),
                tx(language, "Normal Balance", "Saldo Normal"),
                tx(language, "Status", "Status"),
                tx(language, "Actions", "Aksi"),
              ].map((header) => (
                <th
                  key={header}
                  className="px-5 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a1 1 0 001-1V6a1 1 0 00-1-1H4a1 1 0 00-1 1v12a1 1 0 001 1z"
                        />
                      </svg>
                    </div>
                    <p>{tx(language, "No accounts found", "Tidak ada akun ditemukan")}</p>
                    <p className="text-xs">
                      {tx(language, "Create your first account to get started", "Buat akun pertama Anda untuk memulai")}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              accounts.map((account, idx) => (
                <motion.tr
                  key={account.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`hover:bg-primary-50/30 dark:hover:bg-white/5 transition-colors ${!account.isActive && "opacity-60"}`}
                >
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-gray-700 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                      {account.code}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-800 dark:text-white">
                    {account.name}
                  </td>
                  <td className="px-5 py-3">
                    <TypeBadge type={account.type} />
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium ${account.normalBalance === "Debit" ? "text-primary-600" : "text-emerald-600"}`}
                    >
                      {account.normalBalance}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge isActive={account.isActive} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <ActionButton
                        title={tx(language, "Edit", "Edit")}
                        onClick={() => onEdit(account)}
                        icon={<IconEdit />}
                      />
                      <ActionButton
                        title={account.isActive ? tx(language, "Deactivate", "Nonaktifkan") : tx(language, "Activate", "Aktifkan")}
                        onClick={() => onToggleStatus(account)}
                        danger={account.isActive}
                        icon={
                          account.isActive ? (
                            <IconDeactivate />
                          ) : (
                            <IconActivate />
                          )
                        }
                        disabled={toggling}
                      />
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination && (
        <TablePagination {...pagination} />
      )}
    </div>
  );
}
