import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import { useLanguage } from "../../hooks/useLanguage";

interface BalanceSheetStatusProps {
  isBalanced: boolean;
  totalAssets: number;
  totalLiabilitiesEquity: number;
}

/**
 * Status keseimbangan neraca — glass netral; warna semantik hanya pada
 * ikon badge kecil.
 */
export const BalanceSheetStatus = ({
  isBalanced,
  totalAssets,
  totalLiabilitiesEquity,
}: BalanceSheetStatusProps) => {
  const { language } = useLanguage();
  const id = language === "id";
  const difference = Math.abs(totalAssets - totalLiabilitiesEquity);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl p-5 sm:p-6 backdrop-blur-xl bg-white/60 dark:bg-darkCard/40 border border-white/20 dark:border-white/10 shadow-lg"
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-2.5 rounded-xl flex-shrink-0 mt-0.5 ${
            isBalanced
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
          }`}
        >
          {isBalanced ? (
            <CheckCircle2 className="w-6 h-6" />
          ) : (
            <AlertCircle className="w-6 h-6" />
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
            {isBalanced
              ? id
                ? "Neraca Seimbang"
                : "Balance Sheet Balanced"
              : id
              ? "Neraca Tidak Seimbang"
              : "Balance Sheet Unbalanced"}
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-gray-500 dark:text-gray-400">
                {id ? "Total Aset:" : "Total Assets:"}
              </span>
              <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                {formatCurrency(totalAssets)}
              </span>
            </div>

            <div className="flex justify-between gap-2">
              <span className="text-gray-500 dark:text-gray-400">
                {id
                  ? "Total Liabilitas + Ekuitas:"
                  : "Total Liabilities + Equity:"}
              </span>
              <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                {formatCurrency(totalLiabilitiesEquity)}
              </span>
            </div>

            {!isBalanced && difference > 0 && (
              <div className="flex justify-between gap-2 pt-2 border-t border-white/10 dark:border-white/5">
                <span
                  className={`font-medium ${
                    isBalanced
                      ? "text-gray-500 dark:text-gray-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {id ? "Selisih:" : "Difference:"}
                </span>
                <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {formatCurrency(difference)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};