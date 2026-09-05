import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Plus,
  Trash2,
  Send,
  Pencil,
  ArrowLeft,
  BookOpen,
  Check,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  XCircle,
  Ban,
} from "lucide-react";
import type { JournalStatus, Toast } from "../../types/journal";
import { STATUS_CONFIG } from "../../types/constants";
import { formatCurrency } from "../../utils/currency";

// ─── StatusBadge ──────────────────────────────────────────────────────
// Entry yang di-void tampil dengan badge merah "Voided" — tetap terlihat di
// riwayat, bukan disembunyikan.
export function StatusBadge({
  status,
  voided,
}: {
  status: JournalStatus;
  voided?: boolean;
}) {
  const cfg = voided
    ? {
        label: "Voided",
        badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
        dot: "bg-rose-500",
      }
    : STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── SpinnerIcon ──────────────────────────────────────────────────────
export function SpinnerIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <Loader2 className={`animate-spin text-primary-500 ${className}`} />;
}

// ─── Icon atoms (lucide-react) ────────────────────────────────────────
export const IconPlus = ({ size = 16 }: { size?: number }) => <Plus size={size} />;
export const IconTrash = ({ size = 14 }: { size?: number }) => <Trash2 size={size} />;
export const IconSend = ({ size = 14 }: { size?: number }) => <Send size={size} />;
export const IconVoid = ({ size = 14 }: { size?: number }) => <Ban size={size} />;
export const IconEdit = ({ size = 14 }: { size?: number }) => <Pencil size={size} />;
export const IconArrowLeft = ({ size = 16 }: { size?: number }) => <ArrowLeft size={size} />;
export const IconJournal = ({ size = 18 }: { size?: number }) => <BookOpen size={size} />;
export const IconCheck = ({ size = 14 }: { size?: number }) => <Check size={size} />;
export const IconWarning = ({ size = 14 }: { size?: number }) => <AlertCircle size={size} />;
export const IconRefresh = ({ size = 14 }: { size?: number }) => <RefreshCw size={size} />;
export const IconChevronDown = ({ size = 14 }: { size?: number }) => <ChevronDown size={size} />;

// ─── ActionButton ─────────────────────────────────────────────────────
interface ActionButtonProps {
  onClick: () => void;
  title: string;
  icon: ReactNode;
  variant?: "default" | "danger" | "primary";
  disabled?: boolean;
}

export function ActionButton({
  onClick, title, icon,
  variant = "default", disabled = false,
}: ActionButtonProps) {
  const cls = {
    default: "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5",
    danger:  "border-rose-200 dark:border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10",
    primary: "border-primary-200 dark:border-primary-500/20 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10",
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}
    >
      {icon}
    </button>
  );
}

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

// ─── Formatters ───────────────────────────────────────────────────────
// Format uang mengikuti mata uang aktif user (Settings → Regional),
// bukan hardcoded IDR.
export function formatIDR(value: number): string {
  if (value === 0) return "—";
  return formatCurrency(value);
}

export function formatDate(iso: string, language: "en" | "id" = "id"): string {
  return new Date(iso).toLocaleDateString(language === "id" ? "id-ID" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
