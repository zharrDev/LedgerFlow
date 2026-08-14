import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, MotionConfig } from "framer-motion";
import { X, ChevronRight } from "lucide-react";
import { NAV_ITEMS } from "../data/navigation";
import { useScrollIsolation } from "../hooks/useScrollIsolation";
import { useAuth } from "../context/AuthContext";

// Drawer mobile HANYA berisi menu yang tidak ada di Bottom Navigation
// (sesuai keputusan final: hindari duplikasi). Item bottom-nav dikecualikan.
const EXCLUDED_IDS = new Set([
  "dashboard",
  "journal",
  "accounts",
  "reports",
  "profile",
  "ai-cfo",
]);

const DRAWER_GROUPS = [
  { title: "Administrasi", ids: ["period-management", "users-management"] },
  { title: "Akun & Bantuan", ids: ["settings", "help-center"] },
];

interface MobileDrawerProps {
  onClose: () => void;
}

export function MobileDrawer({ onClose }: MobileDrawerProps) {
  const { user } = useAuth();
  const location = useLocation();
  const asideRef = useRef<HTMLElement>(null);
  useScrollIsolation(asideRef);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canAccess = (roles?: string[]) =>
    !roles || (!!user?.role && roles.includes(user.role));

  return (
    <MotionConfig reducedMotion="user">
      <motion.aside
        ref={asideRef}
        role="dialog"
        aria-label="Menu navigasi"
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="fixed top-16 bottom-0 left-0 z-40 w-64 max-w-[80vw] overflow-y-auto overscroll-contain border-r border-primary-500/20 bg-white/95 dark:bg-darkBg/95 shadow-2xl backdrop-blur-2xl lg:hidden"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">
              Menu Lainnya
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup menu"
              className="rounded-lg p-1.5 text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary-500/60 focus:outline-none"
            >
              <X size={18} />
            </button>
          </div>

          {/* Groups */}
          <div className="flex-1 overflow-y-auto px-3 pb-6">
            {DRAWER_GROUPS.map((group) => {
              const items = NAV_ITEMS.filter(
                (item) =>
                  group.ids.includes(item.id) &&
                  !EXCLUDED_IDS.has(item.id) &&
                  canAccess(item.roles),
              );
              if (!items.length) return null;
              return (
                <div key={group.title} className="mb-4">
                  <p className="px-3 mb-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">
                    {group.title}
                  </p>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <NavLink
                        key={item.id}
                        to={item.path}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `group relative flex items-center gap-2.5 px-3 py-2.5 text-xs rounded-xl transition-all duration-200 ${
                            isActive
                              ? "bg-gradient-to-r from-primary-500/10 to-primary-500/5 text-primary-600 dark:text-primary-400 font-medium shadow-sm"
                              : "text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-darkCard/50"
                          }`
                        }
                      >
                        <item.icon size={16} className="shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                        {location.pathname === item.path && (
                          <ChevronRight
                            size={12}
                            className="ml-auto text-primary-400 shrink-0"
                          />
                        )}
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.aside>
    </MotionConfig>
  );
}