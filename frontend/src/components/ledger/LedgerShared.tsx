import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  BookOpen,
  Calendar,
  Check,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  XCircle,
} from "lucide-react";
import type { Toast } from "../../types/ledger";

// ─── SpinnerIcon ──────────────────────────────────────────────────────
export function SpinnerIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Loader2 className={`animate-spin text-primary-500 ${className}`} />;
}

// ─── Icon atoms (lucide-react) ────────────────────────────────────────
export const IconLedger = ({ size = 18 }: { size?: number }) => (
  <BookOpen size={size} />
);
export const IconCalendar = ({ size = 14 }: { size?: number }) => (
  <Calendar size={size} />
);
export const IconCheck = ({ size = 14 }: { size?: number }) => (
  <Check size={size} />
);
export const IconWarning = ({ size = 14 }: { size?: number }) => (
  <AlertCircle size={size} />
);
export const IconRefresh = ({ size = 14 }: { size?: number }) => (
  <RefreshCw size={size} />
);
export const IconChevronDown = ({ size = 14 }: { size?: number }) => (
  <ChevronDown size={size} />
);

// ─── ToastContainer ───────────────────────────────────────────────────
export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg ${
              t.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                : t.type === "error"
                  ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                  : "bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-500/20"
            }`}
          >
            {t.type === "success" ? <Check size={15} /> : <XCircle size={15} />}
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: string;
  colorClass?: string;
  icon?: React.ElementType;
}

export function StatCard({
  label,
  value,
  sub,
  colorClass = "text-gray-400 dark:text-gray-500",
  icon: Icon,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all px-4 py-3.5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className={`text-[11px] font-medium uppercase tracking-wider mb-1 ${colorClass}`}
          >
            {label}
          </p>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 tabular-nums break-words sm:break-normal">
            {value}
          </p>
          {sub && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              {sub}
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
            <Icon size={14} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Formatters ───────────────────────────────────────────────────────
export function formatIDR(value: number): string {
  if (value === 0) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatIDRCompact(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });
}
