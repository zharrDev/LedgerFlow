import { useEffect, useCallback, useRef } from "react";
import { motion, type Variants } from "framer-motion";
import type { LedgerQueryParams } from "../types/ledger";
import { useLedger } from "../hooks/useLedger";
import { LedgerFilter } from "../components/ledger/LedgerFilter";
import { LedgerTable } from "../components/ledger/LedgerTable";
import { AppShell } from "../components/AppShell";
import { BookOpen, AlertCircle, RefreshCw } from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};
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
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8"
      >
        {/* ── Page Header ── */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-primary-500/10 text-primary-500">
              <BookOpen size={20} />
            </div>
            <div>
              <motion.h1
                variants={letterContainerVariants}
                initial="hidden"
                animate="visible"
                className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center flex-wrap"
                style={{ perspective: "600px" }}
              >
                {"Buku Besar".split("").map((char, i) => (
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
                Mutasi dan saldo berjalan per akun dari transaksi yang sudah
                di-posting
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Reference data error ── */}
        {refError && (
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400"
          >
            <AlertCircle size={16} className="shrink-0" />
            {refError}
            <button
              type="button"
              onClick={fetchRefData}
              className="ml-auto text-xs underline flex items-center gap-1"
            >
              <RefreshCw size={12} /> Coba Lagi
            </button>
          </motion.div>
        )}

        {/* ── Filter ── */}
        <motion.div variants={itemVariants}>
          <LedgerFilter
            accounts={accounts}
            periods={periods}
            refLoading={refLoading}
            ledgerLoading={ledgerLoading}
            onSubmit={handleSubmit}
          />
        </motion.div>

        {/* ── Result ── */}
        <motion.div variants={itemVariants}>
          <LedgerTable
            result={result}
            loading={ledgerLoading}
            error={ledgerError}
            onRetry={handleRetry}
          />
        </motion.div>
      </motion.div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AppShell>
  );
}
