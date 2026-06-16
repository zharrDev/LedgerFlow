import { motion } from "framer-motion";
import type { JournalEntry } from "../../types/journal";
import {
  StatusBadge,
  ActionButton,
  SpinnerIcon,
  IconArrowLeft,
  IconSend,
  IconTrash,
  formatIDR,
  formatDate,
} from "./JournalShared";

interface JournalDetailProps {
  entry: JournalEntry;
  posting: boolean;
  onBack: () => void;
  onPost: (entry: JournalEntry) => void;
  onDelete: (entry: JournalEntry) => void;
}

export function JournalDetail({
  entry,
  posting,
  onBack,
  onDelete,
  onPost,
}: JournalDetailProps) {
  const isDraft = entry.status === "draft";
  const isBalanced = Math.abs(entry.totalDebit - entry.totalCredit) < 0.005;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5"
    >
      {/* Header card */}
      <div className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-md p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="font-mono text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-2 py-0.5 rounded-lg border border-primary-200 dark:border-primary-500/20">
                {entry.number}
              </span>
              <StatusBadge status={entry.status} />
            </div>
            <h2 className="text-base font-medium text-gray-800 dark:text-gray-200">
              {entry.description}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Tanggal: {formatDate(entry.date)} · Dibuat:{" "}
              {formatDate(entry.createdAt)}
            </p>
          </div>

          <div className="flex gap-2">
            {isDraft && (
              <>
                <button
                  type="button"
                  onClick={() => onPost(entry)}
                  disabled={posting || !isBalanced}
                  title={
                    !isBalanced
                      ? "Entry tidak seimbang — tidak dapat diposting"
                      : "Posting ke buku besar"
                  }
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl hover:shadow-lg hover:shadow-primary-500/25 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {posting ? (
                    <SpinnerIcon className="w-3.5 h-3.5" />
                  ) : (
                    <IconSend size={14} />
                  )}
                  Post ke Buku Besar
                </button>
                <ActionButton
                  title="Hapus draft"
                  onClick={() => onDelete(entry)}
                  icon={<IconTrash size={14} />}
                  variant="danger"
                />
              </>
            )}
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex gap-3 mt-4 flex-wrap">
          <Chip
            label="Total Debit"
            value={formatIDR(entry.totalDebit)}
            accent="primary"
          />
          <Chip
            label="Total Kredit"
            value={formatIDR(entry.totalCredit)}
            accent="emerald"
          />
          <Chip label="Baris" value={`${entry.lines?.length ?? 0} akun`} />
          {!isBalanced && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-medium">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
              Tidak Seimbang
            </span>
          )}
        </div>
      </div>

      {/* Lines table */}
      <div className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-md overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Baris Jurnal
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800/50">
                {[
                  "#",
                  "Kode",
                  "Nama Akun",
                  "Keterangan",
                  "Debit",
                  "Kredit",
                ].map((h, i) => {
                  const minW =
                    h === "#"
                      ? "min-w-[40px]"
                      : h === "Kode"
                        ? "min-w-[100px]"
                        : h === "Nama Akun"
                          ? "min-w-[180px]"
                          : h === "Keterangan"
                            ? "min-w-[200px]"
                            : "min-w-[150px]";
                  return (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50/50 dark:bg-gray-800/30 ${minW} ${
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
              {(entry.lines ?? []).map((line, idx) => {
                const isDebit = line.debit > 0;
                return (
                  <tr
                    key={line.id ?? `${line.accountCode}-${idx}`}
                    className="hover:bg-primary-50/30 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-gray-300 dark:text-gray-600 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-1.5 py-0.5 rounded-md border border-primary-200 dark:border-primary-500/20">
                        {line.accountCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                      {line.accountName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {line.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span
                        className={`text-sm tabular-nums font-medium ${isDebit ? "text-primary-700 dark:text-primary-400" : "text-gray-300 dark:text-gray-600"}`}
                      >
                        {isDebit ? formatIDR(line.debit) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span
                        className={`text-sm tabular-nums font-medium ${!isDebit ? "text-emerald-700 dark:text-emerald-400" : "text-gray-300 dark:text-gray-600"}`}
                      >
                        {!isDebit ? formatIDR(line.credit) : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                <td
                  colSpan={4}
                  className="px-4 py-3 text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider"
                >
                  Total
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-primary-700 dark:text-primary-400 tabular-nums whitespace-nowrap">
                  {formatIDR(entry.totalDebit)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                  {formatIDR(entry.totalCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Back */}
      <div className="pb-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <IconArrowLeft size={15} />
          Kembali ke Daftar
        </button>
      </div>
    </motion.div>
  );
}

// ─── Chip ────────────────────────────────────────────────────────────
function Chip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "primary" | "emerald";
}) {
  const cls =
    accent === "primary"
      ? "bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/20 text-primary-700 dark:text-primary-400"
      : accent === "emerald"
        ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
        : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400";
  return (
    <div className={`flex flex-col px-3 py-1.5 rounded-xl border ${cls}`}>
      <span className="text-[10px] uppercase tracking-wider opacity-70">
        {label}
      </span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}
