import { NavLink, Link } from "react-router-dom";
import { motion } from "framer-motion";
import React, { useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { useScrollIsolation } from "../hooks/useScrollIsolation";
import { useLanguage } from "../hooks/useLanguage";
import { useSubscription } from "../hooks/useSubscription";
import { tx } from "../i18n/tx";
import {
  Building2,
  ChevronRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import {
  getDesktopSidebarMenuItems,
  getDesktopSidebarAccountItems,
  getMobileDrawerItems,
} from "../data/navigation";

interface SidebarProps {
  mobileMenuOpen?: boolean;
  onLinkClick?: () => void;
  /** desktop = content only (wrapper card di AppShell); mobile-drawer = drawer overlay */
  mode?: "desktop" | "mobile-drawer";
}

export function Sidebar({ mobileMenuOpen, onLinkClick, mode }: SidebarProps) {
  const [isDesktop, setIsDesktop] = React.useState(false);
  const asideRef = useRef<HTMLElement>(null);
  useScrollIsolation(asideRef);

  React.useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // If mode is explicitly passed, use it; otherwise fallback to isDesktop
  const effectiveMode = mode || (isDesktop ? "desktop" : "mobile-drawer");

  if (effectiveMode === "desktop") {
    return (
      <SidebarContent mode="desktop" onLinkClick={onLinkClick} />
    );
  }

  return (
    <motion.aside
      ref={asideRef}
      initial={{ x: "-100%" }}
      animate={{ x: mobileMenuOpen ? 0 : "-100%" }}
      transition={{ type: "spring", damping: 25 }}
      className="fixed top-16 left-0 z-50 w-64 h-[calc(100vh-4rem)]
               bg-white/95 dark:bg-darkBg/95 backdrop-blur-2xl shadow-2xl
               border-r border-primary-500/20 overflow-y-auto overscroll-contain scrollbar-thin"
    >
      <SidebarContent mode="mobile-drawer" onLinkClick={onLinkClick} />
    </motion.aside>
  );
}

type SidebarMode = "desktop" | "mobile-drawer";

const SidebarContent = ({
  mode,
  onLinkClick,
}: {
  mode: SidebarMode;
  onLinkClick?: () => void;
}) => {
  const { user, updateUser } = useAuth();
  const { language } = useLanguage();
  const { isPro, isEnterprise, isLoading: subLoading } = useSubscription();
  // Item yang sedang di-hover — pill highlight meluncur antar item (layoutId)
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [companyName, setCompanyName] = React.useState(
    user?.company_name || "",
  );
  const companyFetchedRef = React.useRef(false);
  const initials = (user?.name || "U").charAt(0).toUpperCase();
  const role = user?.role;
  const fillSidebar = role === "akuntan";

  const menuItems =
    mode === "desktop"
      ? getDesktopSidebarMenuItems(role)
      : getMobileDrawerItems(role);

  const accountItems =
    mode === "desktop" ? getDesktopSidebarAccountItems(role) : [];

  React.useEffect(() => {
    if (!user?.company_id || user?.company_name) return;
    if (companyFetchedRef.current) return;
    companyFetchedRef.current = true;
    api
      .get("/api/companies/" + user.company_id)
      .then(({ data }) => {
        if (data?.name) {
          setCompanyName(data.name);
          updateUser({ company_name: data.name });
        }
      })
      .catch(() => {});
  }, [user?.company_id, user?.company_name, updateUser]);

  const navLinkClass = (isActive: boolean, compact?: boolean, fill?: boolean) =>
    `group relative isolate flex items-center gap-2.5 ${fill ? "flex-1" : ""} ${
      compact ? "px-3" : "pl-4 pr-3"
    } py-2 text-xs rounded-xl transition-all duration-200 ${
      isActive
        ? "bg-gradient-to-r from-primary-500/10 to-primary-500/5 text-primary-600 dark:text-primary-400 font-medium shadow-sm"
        : "text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400"
    }`;

  // Pill highlight hover — meluncur antar item via layoutId framer-motion.
  // Di-skip untuk item aktif (sudah punya gradient bg sendiri).
  // Pill dirender DI BELAKANG konten (-z-10 + isolate di link) supaya ikon
  // & teks tetap tajam — tidak tertutup latar semi-transparan di dark mode.
  const hoverPill = (path: string, isActive: boolean) =>
    hoveredPath === path && !isActive ? (
      <motion.span
        layoutId={`sidebar-hover-pill-${mode}`}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        className="absolute inset-0 -z-10 rounded-xl bg-gray-50 dark:bg-darkCard pointer-events-none"
      />
    ) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Company badge */}
      {user && (
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-primary-50 to-primary-50/50 dark:from-primary-900/20 dark:to-primary-900/10 border border-primary-200/50 dark:border-primary-800/30">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate leading-tight flex items-center gap-1">
                {companyName || tx(language, "My Company", "Perusahaan Saya")}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize truncate leading-tight mt-0.5">
                {user.role || "owner"} · {user.name?.split(" ")[0] || "User"}
              </p>
            </div>
            <Building2 size={14} className="text-primary-400 shrink-0" />
          </div>
        </div>
      )}

      {/* Menu navigation — scrollable */}
      <nav className="flex-1 flex flex-col px-3 pt-2 pb-1 overflow-y-auto scrollbar-thin">
        <p className="px-3 mb-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">
          {mode === "mobile-drawer"
            ? language === "id"
              ? "Lainnya"
              : "More"
            : language === "id"
            ? "Menu"
            : "Menu"}
        </p>
        {menuItems.length === 0 ? (
          <p className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
            {mode === "mobile-drawer"
              ? language === "id"
                ? "Menu utama ada di navigasi bawah. Buka tab Profile untuk pengaturan akun."
                : "Main menu is in the bottom navigation. Open the Profile tab for account settings."
              : language === "id"
              ? "Tidak ada menu."
              : "No menu items."}
          </p>
        ) : (
          <div
            className={
              fillSidebar
                ? "flex flex-col flex-1 gap-1.5"
                : "space-y-1.5"
            }
          >
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onLinkClick}
                  onMouseEnter={() => setHoveredPath(item.path)}
                  onMouseLeave={() => setHoveredPath(null)}
                  className={({ isActive }) =>
                    navLinkClass(isActive, false, fillSidebar)
                  }
                >
                  {({ isActive }) => (
                    <>
                      {hoverPill(item.path, isActive)}
                      <span
                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-200 ${
                          isActive
                            ? "h-5 bg-primary-500"
                            : "h-0 bg-transparent group-hover:h-2 group-hover:bg-primary-300 dark:group-hover:bg-primary-700"
                        }`}
                      />
                      <Icon size={16} className="shrink-0" />
                      <span className="truncate">{item.label[language]}</span>
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

        {/* Promo banner — inside scroll, always at bottom of menu items.
            Konten dinamis sesuai plan aktif: Free → ajak Pro, Pro → ajak
            Enterprise, Enterprise → tandai aktif (bukan ajakan upgrade). */}
        {!subLoading && !isEnterprise && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/50">
            <Link
              to="/pricing"
              className="block rounded-xl bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent dark:from-primary-500/15 dark:via-primary-500/5 border border-primary-200/40 dark:border-primary-500/15 p-3 hover:border-primary-400/60 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles size={14} className="text-primary-500" />
                <span className="text-[11px] font-semibold text-primary-700 dark:text-primary-300">
                  {isPro
                    ? language === "id"
                      ? "Upgrade ke Enterprise"
                      : "Upgrade to Enterprise"
                    : language === "id"
                      ? "Upgrade ke Pro"
                      : "Upgrade to Pro"}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
                {isPro
                  ? language === "id"
                    ? "Multi-perusahaan tak terbatas, akses API, dan dukungan prioritas."
                    : "Unlimited companies, API access, and priority support."
                  : language === "id"
                    ? "Akses AI CFO, laporan lanjutan, dan fitur premium lainnya."
                    : "Access AI CFO, advanced reports, and other premium features."}
              </p>
            </Link>
          </div>
        )}

        {!subLoading && isEnterprise && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/50">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-300/40 dark:border-emerald-500/30 px-3 py-2.5">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                {language === "id"
                  ? "Plan Enterprise Aktif"
                  : "Enterprise Plan Active"}
              </span>
            </div>
          </div>
        )}
      </nav>

      {/* Account items (Help & Support) — below menu, outside scroll */}
      {accountItems.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-800 py-2 px-3 space-y-1">
          {accountItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onLinkClick}
                onMouseEnter={() => setHoveredPath(item.path)}
                onMouseLeave={() => setHoveredPath(null)}
                className={({ isActive }) => navLinkClass(isActive, true)}
              >
                {({ isActive }) => (
                  <>
                    {hoverPill(item.path, isActive)}
                    <Icon size={16} className="shrink-0" />
                    <span className="truncate">{item.label[language]}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
};

Sidebar.displayName = "Sidebar";
