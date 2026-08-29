import { useEffect, useCallback, useRef } from "react";
import { motion, type Variants } from "framer-motion";
import type { LedgerQueryParams } from "../types/ledger";
import { useLedger } from "../hooks/useLedger";
import { useLanguage } from "../hooks/useLanguage";
import { tx } from "../i18n/tx";
import { LedgerFilter } from "../components/ledger/LedgerFilter";
import { LedgerTable } from "../components/ledger/LedgerTable";
import { AppShell } from "../components/AppShell";
import { ScrollReveal } from "../components/ScrollReveal";
import { BookOpen, AlertCircle, RefreshCw } from "lucide-react";

const letterContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.3 },
  },
};
const letterVariants: Variants = {
  hidden: { y: 40, opacity: 0, rotateX: -90 },
  visible: {
    y: 0,
    opacity: 1,
    rotateX: 0,
    transition: { type: "spring", stiffness: 200, damping: 18 },
  },
};

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
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ── Page Header ── */}
        <ScrollReveal direction="left">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-primary-500/10 text-primary-500">
              <BookOpen size={20} />
            </div>
            <div>
              <motion.h1
                variants={letterContainerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.5 }}
                className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center flex-wrap"
                style={{ perspective: "600px" }}
              >
                {tx(language, "General Ledger", "Buku Besar").split("").map((char, i) => (
                  <motion.span
                    key={i}
                    variants={letterVariants}
                    className="inline-block"
                    style={{ transformOrigin: "bottom center" }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
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
    </AppShell>
  );
}
