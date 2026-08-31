import type {
  LedgerResult,
  LedgerLine,
  NormalBalance,
} from "../../types/ledger";
import { useLanguage } from "../../hooks/useLanguage";
import { tx } from "../../i18n/tx";
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

/** Label sisi saldo berdasarkan normal_balance akun (bukan asumsi "positif = Debit"). */
function balanceSideLabel(
  normalBalance: NormalBalance,
  balance: number,
  language: "en" | "id",
  withNormalHint = false,
): string {
  const onNormalSide = balance >= 0;
  const side = onNormalSide
    ? normalBalance
    : normalBalance === "Debit"
      ? tx(language, "Credit", "Kredit")
      : tx(language, "Debit", "Debit");
  if (!withNormalHint) return side;
  return onNormalSide ? `${side} (${tx(language, "normal", "normal")})` : `${side} (${tx(language, "reversed", "terbalik")})`;
}

/** Huruf sisi saldo (D/K) sesuai normal balance akun, bukan asumsi "positif = Debit". */
function balanceSideLetter(
  normalBalance: NormalBalance,
  balance: number,
): "D" | "K" {
  const onNormalSide = balance >= 0;
  const side = onNormalSide
    ? normalBalance
    : normalBalance === "Debit"
      ? "Kredit"
      : "Debit";
  return side === "Debit" ? "D" : "K";
}

const HEADERS_KEYS = [
  "date",
  "journalNo",
  "description",
  "debit",
  "credit",
  "balance",
] as const;

export function LedgerTable({
  result,
  loading,
  error,
  onRetry,
}: LedgerTableProps) {
  const { language } = useLanguage();
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
        <span className="text-sm">{tx(language, "Loading ledger...", "Memuat buku besar...")}</span>
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
          {tx(language, "Try Again", "Coba Lagi")}
        </button>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-md py-20 flex flex-col items-center gap-3">
        <BookOpen size={40} className="text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400">
          {tx(language, "Select an account and period to view the ledger", "Pilih akun dan periode untuk melihat buku besar")}
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
        language={language}
      />

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label={tx(language, "Opening Balance", "Saldo Awal")}
          value={formatIDRCompact(Math.abs(openingBalance))}
          sub={balanceSideLabel(account.normalBalance, openingBalance, language)}
          colorClass="text-gray-500 dark:text-gray-400"
        />
        <StatCard
          label={tx(language, "Total Debit", "Total Debit")}
          value={formatIDRCompact(totalDebit)}
          colorClass="text-primary-600 dark:text-primary-400"
        />
        <StatCard
          label={tx(language, "Total Credit", "Total Kredit")}
          value={formatIDRCompact(totalCredit)}
          colorClass="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label={tx(language, "Closing Balance", "Saldo Akhir")}
          value={formatIDRCompact(Math.abs(closingBalance))}
          sub={balanceSideLabel(account.normalBalance, closingBalance, language, true)}
          colorClass="text-primary-600 dark:text-primary-400"
        />
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-md overflow-hidden">
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-800/50">
                {HEADERS_KEYS.map((key, i) => {
                  const headerLabels: Record<string, string> = {
                    date: tx(language, "Date", "Tanggal"),
                    journalNo: tx(language, "Journal No.", "No. Jurnal"),
                    description: tx(language, "Description", "Keterangan"),
                    debit: tx(language, "Debit", "Debit"),
                    credit: tx(language, "Credit", "Kredit"),
                    balance: tx(language, "Balance", "Saldo"),
                  };
                  const h = headerLabels[key];
                  const minW =
                    key === "date"
                      ? "min-w-[100px]"
                      : key === "journalNo"
                        ? "min-w-[130px]"
                        : key === "description"
                          ? "min-w-[220px]"
                          : key === "debit" || key === "credit"
                            ? "min-w-[150px]"
                            : "min-w-[180px]";
                  return (
                    <th
                      key={key}
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
              <OpeningRow
                balance={openingBalance}
                date={startDate}
                normalBalance={account.normalBalance}
                language={language}
              />

              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    {tx(language, "No transactions in this period", "Tidak ada transaksi pada periode ini")}
                  </td>
                </tr>
              ) : (
                pageLines.map((line) => (
                  <LedgerRow
                    key={line.id}
                    line={line}
                    normalBalance={account.normalBalance}
                    language={language}
                  />
                ))
              )}
            </tbody>
            <tfoot>
              <ClosingRow
                balance={closingBalance}
                totalDebit={totalDebit}
                totalCredit={totalCredit}
                normalBalance={account.normalBalance}
                language={language}
              />
            </tfoot>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-800/50">
          {/* Opening balance mobile */}
          <div className="p-3 bg-gray-50/50 dark:bg-gray-800/20">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 italic">
              {tx(language, "Opening Balance", "Saldo Awal")}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-400">{formatDateShort(startDate, language)}</span>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 tabular-nums">
                {Math.abs(openingBalance) > 0.005 ? formatIDR(Math.abs(openingBalance)) : "—"}
                {Math.abs(openingBalance) > 0.005 && (
                  <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500 ml-1">
                    {balanceSideLetter(account.normalBalance, openingBalance)}
                  </span>
                )}
              </span>
            </div>
          </div>

          {lines.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              {tx(language, "No transactions in this period", "Tidak ada transaksi pada periode ini")}
            </div>
          ) : (
            pageLines.map((line) => (
              <LedgerMobileCard
                key={line.id}
                line={line}
                normalBalance={account.normalBalance}
                language={language}
              />
            ))
          )}

          {/* Closing mobile */}
          <div className="p-3 bg-gray-50/50 dark:bg-gray-800/30">
            <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {tx(language, "Total / Closing Balance", "Total / Saldo Akhir")}
            </p>
            <div className="flex items-center justify-between gap-2 mt-1">
              <div className="flex items-center gap-3">
                <span className="text-xs text-primary-700 dark:text-primary-400 tabular-nums">D: {formatIDR(totalDebit)}</span>
                <span className="text-xs text-emerald-700 dark:text-emerald-400 tabular-nums">C: {formatIDR(totalCredit)}</span>
              </div>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
                {formatIDR(Math.abs(closingBalance))}
                {closingBalance !== 0 && (
                  <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500 ml-1">
                    {balanceSideLetter(account.normalBalance, closingBalance)}
                  </span>
                )}
              </span>
            </div>
          </div>
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
            itemLabel={tx(language, "transactions", "transaksi")}
          />
        )}

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col sm:flex-row sm:justify-between gap-1 sm:items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {lines.length} {tx(language, "transactions", "transaksi")} · {formatDate(startDate, language)} –{" "}
            {formatDate(endDate, language)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {tx(language, "Normal balance:", "Saldo normal:")}{" "}
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
  language,
}: {
  account: LedgerResult["account"];
  period?: string;
  startDate: string;
  endDate: string;
  language: "en" | "id";
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
                {tx(language, "Period:", "Periode:")}{" "}
                <span className="text-gray-600 dark:text-gray-300">
                  {period}
                </span>
              </>
            ) : (
              <>
                {tx(language, "Range:", "Rentang:")}{" "}
                <span className="text-gray-600 dark:text-gray-300">
                  {formatDate(startDate, language)} — {formatDate(endDate, language)}
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
            {tx(language, "Normal Balance:", "Saldo Normal:")} {account.normalBalance}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── OpeningRow ───────────────────────────────────────────────────────────────

function OpeningRow({
  balance,
  date,
  normalBalance,
  language,
}: {
  balance: number;
  date: string;
  normalBalance: NormalBalance;
  language: "en" | "id";
}) {
  // Saldo awal di kolom Debit/Kredit sesuai sisi normal akun
  // (positif = sisi normal, negatif = sisi berlawanan).
  const abs = Math.abs(balance);
  const onDebitSide =
    normalBalance === "Debit" ? balance >= 0 : balance < 0;
  const debit = abs > 0.005 && onDebitSide ? abs : 0;
  const credit = abs > 0.005 && !onDebitSide ? abs : 0;

  return (
    <tr className="bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-800/50">
      <td className="px-4 py-2.5 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
        {formatDateShort(date, language)}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap" />
      <td className="px-4 py-2.5">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 italic">
          {tx(language, "Opening Balance", "Saldo Awal")}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        {debit > 0 ? (
          <span className="text-sm font-medium text-primary-700 dark:text-primary-400 tabular-nums">
            {formatIDR(debit)}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        {credit > 0 ? (
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">
            {formatIDR(credit)}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 tabular-nums">
          {abs > 0.005 ? formatIDR(abs) : "—"}
        </span>
      </td>
    </tr>
  );
}

// ─── LedgerRow ────────────────────────────────────────────────────────────────

function LedgerRow({
  line,
  normalBalance,
  language,
}: {
  line: LedgerLine;
  normalBalance: NormalBalance;
  language: "en" | "id";
}) {
  // Backend: saldo positif = sesuai sisi normal akun
  const isNormalSide = line.balance >= 0;
  const balanceColorCls = isNormalSide
    ? "text-gray-800 dark:text-gray-200"
    : "text-amber-600 dark:text-amber-400";

  return (
    <tr className="hover:bg-primary-50/30 dark:hover:bg-white/5 transition-colors">
      <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 tabular-nums whitespace-nowrap">
        {formatDateShort(line.date, language)}
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
              {balanceSideLetter(normalBalance, line.balance)}
            </span>
          )}
        </span>
      </td>
    </tr>
  );
}

// ─── Mobile Card ──────────────────────────────────────────────────────────────

function LedgerMobileCard({
  line,
  normalBalance,
  language,
}: {
  line: LedgerLine;
  normalBalance: NormalBalance;
  language: "en" | "id";
}) {
  const isNormalSide = line.balance >= 0;
  const balanceColorCls = isNormalSide
    ? "text-gray-800 dark:text-gray-200"
    : "text-amber-600 dark:text-amber-400";

  return (
    <div className="p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <span className="font-mono text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-1.5 py-0.5 rounded-md border border-primary-200 dark:border-primary-500/20">
            {line.journalNumber}
          </span>
          <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5 line-clamp-1">{line.description}</p>
        </div>
        <span className="text-xs text-gray-400 tabular-nums shrink-0">{formatDateShort(line.date, language)}</span>
      </div>
      <div className="flex items-center justify-between gap-2 mt-1.5">
        <div className="flex items-center gap-2">
          <span className={`text-xs tabular-nums ${line.debit > 0 ? "text-primary-700 dark:text-primary-400 font-medium" : "text-gray-300 dark:text-gray-600"}`}>
            D: {line.debit > 0 ? formatIDR(line.debit) : "—"}
          </span>
          <span className={`text-xs tabular-nums ${line.credit > 0 ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-gray-300 dark:text-gray-600"}`}>
            C: {line.credit > 0 ? formatIDR(line.credit) : "—"}
          </span>
        </div>
        <span className={`text-xs font-medium tabular-nums ${balanceColorCls}`}>
          {formatIDR(Math.abs(line.balance))}
          {line.balance !== 0 && (
            <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500 ml-0.5">
              {balanceSideLetter(normalBalance, line.balance)}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

// ─── ClosingRow ───────────────────────────────────────────────────────────────

function ClosingRow({
  balance,
  totalDebit,
  totalCredit,
  normalBalance,
  language,
}: {
  balance: number;
  totalDebit: number;
  totalCredit: number;
  normalBalance: NormalBalance;
  language: "en" | "id";
}) {
  return (
    <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
      <td
        colSpan={3}
        className="px-4 py-2.5 text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider"
      >
        {tx(language, "Total / Closing Balance", "Total / Saldo Akhir")}
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
              {balanceSideLetter(normalBalance, balance)}
            </span>
          )}
        </span>
      </td>
    </tr>
  );
}
