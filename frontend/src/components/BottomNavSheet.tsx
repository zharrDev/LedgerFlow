import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Check, X } from "lucide-react";
import type { NavItem } from "../data/navigation";
import { useLanguage } from "../hooks/useLanguage";

interface BottomNavSheetProps {
  item: NavItem | null;
  onClose: () => void;
}

/** Sheet kategori (Accounts / Reports) — muncul tepat di atas Bottom Navigation. */
export function BottomNavSheet({ item, onClose }: BottomNavSheetProps) {
  const location = useLocation();
  const { language } = useLanguage();

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {item && (
          <motion.div
            key={`sheet-${item.id}`}
            className="fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label={`${language === "id" ? "Menu" : "Menu"} ${item.label[language]}`}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            />

            {/* Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className="absolute inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] mx-auto max-w-lg rounded-t-3xl border border-primary-200/30 dark:border-primary-500/20 bg-white/95 dark:bg-darkCard/95 shadow-2xl backdrop-blur-2xl"
            >
              {/* Handle bar */}
              <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-gray-300/80 dark:bg-gray-600/80" />

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-3 pb-1">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {item.label[language]}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={
                    language === "id" ? "Tutup menu" : "Close menu"
                  }
                  className="rounded-lg p-1.5 text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary-500/60 focus:outline-none"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Items */}
              <div className="px-2 pb-4 pt-1">
                {item.children?.map((child) => {
                  const active = location.pathname === child.path;
                  const ChildIcon = child.icon;
                  return (
                    <Link
                      key={child.path}
                      to={child.path}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary-500/60 focus:outline-none hover:bg-primary-50/70 dark:hover:bg-primary-500/10"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          active
                            ? "bg-primary-500 text-white shadow-md"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        <ChildIcon size={18} aria-hidden="true" />
                      </span>
                      <span
                        className={`flex-1 ${
                          active
                            ? "font-semibold text-primary-600 dark:text-primary-400"
                            : "font-medium text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {child.label[language]}
                      </span>
                      {active && (
                        <Check
                          size={16}
                          className="text-primary-500"
                          aria-label={
                            language === "id" ? "Halaman aktif" : "Current page"
                          }
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}