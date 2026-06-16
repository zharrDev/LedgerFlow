import type {
  LedgerResult,
  LedgerLine,
  NormalBalance,
} from "../../types/ledger";
import {
  SpinnerIcon,
  formatIDR,
  formatIDRCompact,
  formatDate,
  formatDateShort,
  StatCard,
} from "./LedgerShared";
import { AlertCircle, BookOpen } from "lucide-react";
import { usePagination } from "../../hooks/usePagination";
import { TablePagination } from "../TablePagination";

interface LedgerTableProps {
  result: LedgerResult | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const HEADERS = [
  "Tanggal",
  "No. Jurnal",
  "Keterangan",
  "Debit",
  "Kredit",
  "Saldo",
] as const;

export function LedgerTable({
  result,
  loading,
  error,
  onRetry,
}: LedgerTableProps) {
  const {
    page,
    setPage,
    totalPages,
    pageItems: pageLines,
    totalItems,
    startIndex,
    endIndex,
    canPrev,
    canNext,
    next,
    prev,
  } = usePagination(result?.lines ?? [], 5);

  if (loading) {
    return (
      <div className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-md py-20 flex flex-col items-center gap-3 text-gray-400">
        <SpinnerIcon className="w-6 h-6" />
        <span className="text-sm">Memuat buku besar...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-md py-20 flex flex-col items-center gap-3">
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
    );
  }

  if (!result) {
    return (
      <div className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-md py-20 flex flex-col items-center gap-3">
        <BookOpen size={40} className="text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400">
          Pilih akun dan periode untuk melihat buku besar
        </p>
      </div>
    );
  }

  const {
    account,
    lines,
    openingBalance,
    closingBalance,
    totalDebit,
    totalCredit,
    startDate,
    endDate,
    period,
  } = result;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Account header ── */}
      <AccountHeader
        account={account}
        period={period?.name}
        startDate={startDate}
        endDate={endDate}
      />

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Saldo Awal"
          value={formatIDRCompact(openingBalance)}
          sub={openingBalance >= 0 ? "Debit" : "Kredit"}
          colorClass="text-gray-500 dark:text-gray-400"
        />
        <StatCard
          label="Total Debit"
          value={formatIDRCompact(totalDebit)}
          colorClass="text-primary-600 dark:text-primary-400"
        />
        <StatCard
          label="Total Kredit"
          value={formatIDRCompact(totalCredit)}
          colorClass="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Saldo Akhir"
          value={formatIDRCompact(closingBalance)}
          sub={
            account.normalBalance === "Debit"
              ? closingBalance >= 0
                ? "Debit (normal)"
                : "Kredit (terbalik)"
              : closingBalance >= 0
                ? "Debit (terbalik)"
                : "Kredit (normal)"
          }
          colorClass="text-primary-600 dark:text-primary-400"
        />
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-800/50">
                {HEADERS.map((h, i) => {
                  const minW =
                    h === "Tanggal"
                      ? "min-w-[100px]"
                      : h === "No. Jurnal"
                        ? "min-w-[130px]"
                        : h === "Keterangan"
                          ? "min-w-[220px]"
                          : h === "Debit" || h === "Kredit"
                            ? "min-w-[150px]"
                            : "min-w-[180px]";
                  return (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${minW} ${
                        i >= 3 ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {/* Opening balance row */}
              <OpeningRow balance={openingBalance} date={startDate} />

              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    Tidak ada transaksi pada periode ini
                  </td>
                </tr>
              ) : (
                pageLines.map((line) => (
                  <LedgerRow
                    key={line.id}
                    line={line}
                    normalBalance={account.normalBalance}
                  />
                ))
              )}
            </tbody>
            <tfoot>
              <ClosingRow
                balance={closingBalance}
                totalDebit={totalDebit}
                totalCredit={totalCredit}
              />
            </tfoot>
          </table>
        </div>

        {/* Pagination */}
        {lines.length > 0 && (
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
            itemLabel="transaksi"
          />
        )}

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col sm:flex-row sm:justify-between gap-1 sm:items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {lines.length} transaksi · {formatDate(startDate)} –{" "}
            {formatDate(endDate)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Saldo normal:{" "}
            <span
              className={`font-medium ${account.normalBalance === "Debit" ? "text-primary-600 dark:text-primary-400" : "text-emerald-600 dark:text-emerald-400"}`}
            >
              {account.normalBalance}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── AccountHeader ────────────────────────────────────────────────────────────

function AccountHeader({
  account,
  period,
  startDate,
  endDate,
}: {
  account: LedgerResult["account"];
  period?: string;
  startDate: string;
  endDate: string;
}) {
  return (
    <div className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-md px-5 py-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="font-mono text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-1.5 py-0.5 rounded-md border border-primary-200 dark:border-primary-500/20">
              {account.code}
            </span>
            <h2 className="text-base font-medium text-gray-800 dark:text-gray-200">
              {account.name}
            </h2>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {period ? (
              <>
                Periode:{" "}
                <span className="text-gray-600 dark:text-gray-300">
                  {period}
                </span>
              </>
            ) : (
              <>
                Rentang:{" "}
                <span className="text-gray-600 dark:text-gray-300">
                  {formatDate(startDate)} — {formatDate(endDate)}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
              account.normalBalance === "Debit"
                ? "bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-500/20"
                : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
            }`}
          >
            Saldo Normal: {account.normalBalance}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── OpeningRow ───────────────────────────────────────────────────────────────

function OpeningRow({ balance, date }: { balance: number; date: string }) {
  return (
    <tr className="bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-800/50">
      <td className="px-4 py-2.5 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
        {formatDateShort(date)}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap" />
      <td className="px-4 py-2.5">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 italic">
          Saldo Awal
        </span>
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap" />
      <td className="px-4 py-2.5 whitespace-nowrap" />
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 tabular-nums">
          {formatIDR(balance)}
        </span>
      </td>
    </tr>
  );
}

// ─── LedgerRow ────────────────────────────────────────────────────────────────

function LedgerRow({
  line,
  normalBalance,
}: {
  line: LedgerLine;
  normalBalance: NormalBalance;
}) {
  const isNormalSide =
    normalBalance === "Debit" ? line.balance >= 0 : line.balance <= 0;
  const balanceColorCls = isNormalSide
    ? "text-gray-800 dark:text-gray-200"
    : "text-amber-600 dark:text-amber-400";

  return (
    <tr className="hover:bg-primary-50/30 dark:hover:bg-white/5 transition-colors">
      <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 tabular-nums whitespace-nowrap">
        {formatDateShort(line.date)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="font-mono text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-1.5 py-0.5 rounded-md border border-primary-200 dark:border-primary-500/20">
          {line.journalNumber}
        </span>
      </td>
      <td className="px-4 py-3 min-w-[200px]">
        <span className="text-sm text-gray-800 dark:text-gray-200 line-clamp-1">
          {line.description}
        </span>
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {line.debit > 0 ? (
          <span className="text-sm font-medium text-primary-700 dark:text-primary-400 tabular-nums">
            {formatIDR(line.debit)}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {line.credit > 0 ? (
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">
            {formatIDR(line.credit)}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <span className={`text-sm font-medium tabular-nums ${balanceColorCls}`}>
          {formatIDR(Math.abs(line.balance))}
          {line.balance !== 0 && (
            <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500 ml-1">
              {line.balance > 0 ? "D" : "K"}
            </span>
          )}
        </span>
      </td>
    </tr>
  );
}

// ─── ClosingRow ───────────────────────────────────────────────────────────────

function ClosingRow({
  balance,
  totalDebit,
  totalCredit,
}: {
  balance: number;
  totalDebit: number;
  totalCredit: number;
}) {
  return (
    <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
      <td
        colSpan={3}
        className="px-4 py-2.5 text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider"
      >
        Total / Saldo Akhir
      </td>
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        <span className="text-sm font-semibold text-primary-700 dark:text-primary-400 tabular-nums">
          {formatIDR(totalDebit)}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
          {formatIDR(totalCredit)}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
          {formatIDR(Math.abs(balance))}
          {balance !== 0 && (
            <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500 ml-1">
              {balance > 0 ? "D" : "K"}
            </span>
          )}
        </span>
      </td>
    </tr>
  );
}
