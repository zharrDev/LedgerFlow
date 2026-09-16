import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { tx } from "../i18n/tx";

// Dialog konfirmasi generik pengganti window.confirm/alert bawaan browser.
// Dipakai untuk aksi destruktif (hapus user, cancel subscription, dsb).
export function ConfirmActionDialog({
  open,
  onClose,
  onConfirm,
  loading,
  title,
  message,
  confirmLabel,
  tone = "rose",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "rose" | "amber";
}) {
  const { language } = useLanguage();
  if (!open) return null;

  const toneBox =
    tone === "amber"
      ? "bg-amber-50 dark:bg-amber-500/10 text-amber-500 ring-1 ring-amber-600/20 dark:ring-amber-500/25"
      : "bg-rose-50 dark:bg-rose-500/10 text-rose-500 ring-1 ring-rose-600/20 dark:ring-rose-500/25";
  const toneBtn =
    tone === "amber"
      ? "bg-amber-500 hover:bg-amber-600"
      : "bg-rose-600 hover:bg-rose-700";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !loading && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm bg-white dark:bg-[#141b2e] rounded-2xl border border-gray-200/70 dark:border-white/10 shadow-2xl dark:shadow-black/50 overflow-hidden"
          >
            <div className="flex items-start gap-4 px-6 pt-6">
              <div className={`shrink-0 p-3 rounded-2xl ${toneBox}`}>
                <AlertTriangle size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
                  {message}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-5 mt-4 bg-gray-50/60 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/[0.06]">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-white/5 transition disabled:opacity-40"
              >
                {tx(language, "Cancel", "Batal")}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${toneBtn}`}
              >
                {loading
                  ? tx(language, "Processing...", "Memproses...")
                  : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
