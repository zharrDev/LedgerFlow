import { motion } from "framer-motion";
import { formatCurrency } from "../../utils/currency";
import type { LucideIcon } from "lucide-react";

interface BalanceSheetCardProps {
  title: string;
  amount: number;
  icon: LucideIcon;
  index: number;
}

/**
 * Kartu ringkasan neraca — satu keluarga warna (tint primary, glass).
 */
export const BalanceSheetCard = ({
  title,
  amount,
  icon: Icon,
  index,
}: BalanceSheetCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="group relative overflow-hidden rounded-2xl bg-white/60 dark:bg-darkCard/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg hover:shadow-xl transition-all p-6"
    >
      <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-primary-400/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />

      <div className="relative z-10">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-full mb-4 bg-primary-500/10 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400">
          <Icon className="w-5 h-5" />
        </div>

        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          {title}
        </h3>

        <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight tabular-nums break-words">
          {formatCurrency(amount)}
        </p>
      </div>
    </motion.div>
  );
};