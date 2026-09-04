import { useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import type { LedgerQueryParams } from "../types/ledger";
import { useLedger } from "../hooks/useLedger";
import { useLanguage } from "../hooks/useLanguage";
import { tx } from "../i18n/tx";
import { LedgerFilter } from "../components/ledger/LedgerFilter";
import { LedgerTable } from "../components/ledger/LedgerTable";

import { ScrollReveal } from "../components/ScrollReveal";
import { BookOpen, AlertCircle, RefreshCw } from "lucide-react";

export default function BukuBesarPage() {
  const { language } = useLanguage();
  const {
    accounts,
    periods,
    refLoading,
    refError,
    fetchRefData,
    result,
    ledgerLoading,
    ledgerError,
    fetchLedger,
  } = useLedger();

  const lastParamsRef = useRef<LedgerQueryParams | null>(null);

  useEffect(() => {
    fetchRefData();
  }, [fetchRefData]);

  const handleSubmit = useCallback(
    (params: LedgerQueryParams) => {
      lastParamsRef.current = params;
      fetchLedger(params);
    },
    [fetchLedger],
  );

  const handleRetry = useCallback(() => {
    if (lastParamsRef.current) fetchLedger(lastParamsRef.current);
  }, [fetchLedger]);

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ── Page Header ── */}
        <ScrollReveal direction="left">
          <div className="flex items-center gap-2.5 mb-1 min-w-0">
            <div className="p-2 rounded-xl bg-primary-500/10 text-primary-500">
              <BookOpen size={20} />
            </div>
            <div className="min-w-0">
              <motion.h1
                key={`${language}-${tx(language, "General Ledger", "Buku Besar")}`}
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight min-w-0 break-words"
              >
                {tx(language, "General Ledger", "Buku Besar")}
              </motion.h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {tx(language, "Running balance and mutations per account from posted transactions", "Mutasi dan saldo berjalan per akun dari transaksi yang sudah di-posting")}
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Reference data error ── */}
        {refError && (
          <ScrollReveal
            direction="fade"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400"
          >
            <AlertCircle size={16} className="shrink-0" />
            {refError}
            <button
              type="button"
              onClick={fetchRefData}
              className="ml-auto text-xs underline flex items-center gap-1"
            >
              <RefreshCw size={12} /> {tx(language, "Try Again", "Coba Lagi")}
            </button>
          </ScrollReveal>
        )}

        {/* ── Filter ── */}
        <ScrollReveal direction="left">
          <LedgerFilter
            accounts={accounts}
            periods={periods}
            refLoading={refLoading}
            ledgerLoading={ledgerLoading}
            onSubmit={handleSubmit}
          />
        </ScrollReveal>

        {/* ── Result ── */}
        <ScrollReveal direction="up">
          <LedgerTable
            result={result}
            loading={ledgerLoading}
            error={ledgerError}
            onRetry={handleRetry}
          />
        </ScrollReveal>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
