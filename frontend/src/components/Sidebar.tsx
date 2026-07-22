import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import React from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  FileText,
  TrendingUp,
  Wallet,
  Activity,
  Calendar,
  HelpCircle,
  Settings,
  User,
  Users,
  Building2,
  ChevronRight,
  CreditCard,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Chart of Accounts", href: "/chart-of-accounts", icon: BookOpen },
  { label: "Journal Entries", href: "/journal-entries", icon: PlusCircle },
  { label: "Buku Besar", href: "/buku-besar", icon: FileText },
  { label: "Laba Rugi", href: "/income-statement", icon: TrendingUp },
  { label: "Neraca", href: "/balance-sheet", icon: Wallet },
  { label: "Arus Kas", href: "/cash-flow", icon: Activity },
  { label: "Periode", href: "/period-management", icon: Calendar },
  { label: "User Management", href: "/users-management", icon: Users },
];

const bottomItems = [
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help & Support", href: "/help-center", icon: HelpCircle },
];

interface SidebarProps {
  mobileMenuOpen: boolean;
  onLinkClick?: () => void;
}

export const Sidebar = React.memo(
  ({ mobileMenuOpen, onLinkClick }: SidebarProps) => {
    const [isDesktop, setIsDesktop] = React.useState(false);

    React.useEffect(() => {
      const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
      checkDesktop();
      window.addEventListener("resize", checkDesktop);
      return () => window.removeEventListener("resize", checkDesktop);
    }, []);

    if (isDesktop) {
      return (
        <aside
          className="fixed top-16 left-0 z-40 w-64 h-[calc(100vh-4rem)]
                   bg-white/90 dark:bg-darkBg/90 backdrop-blur-xl
                   border-r border-primary-500/20 overflow-y-auto shadow-lg lg:shadow-none"
        >
          <SidebarContent onLinkClick={onLinkClick} />
        </aside>
      );
    }

    return (
      <motion.aside
        initial={{ x: "-100%" }}
        animate={{ x: mobileMenuOpen ? 0 : "-100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="fixed top-16 left-0 z-40 w-64 h-[calc(100vh-4rem)]
                 bg-white/95 dark:bg-darkBg/95 backdrop-blur-2xl shadow-2xl
                 border-r border-primary-500/20 overflow-y-auto"
      >
        <SidebarContent onLinkClick={onLinkClick} />
      </motion.aside>
    );
  },
);

// ─── Sidebar Content ─────────────────────────────────────────────────
const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => {
  const { user } = useAuth();
  const [companyName, setCompanyName] = React.useState(
    user?.company_name || "",
  );
  const initials = (user?.name || "U").charAt(0).toUpperCase();

  // Auto-fetch company name dari API kalau belum ada
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
              } catch {}
            }
          }
        })
        .catch(() => {});
    }
  }, [user?.company_id, user?.company_name]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Company Card (di atas menu) ── */}
      {user && (
        <div className="px-3 pt-8 pb-3">
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

      {/* ── Main Navigation (indented/turunan) ── */}
      <nav className="flex-1 px-3 pt-3 pb-2 overflow-y-auto">
        <p className="px-3 mb-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">
          Menu
        </p>
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onLinkClick}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 pl-4 pr-3 py-2 text-[13px] rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-primary-500/10 to-primary-500/5 text-primary-600 dark:text-primary-400 font-medium shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-darkCard/50"
                }`
              }
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
                  <item.icon size={17} className="shrink-0" />
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
          ))}
        </div>
      </nav>

      {/* ── Bottom links ── */}
      <div className="border-t border-gray-100 dark:border-gray-800 py-2 px-3 space-y-0.5">
        {bottomItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onLinkClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 text-[13px] rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-primary-600 dark:text-primary-400 bg-primary-500/10 font-medium"
                  : "text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-darkCard/50"
              }`
            }
          >
            <item.icon size={17} className="shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

Sidebar.displayName = "Sidebar";
