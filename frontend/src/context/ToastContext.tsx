import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import { setToastBridge } from "../lib/toastBridge";
import { formatCurrency } from "../utils/currency";

/* ───────── Types ───────── */
export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  duration?: number;
  amount?: number;
  actionLabel?: string;
  actionHref?: string;
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}

/* ───────── Context ───────── */
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

/* ───────── Variant Config ───────── */
const VARIANT_CFG: Record<
  ToastVariant,
  {
    icon: typeof CheckCircle2;
    accentBorder: string;
    iconColor: string;
    progressColor: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    accentBorder: "border-l-emerald-500",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    progressColor: "bg-emerald-500",
  },
  error: {
    icon: XCircle,
    accentBorder: "border-l-rose-500",
    iconColor: "text-rose-600 dark:text-rose-400",
    progressColor: "bg-rose-500",
  },
  warning: {
    icon: AlertTriangle,
    accentBorder: "border-l-amber-500",
    iconColor: "text-amber-600 dark:text-amber-400",
    progressColor: "bg-amber-500",
  },
  info: {
    icon: Info,
    accentBorder: "border-l-primary-500",
    iconColor: "text-primary-600 dark:text-primary-400",
    progressColor: "bg-primary-500",
  },
};

/* ───────── Single Toast Card ───────── */
function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const cfg = VARIANT_CFG[item.variant];
  const Icon = cfg.icon;
  const duration = item.duration ?? 4000;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className={`relative flex items-start gap-3 w-[360px] max-w-[calc(100vw-2rem)] px-4 py-3.5 rounded-2xl bg-white dark:bg-darkCard border border-gray-100 dark:border-gray-800/50 border-l-4 ${cfg.accentBorder} shadow-lg overflow-hidden`}
    >
      {/* Thin progress bar at the top */}
      <motion.div
        className={`absolute top-0 left-0 right-0 h-[2px] ${cfg.progressColor}`}
        style={{ originX: 0 }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: "linear" }}
      />

      {/* Plain icon — satu aksen warna, tanpa ring */}
      <Icon size={20} className={`shrink-0 mt-0.5 ${cfg.iconColor}`} />

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-semibold leading-snug text-gray-900 dark:text-white">
          {item.title}
        </p>
        {item.message && (
          <p className="text-xs mt-0.5 text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
            {item.message}
          </p>
        )}
        {item.amount !== undefined && (
          <p className={`mt-1 text-base font-semibold font-mono tabular-nums ${cfg.iconColor}`}>
            {formatCurrency(item.amount)}
          </p>
        )}
      </div>

      {/* Action + close */}
      <div className="shrink-0 flex flex-col items-end gap-1.5">
        <button
          onClick={() => onDismiss(item.id)}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors opacity-50 hover:opacity-100 text-gray-500 dark:text-gray-400"
        >
          <X size={14} />
        </button>
        {item.actionLabel && item.actionHref && (
          <Link
            to={item.actionHref}
            onClick={() => onDismiss(item.id)}
            className={`inline-flex items-center px-2.5 py-1 rounded-lg border border-current/20 text-xs font-medium transition-colors hover:bg-opacity-10 ${cfg.iconColor}`}
          >
            {item.actionLabel}
          </Link>
        )}
      </div>
    </motion.div>
  );
}

/* ───────── Provider ───────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
  }, []);

  const addToast = useCallback(
    (item: Omit<ToastItem, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = item.duration ?? 4000;

      setToasts((prev) => [...prev.slice(-4), { ...item, id }]); // max 5 visible

      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  // Aktifkan jembatan toast untuk non-React (interceptor axios di lib/api.ts).
  useEffect(() => {
    setToastBridge(addToast);
    return () => setToastBridge(null);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, dismiss }}>
      {children}

      {/* Toast Stack — fixed top-right */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col items-end gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <ToastCard item={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
