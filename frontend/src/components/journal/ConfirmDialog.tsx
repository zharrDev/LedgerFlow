import type { JournalEntry } from "../../types/journal";
import { SpinnerIcon } from "./JournalShared";
import { useLanguage } from "../../hooks/useLanguage";
import { tx } from "../../i18n/tx";

type DialogMode = "post" | "delete";

interface ConfirmDialogProps {
  open: boolean;
  mode: DialogMode;
  entry: JournalEntry | null;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const POST_ICON = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#2563eb"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const DELETE_ICON = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#ef4444"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

export function ConfirmDialog({
  open,
  mode,
  entry,
  loading,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { language } = useLanguage();
  if (!open || !entry) return null;

  const cfg =
    mode === "post"
      ? {
          icon: POST_ICON,
          iconBg: "bg-blue-50 dark:bg-blue-500/10",
          title: tx(language, "Post to Ledger?", "Posting ke Buku Besar?"),
          btnCls: "bg-blue-600 hover:bg-blue-700",
          btnLabel: tx(language, "Yes, Post Now", "Ya, Post Sekarang"),
          loadingLabel: tx(language, "Posting...", "Memposting..."),
        }
      : {
          icon: DELETE_ICON,
          iconBg: "bg-red-50 dark:bg-red-500/10",
          title: tx(language, "Delete Draft?", "Hapus Draft?"),
          btnCls: "bg-red-600 hover:bg-red-700",
          btnLabel: tx(language, "Yes, Delete", "Ya, Hapus"),
          loadingLabel: tx(language, "Deleting...", "Menghapus..."),
        };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-darkCard rounded-xl border border-gray-200 dark:border-gray-700/50 shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-4 ${cfg.iconBg}`}
        >
          {cfg.icon}
        </div>

        <h3 className="text-center text-sm font-medium text-gray-800 dark:text-white mb-2">
          {cfg.title}
        </h3>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
          {mode === "post" ? (
            <>
              {tx(language, "Entry ", "Entry ")}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {entry.number}
              </span>{" "}
              {tx(language, "will be posted to the ledger and cannot be reversed.", "akan diposting ke buku besar dan tidak dapat diubah kembali.")}
            </>
          ) : (
            <>
              {tx(language, "Draft ", "Draft ")}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {entry.number}
              </span>{" "}
              {tx(language, "will be permanently deleted.", "akan dihapus secara permanen.")}
            </>
          )}
        </p>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {tx(language, "Cancel", "Batal")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-70 ${cfg.btnCls}`}
          >
            {loading ? (
              <>
                <SpinnerIcon className="w-3.5 h-3.5" />
                {cfg.loadingLabel}
              </>
            ) : (
              cfg.btnLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
