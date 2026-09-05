import { motion } from "framer-motion";
import type { JournalEntry } from "../../types/journal";
import {
  StatusBadge,
  ActionButton,
  SpinnerIcon,
  IconArrowLeft,
  IconSend,
  IconTrash,
  IconVoid,
  formatIDR,
  formatDate,
} from "./JournalShared";
import { useLanguage } from "../../hooks/useLanguage";
import { tx } from "../../i18n/tx";

interface JournalDetailProps {
  entry: JournalEntry;
  posting: boolean;
  onBack: () => void;
  onPost: (entry: JournalEntry) => void;
  onDelete: (entry: JournalEntry) => void;
  onVoid?: (entry: JournalEntry) => void;
  /** Izin sesuai role (backend): post = owner/akuntan, delete & void = owner. */
  canPost?: boolean;
  canDelete?: boolean;
  canVoid?: boolean;
}

export function JournalDetail({
  entry,
  posting,
  onBack,
  onDelete,
  onPost,
  onVoid,
  canPost = true,
  canDelete = true,
  canVoid = false,
}: JournalDetailProps) {
  const { language } = useLanguage();
  const isDraft = entry.status === "draft";
  const isVoided = !!entry.voided_at;
  const isBalanced = Math.abs(entry.totalDebit - entry.totalCredit) < 0.005;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col gap-5 ${isVoided ? "opacity-90" : ""}`}
    >
      {/* Header card */}
      <div className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-md p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="font-mono text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-2 py-0.5 rounded-lg border border-primary-200 dark:border-primary-500/20">
                {entry.number}
              </span>
              <StatusBadge status={entry.status} voided={isVoided} />
            </div>
            <h2 className="text-base font-medium text-gray-800 dark:text-gray-200">
              {entry.description}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {tx(language, "Date: ", "Tanggal: ")}{formatDate(entry.date, language)} {tx(language, " · Created: ", " · Dibuat: ")}{" "}
              {formatDate(entry.createdAt, language)}
            </p>
          </div>

          <div className="flex gap-2">
            {isDraft && (
              <>
                {canPost && (
                  <button
                    type="button"
                    onClick={() => onPost(entry)}
                    disabled={posting || !isBalanced}
                    title={
                      !isBalanced
                        ? tx(language, "Entry is unbalanced — cannot post", "Entry tidak seimbang — tidak dapat diposting")
                        : tx(language, "Post to ledger", "Posting ke buku besar")
                    }
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl hover:shadow-lg hover:shadow-primary-500/25 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {posting ? (
                      <SpinnerIcon className="w-3.5 h-3.5" />
                    ) : (
                      <IconSend size={14} />
                    )}
                    {tx(language, "Post to Ledger", "Post ke Buku Besar")}
                  </button>
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
              <button
                type="button"
                onClick={() => onVoid(entry)}
                title={tx(language, "Void entry", "Void entry")}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
              >
                <IconVoid size={14} />
                {tx(language, "Void", "Void")}
              </button>
            )}
          </div>
        </div>

        {/* Voided banner — alasan pembatalan tetap tampil (audit trail) */}
        {isVoided && (
          <div className="mt-4 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-4 py-3">
            <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
              <IconVoid size={13} />
              {tx(language, "This entry is VOIDED and excluded from reports", "Entry ini sudah di-VOID dan tidak ikut terhitung di laporan")}
            </p>
            {entry.void_reason && (
              <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-400/80">
                {tx(language, "Reason: ", "Alasan: ")}
                {entry.void_reason}
              </p>
            )}
            {entry.voided_at && (
              <p className="mt-0.5 text-[11px] text-rose-500/70 dark:text-rose-400/60">
                {tx(language, "Voided on: ", "Di-void pada: ")}
                {formatDate(entry.voided_at, language)}
              </p>
            )}
          </div>
        )}

        {/* Summary chips */}
        <div className="flex gap-3 mt-4 flex-wrap">
          <Chip
            label={tx(language, "Total Debit", "Total Debit")}
            value={formatIDR(entry.totalDebit)}
            accent="primary"
          />
          <Chip
            label={tx(language, "Total Credit", "Total Kredit")}
            value={formatIDR(entry.totalCredit)}
            accent="emerald"
          />
          <Chip label={tx(language, "Lines", "Baris")} value={`${entry.lines?.length ?? 0} ${tx(language, "accounts", "akun")}`} />
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
              {tx(language, "Not Balanced", "Tidak Seimbang")}
            </span>
          )}
        </div>
      </div>

      {/* Lines table */}
      <div className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-md overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {tx(language, "Journal Lines", "Baris Jurnal")}
          </h3>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800/50">
                {[
                  "#",
                  tx(language, "Code", "Kode"),
                  tx(language, "Account Name", "Nama Akun"),
                  tx(language, "Description", "Keterangan"),
                  tx(language, "Debit", "Debit"),
                  tx(language, "Credit", "Kredit"),
                ].map((h, i) => {
                  const minW =
                    h === "#"
                      ? "min-w-[40px]"
                      : i === 1
                        ? "min-w-[100px]"
                        : i === 2
                          ? "min-w-[180px]"
                          : i === 3
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
                  {tx(language, "Total", "Total")}
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

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-800/50">
          {(entry.lines ?? []).map((line, idx) => {
            const isDebit = line.debit > 0;
            return (
              <div
                key={line.id ?? `${line.accountCode}-${idx}`}
                className="p-3"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-1.5 py-0.5 rounded-md border border-primary-200 dark:border-primary-500/20">
                      {line.accountCode}
                    </span>
                    <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5 truncate">{line.accountName}</p>
                  </div>
                  <span className="text-xs text-gray-300 dark:text-gray-600 tabular-nums shrink-0">#{idx + 1}</span>
                </div>
                {line.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 line-clamp-1">{line.description}</p>
                )}
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium tabular-nums ${isDebit ? "text-primary-700 dark:text-primary-400" : "text-gray-300 dark:text-gray-600"}`}>
                    D: {isDebit ? formatIDR(line.debit) : "—"}
                  </span>
                  <span className={`text-xs font-medium tabular-nums ${!isDebit ? "text-emerald-700 dark:text-emerald-400" : "text-gray-300 dark:text-gray-600"}`}>
                    C: {!isDebit ? formatIDR(line.credit) : "—"}
                  </span>
                </div>
              </div>
            );
          })}
          {/* Mobile total */}
          <div className="p-3 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {tx(language, "Total", "Total")}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-primary-700 dark:text-primary-400 tabular-nums">
                D: {formatIDR(entry.totalDebit)}
              </span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                C: {formatIDR(entry.totalCredit)}
              </span>
            </div>
          </div>
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
          {tx(language, "Back to List", "Kembali ke Daftar")}
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
