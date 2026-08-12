import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import React, { useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { useScrollIsolation } from "../hooks/useScrollIsolation";
import {
  Building2,
  ChevronRight,
} from "lucide-react";
import {
  getDesktopSidebarMenuItems,
  getDesktopSidebarAccountItems,
  getMobileDrawerItems,
} from "../data/navigation";

interface SidebarProps {
  mobileMenuOpen: boolean;
  onLinkClick?: () => void;
}

export const Sidebar = React.memo(
  ({ mobileMenuOpen, onLinkClick }: SidebarProps) => {
    const [isDesktop, setIsDesktop] = React.useState(false);
    const asideRef = useRef<HTMLElement>(null);
    useScrollIsolation(asideRef);

    React.useEffect(() => {
      const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
      checkDesktop();
      window.addEventListener("resize", checkDesktop);
      return () => window.removeEventListener("resize", checkDesktop);
    }, []);

    if (isDesktop) {
      return (
        <aside
          ref={asideRef}
          className="fixed top-16 left-0 z-40 w-64 h-[calc(100vh-4rem)]
                   bg-white/90 dark:bg-darkBg/90 backdrop-blur-xl
                   border-r border-primary-500/20 overflow-y-auto overscroll-contain shadow-lg lg:shadow-none"
        >
          <SidebarContent mode="desktop" onLinkClick={onLinkClick} />
        </aside>
      );
    }

    return (
      <motion.aside
        ref={asideRef}
        initial={{ x: "-100%" }}
        animate={{ x: mobileMenuOpen ? 0 : "-100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="fixed top-16 left-0 z-40 w-64 h-[calc(100vh-4rem)]
                 bg-white/95 dark:bg-darkBg/95 backdrop-blur-2xl shadow-2xl
                 border-r border-primary-500/20 overflow-y-auto overscroll-contain"
      >
        <SidebarContent mode="mobile-drawer" onLinkClick={onLinkClick} />
      </motion.aside>
    );
  },
);

type SidebarMode = "desktop" | "mobile-drawer";

const SidebarContent = ({
  mode,
  onLinkClick,
}: {
  mode: SidebarMode;
  onLinkClick?: () => void;
}) => {
  const { user } = useAuth();
  const [companyName, setCompanyName] = React.useState(
    user?.company_name || "",
  );
  const initials = (user?.name || "U").charAt(0).toUpperCase();
  const role = user?.role;

  const menuItems =
    mode === "desktop"
      ? getDesktopSidebarMenuItems(role)
      : getMobileDrawerItems(role);

  const accountItems =
    mode === "desktop" ? getDesktopSidebarAccountItems(role) : [];

  React.useEffect(() => {
    if (user?.company_name) {
      setCompanyName(user.company_name);
      return;
    }
    if (user?.company_id && !user?.company_name) {
      api
        .get("/api/companies/" + user.company_id)
        .then(({ data }) => {
          if (data?.name) {
            setCompanyName(data.name);
            const savedUser = localStorage.getItem("user");
            if (savedUser) {
              try {
                const parsed = JSON.parse(savedUser);
                parsed.company_name = data.name;
                localStorage.setItem("user", JSON.stringify(parsed));
              } catch {
                /* ignore */
              }
            }
          }
        })
        .catch(() => {});
    }
  }, [user?.company_id, user?.company_name]);

  const navLinkClass = (isActive: boolean, compact?: boolean) =>
    `group relative flex items-center gap-2.5 ${
      compact ? "px-3" : "pl-4 pr-3"
    } py-2 text-xs rounded-xl transition-all duration-200 ${
      isActive
        ? "bg-gradient-to-r from-primary-500/10 to-primary-500/5 text-primary-600 dark:text-primary-400 font-medium shadow-sm"
        : "text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-darkCard/50"
    }`;

  return (
    <div className="flex flex-col h-full">
      {user && (
        <div className="px-3 pt-2 pb-2">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-primary-50 to-primary-50/50 dark:from-primary-900/20 dark:to-primary-900/10 border border-primary-200/50 dark:border-primary-800/30">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate leading-tight flex items-center gap-1">
                {companyName || "My Company"}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize truncate leading-tight mt-0.5">
                {user.role || "owner"} · {user.name?.split(" ")[0] || "User"}
              </p>
            </div>
            <Building2 size={14} className="text-primary-400 shrink-0" />
          </div>
        </div>
      )}

      <nav className="flex-1 px-3 pt-2 pb-1 overflow-y-auto">
        <p className="px-3 mb-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">
          {mode === "mobile-drawer" ? "Lainnya" : "Menu"}
        </p>
        {menuItems.length === 0 ? (
          <p className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
            {mode === "mobile-drawer"
              ? "Menu utama ada di navigasi bawah. Buka tab Profile untuk pengaturan akun."
              : "Tidak ada menu."}
          </p>
        ) : (
          <div className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onLinkClick}
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-200 ${
                          isActive
                            ? "h-5 bg-primary-500"
                            : "h-0 bg-transparent group-hover:h-2 group-hover:bg-primary-300 dark:group-hover:bg-primary-700"
                        }`}
                      />
                      <Icon size={16} className="shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {isActive && (
                        <ChevronRight
                          size={12}
                          className="ml-auto text-primary-400 shrink-0"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        )}
      </nav>

      {accountItems.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-800 py-2 px-3 space-y-1">
          {accountItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onLinkClick}
                className={({ isActive }) => navLinkClass(isActive, true)}
              >
                <Icon size={16} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
};

Sidebar.displayName = "Sidebar";
