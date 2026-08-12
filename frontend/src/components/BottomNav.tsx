import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, MotionConfig } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  getBottomNavItems,
  isNavItemActive,
  type NavItem,
} from "../data/navigation";
import { BottomNavSheet } from "./BottomNavSheet";

const SPRING = { type: "spring", stiffness: 420, damping: 30 } as const;

export function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sheetItem, setSheetItem] = useState<NavItem | null>(null);
  const sheetOpen = !!sheetItem;

  const items = getBottomNavItems(user?.role);

  // Kunci scroll halaman saat sheet terbuka
  useEffect(() => {
    if (sheetOpen) {
      document.body.classList.add("overflow-hidden");
      return () => document.body.classList.remove("overflow-hidden");
    }
  }, [sheetOpen]);

  const handlePress = (item: NavItem) => {
    if (item.children?.length) {
      setSheetItem(item);
      return;
    }
    setSheetItem(null);
    navigate(item.path);
  };

  return (
    <MotionConfig reducedMotion="user">
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      >
        <div className="rounded-t-2xl border-t border-primary-500/15 bg-white/75 dark:bg-darkCard/70 shadow-[0_-8px_30px_rgba(2,6,23,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-lg items-stretch pb-[env(safe-area-inset-bottom)]">
            {items.map((item) => {
              const active = isNavItemActive(item, location.pathname);
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handlePress(item)}
                  aria-label={`Buka ${item.label}`}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 pt-2 pb-1 outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 transition-colors duration-200 ${
                    active
                      ? "text-primary-500 dark:text-primary-400"
                      : "text-gray-500 dark:text-gray-400 active:text-primary-500"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="bottom-nav-active-pill"
                      transition={SPRING}
                      className="absolute top-[3px] left-1/2 h-[3px] w-7 -translate-x-1/2 rounded-full bg-primary-500/90"
                    />
                  )}
                  <motion.span
                    animate={{ scale: active ? 1.16 : 1, y: active ? -1 : 0 }}
                    transition={SPRING}
                    className="flex h-6 w-6 items-center justify-center"
                  >
                    <item.icon
                      size={22}
                      strokeWidth={active ? 2.4 : 2}
                      aria-hidden="true"
                    />
                  </motion.span>
                  <span
                    className={`text-[10px] leading-none ${
                      active ? "font-semibold" : "font-medium"
                    }`}
                  >
                    {item.label === "Journal Entries"
                      ? "Journal"
                      : item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>

      <BottomNavSheet item={sheetItem} onClose={() => setSheetItem(null)} />
    </MotionConfig>
  );
}