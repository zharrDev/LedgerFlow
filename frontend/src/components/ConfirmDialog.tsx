import { motion, AnimatePresence } from "framer-motion";
import type { Account } from "../types/account";
import { useLanguage } from "../hooks/useLanguage";
import { tx } from "../i18n/tx";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  account,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  account: Account | null;
  loading: boolean;
}) {
  const { language } = useLanguage();
  if (!open || !account) return null;
  const willDeactivate = account.isActive === true;

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => !loading && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="w-full max-w-sm bg-white/95 dark:bg-darkBg/95 backdrop-blur-xl rounded-2xl border border-primary-500/20 shadow-xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${willDeactivate ? "bg-amber-50 dark:bg-amber-900/20" : "bg-emerald-50 dark:bg-emerald-900/20"}`}
            >
              {willDeactivate ? (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#d97706"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              ) : (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#059669"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {willDeactivate ? tx(language, "Deactivate Account?", "Nonaktifkan Akun?") : tx(language, "Activate Account?", "Aktifkan Akun?")}
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              {tx(language, "Are you sure you want to", "Apakah Anda yakin ingin")}{" "}
              {willDeactivate ? tx(language, "deactivate", "menonaktifkan") : tx(language, "activate", "mengaktifkan")} <br />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {account.code} – {account.name}
              </span>
              ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                {tx(language, "Cancel", "Batal")}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 py-2 rounded-xl text-white text-sm font-medium transition-all ${willDeactivate ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"}`}
              >
                {loading
                  ? tx(language, "Processing...", "Memproses...")
                  : willDeactivate
                    ? tx(language, "Deactivate", "Nonaktifkan")
                    : tx(language, "Activate", "Aktifkan")}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
