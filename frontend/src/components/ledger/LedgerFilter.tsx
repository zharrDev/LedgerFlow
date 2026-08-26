import { useState, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type {
  AccountOption,
  Period,
  LedgerQueryParams,
  DateRangeMode,
} from "../../types/ledger";
import { useLanguage } from "../../hooks/useLanguage";
import { tx } from "../../i18n/tx";
import { SpinnerIcon, IconCalendar, IconRefresh } from "./LedgerShared";
import { HoverDropdown } from "../HoverDropdown";

interface LedgerFilterProps {
  accounts: AccountOption[];
  periods: Period[];
  refLoading: boolean;
  ledgerLoading: boolean;
  onSubmit: (params: LedgerQueryParams) => void;
}

export function LedgerFilter({
  accounts,
  periods,
  refLoading,
  ledgerLoading,
  onSubmit,
}: LedgerFilterProps) {
  const [accountId, setAccountId] = useState<string>("");
  const [mode, setMode] = useState<DateRangeMode>("custom");
  const [periodId, setPeriodId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { language } = useLanguage();
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (periods.length === 0) return;
    setMode("period");
    const active = periods.find((p) => p.isActive);
    if (active && !periodId) setPeriodId(String(active.id));
  }, [periods, periodId]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!accountId) e.accountId = tx(language, "Select an account first", "Pilih akun terlebih dahulu");
    if (mode === "period" && !periodId) e.periodId = tx(language, "Select a period", "Pilih periode");
    if (mode === "custom") {
      if (!startDate) e.startDate = tx(language, "Start date is required", "Tanggal awal wajib diisi");
      if (!endDate) e.endDate = tx(language, "End date is required", "Tanggal akhir wajib diisi");
      if (startDate && endDate && startDate > endDate)
        e.endDate = tx(language, "End date must be after start date", "Tanggal akhir harus setelah tanggal awal");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    const params: LedgerQueryParams = { accountId };
    if (mode === "period") {
      params.periodId = periodId;
    } else {
      params.startDate = startDate;
      params.endDate = endDate;
    }
    onSubmit(params);
  };

  if (refLoading) {
    return (
      <div className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-md p-8 flex items-center justify-center gap-3 text-gray-400">
        <SpinnerIcon className="w-5 h-5" />
        <span className="text-sm">{tx(language, "Loading reference data...", "Memuat data referensi...")}</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-md p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
            <IconCalendar size={14} />
          </div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            {tx(language, "Ledger Filter", "Filter Buku Besar")}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
          {/* Account selector */}
          <div className="sm:col-span-1">
            <label className={labelCls}>
              {tx(language, "Account", "Akun")} <Required />
            </label>
            <HoverDropdown
              value={accountId}
              onChange={(v) => {
                setAccountId(v);
                setErrors((prev) => ({ ...prev, accountId: "" }));
              }}
              fullWidth
              placeholder={tx(language, "— Select Account —", "— Pilih Akun —")}
              minWidth={260}
              options={[
                { value: "", label: tx(language, "— Select Account —", "— Pilih Akun —") },
                ...accounts.map((a) => ({
                  value: String(a.id),
                  label: `${a.code} — ${a.name}`,
                })),
              ]}
            />
            {errors.accountId && <ErrorMsg>{errors.accountId}</ErrorMsg>}
          </div>

          {/* Date range mode + controls */}
          <div>
            <label className={labelCls}>
              {tx(language, "Time Range", "Rentang Waktu")} <Required />
            </label>

            {/* Mode toggle */}
            <div className="flex p-0.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-2">
              {(periods.length > 0
                ? (["period", "custom"] as DateRangeMode[])
                : (["custom"] as DateRangeMode[])
              ).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 py-1.5 text-xs rounded-lg transition-all duration-150 ${
                    mode === m
                      ? "bg-white dark:bg-darkCard shadow-sm font-medium text-gray-800 dark:text-gray-200"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  {m === "period" ? tx(language, "Per Period", "Per Periode") : tx(language, "Custom Range", "Rentang Kustom")}
                </button>
              ))}
            </div>

            {/* Period select */}
            {mode === "period" && (
              <div>
                <HoverDropdown
                  value={periodId}
                  onChange={(v) => {
                    setPeriodId(v);
                    setErrors((prev) => ({ ...prev, periodId: "" }));
                  }}
                  fullWidth
                  placeholder={tx(language, "— Select Period —", "— Pilih Periode —")}
                  minWidth={220}
                  options={[
                    { value: "", label: tx(language, "— Select Period —", "— Pilih Periode —") },
                    ...periods.map((p) => ({
                      value: String(p.id),
                      label: `${p.name}${p.isActive ? " ✦" : ""}`,
                    })),
                  ]}
                />
                {errors.periodId && <ErrorMsg>{errors.periodId}</ErrorMsg>}
              </div>
            )}

            {/* Custom date range */}
            {mode === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setStartDate(e.target.value);
                      setErrors((prev) => ({ ...prev, startDate: "" }));
                    }}
                    className={`${inputCls} ${errors.startDate ? errorRing : ""}`}
                  />
                  {errors.startDate && <ErrorMsg>{errors.startDate}</ErrorMsg>}
                </div>
                <div>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setEndDate(e.target.value);
                      setErrors((prev) => ({ ...prev, endDate: "" }));
                    }}
                    className={`${inputCls} ${errors.endDate ? errorRing : ""}`}
                  />
                  {errors.endDate && <ErrorMsg>{errors.endDate}</ErrorMsg>}
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={ledgerLoading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-60 disabled:cursor-default disabled:hover:scale-100 whitespace-nowrap"
            >
              {ledgerLoading ? (
                <SpinnerIcon className="w-4 h-4" />
              ) : (
                <IconRefresh size={14} />
              )}
              {tx(language, "Show", "Tampilkan")}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Required() {
  return <span className="text-rose-400 ml-0.5">*</span>;
}

function ErrorMsg({ children }: { children: string }) {
  return <p className="mt-1 text-[11px] text-rose-500">{children}</p>;
}

const labelCls =
  "block text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5";

const inputCls =
  "w-full px-2.5 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-darkBg text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition";

const errorRing =
  "border-rose-400 focus:ring-rose-500/40 focus:border-rose-400";
