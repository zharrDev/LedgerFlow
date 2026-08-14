import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { formatCurrency } from "../../utils/currency";

interface BalanceSheetStatusProps {
  isBalanced: boolean;
  totalAssets: number;
  totalLiabilitiesEquity: number;
}

export const BalanceSheetStatus = ({
  isBalanced,
  totalAssets,
  totalLiabilitiesEquity,
}: BalanceSheetStatusProps) => {
  const difference = Math.abs(totalAssets - totalLiabilitiesEquity);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl p-6 border-2 backdrop-blur-lg ${
        isBalanced
          ? "bg-emerald-500/10 dark:bg-emerald-500/10 border-emerald-500"
          : "bg-rose-500/10 dark:bg-rose-500/10 border-rose-500"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        {isBalanced ? (
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
        ) : (
          <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-1" />
        )}

        {/* Content */}
        <div className="flex-1">
          <h3
            className={`text-lg font-bold mb-2 ${
              isBalanced
                ? "text-emerald-800 dark:text-emerald-200"
                : "text-rose-800 dark:text-rose-200"
            }`}
          >
            {isBalanced ? "✓ Neraca Seimbang" : "✕ Neraca Tidak Seimbang"}
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span
                className={
                  isBalanced
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-rose-700 dark:text-rose-300"
                }
              >
                Total Aset:
              </span>
              <span
                className={`font-semibold ${isBalanced ? "text-emerald-900 dark:text-emerald-100" : "text-rose-900 dark:text-rose-100"}`}
              >
                {formatCurrency(totalAssets)}
              </span>
            </div>

            <div className="flex justify-between">
              <span
                className={
                  isBalanced
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-rose-700 dark:text-rose-300"
                }
              >
                Total Liabilitas + Ekuitas:
              </span>
              <span
                className={`font-semibold ${isBalanced ? "text-emerald-900 dark:text-emerald-100" : "text-rose-900 dark:text-rose-100"}`}
              >
                {formatCurrency(totalLiabilitiesEquity)}
              </span>
            </div>

            {!isBalanced && difference > 0 && (
              <div className="flex justify-between pt-2 border-t border-rose-300 dark:border-rose-700">
                <span className="text-rose-700 dark:text-rose-300 font-medium">
                  Selisih:
                </span>
                <span className="font-bold text-rose-900 dark:text-rose-100">
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
