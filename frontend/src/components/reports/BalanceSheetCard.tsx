import { motion } from "framer-motion";
// import { LucideIcon } from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import type { LucideIcon } from "lucide-react";


interface BalanceSheetCardProps {
  title: string;
  amount: number;
  icon: LucideIcon;
  colorClass: string;
  bgColorClass: string;
  index: number;
}

export const BalanceSheetCard = ({
  title,
  amount,
  icon: Icon,
  colorClass,
  bgColorClass,
  index,
}: BalanceSheetCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="group relative overflow-hidden rounded-2xl bg-white/60 dark:bg-darkCard/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg hover:shadow-xl transition-all p-6"
    >
      {/* Background Gradient */}
      <div
        className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 ${bgColorClass} opacity-10 rounded-full group-hover:scale-150 transition-transform duration-500`}
      />

      <div className="relative z-10">
        {/* Icon */}
        <div
          className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${bgColorClass} ${colorClass}`}
        >
          <Icon className="w-6 h-6" />
        </div>

        {/* Title */}
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          {title}
        </h3>

        {/* Amount */}
        <p
          className={`text-lg sm:text-2xl font-bold ${colorClass} tracking-tight tabular-nums break-words`}
        >
          {formatCurrency(amount)}
        </p>
      </div>
    </motion.div>
  );
};
