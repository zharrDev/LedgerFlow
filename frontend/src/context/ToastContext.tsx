import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import { setToastBridge } from "../lib/toastBridge";

/* ───────── Types ───────── */
export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  duration?: number;
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
  { icon: typeof CheckCircle2; accent: string; glow: string; progress: string; ring: string }
> = {
  success: {
    icon: CheckCircle2,
    accent:
      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
    glow: "shadow-emerald-500/20 dark:shadow-emerald-500/10",
    progress: "bg-emerald-500",
    ring: "bg-emerald-100 dark:bg-emerald-500/20",
  },
  error: {
    icon: XCircle,
    accent:
      "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20",
    glow: "shadow-rose-500/20 dark:shadow-rose-500/10",
    progress: "bg-rose-500",
    ring: "bg-rose-100 dark:bg-rose-500/20",
  },
  warning: {
    icon: AlertTriangle,
    accent:
      "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
    glow: "shadow-amber-500/20 dark:shadow-amber-500/10",
    progress: "bg-amber-500",
    ring: "bg-amber-100 dark:bg-amber-500/20",
  },
  info: {
    icon: Info,
    accent:
      "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-500/20",
    glow: "shadow-primary-500/20 dark:shadow-primary-500/10",
    progress: "bg-primary-500",
    ring: "bg-primary-100 dark:bg-primary-500/20",
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
      initial={{ opacity: 0, x: 80, scale: 0.92, filter: "blur(4px)" }}
      animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, x: 80, scale: 0.92, filter: "blur(4px)" }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`relative flex items-start gap-3 w-[360px] max-w-[calc(100vw-2rem)] px-4 py-3.5 rounded-2xl border shadow-lg ${cfg.accent} ${cfg.glow} overflow-hidden backdrop-blur-sm`}
    >
      {/* Animated progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-[3px] rounded-full"
        style={{ originX: 0 }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: "linear" }}
      >
        <div className={`h-full w-full ${cfg.progress} rounded-full`} />
      </motion.div>

      {/* Icon with ring */}
      <div className={`shrink-0 p-1.5 rounded-xl ${cfg.ring}`}>
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.1 }}
        >
          <Icon size={18} />
        </motion.div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-semibold leading-snug">{item.title}</p>
        {item.message && (
          <p className="text-xs mt-0.5 opacity-80 leading-relaxed line-clamp-2">{item.message}</p>
        )}
      </div>

      {/* Close */}
      <button
        onClick={() => onDismiss(item.id)}
        className="shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors opacity-50 hover:opacity-100"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

/* ───────── Provider ───────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Dedupe: kunci signature (variant+title+message) dari toast yang masih
  // tampil. Kalau ada toast identik ditambahkan lagi, di-skip supaya tidak
  // bertumpuk (mis. banyak request gagal barengan dengan pesan sama).
  const activeSignatures = useRef<Map<string, string>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => {
      const target = prev.find((t) => t.id === id);
      if (target) {
        const sig = `${target.variant}|${target.title}|${target.message ?? ""}`;
        if (activeSignatures.current.get(sig) === id) {
          activeSignatures.current.delete(sig);
        }
      }
      return prev.filter((t) => t.id !== id);
    });
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
  }, []);

  const addToast = useCallback(
    (item: Omit<ToastItem, "id">) => {
      const sig = `${item.variant}|${item.title}|${item.message ?? ""}`;
      // Toast identik sudah tampil → skip (dedupe)
      if (activeSignatures.current.has(sig)) return;

      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = item.duration ?? 4000;

      activeSignatures.current.set(sig, id);
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
