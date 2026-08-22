// src/components/Navbar.tsx — public shared header (dipakai di Homepage + semua public page)
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Menu,
  X,
  ArrowRight,
  Building,
  Landmark,
  Users,
  Receipt,
  BookOpen,
  FileText,
  Calculator,
  Layers,
  Cloud,
  Newspaper,
  GraduationCap,
  HelpCircle,
  MessageSquare,
  FileSpreadsheet,
} from "lucide-react";
import ThemeSwitcher from "./ThemeSwitcher";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../hooks/useLanguage";
import logo from "../assets/ledgerflow.webp";

type L = { en: string; id: string };
type NavItem = { icon: typeof Building; title: L; desc: L; href?: string; comingSoon?: boolean };

const solutionItems: NavItem[] = [
  { icon: Building, title: { en: "Small Businesses", id: "Usaha Kecil" }, desc: { en: "Simplified bookkeeping & tax prep", id: "Pembukuan sederhana & siap pajak" }, href: "/solutions/small-businesses" },
  { icon: Landmark, title: { en: "Mid-Market Companies", id: "Perusahaan Berkembang" }, desc: { en: "Multi-entity & advanced reporting", id: "Multi-entitas & laporan lanjutan" }, href: "/solutions/mid-market-companies" },
  { icon: Users, title: { en: "Accountants & Firms", id: "Akuntan & Firma" }, desc: { en: "Manage multiple clients in one place", id: "Kelola banyak klien dalam satu tempat" }, href: "/solutions/accountants-firms" },
  { icon: Receipt, title: { en: "Startups", id: "Startup" }, desc: { en: "From day-one to Series A", id: "Dari hari pertama ke Series A" }, href: "/solutions/startups" },
];
const productItems: NavItem[] = [
  { icon: BookOpen, title: { en: "Chart of Accounts", id: "Chart of Accounts" }, desc: { en: "Customizable account structure", id: "Struktur akun yang bisa disesuaikan" }, href: "/pricing" },
  { icon: FileText, title: { en: "Journal Entries", id: "Jurnal Umum" }, desc: { en: "Double-entry with auto-balance", id: "Double-entry dengan saldo otomatis" }, href: "/pricing" },
  { icon: Calculator, title: { en: "Budget & Forecast", id: "Anggaran & Forecast" }, desc: { en: "AI-powered financial planning", id: "Perencanaan keuangan berbasis AI" }, href: "/pricing" },
  { icon: Layers, title: { en: "Integrations", id: "Integrasi" }, desc: { en: "Connect banks, ERPs, & more", id: "Hubungkan bank, ERP, & lainnya" }, href: "/pricing" },
  { icon: Building, title: { en: "Multi-Company Management", id: "Manajemen Multi-Perusahaan" }, desc: { en: "Manage multiple entities in one place", id: "Kelola banyak entitas dalam satu tempat" }, href: "/pricing" },
  { icon: Cloud, title: { en: "Automated Bank Sync", id: "Sinkronisasi Bank Otomatis" }, desc: { en: "Auto-import transactions from your bank", id: "Impor otomatis transaksi dari bank Anda" }, href: "/pricing" },
];
const resourceItems: NavItem[] = [
  { icon: Newspaper, title: { en: "Blog", id: "Blog" }, desc: { en: "Tips & industry insights", id: "Tips & insight industri" }, href: "/resources/blog", comingSoon: true },
  { icon: GraduationCap, title: { en: "Guides & Tutorials", id: "Panduan & Tutorial" }, desc: { en: "Step-by-step learning", id: "Belajar bertahap" }, href: "/resources/guides-tutorials", comingSoon: true },
  { icon: HelpCircle, title: { en: "Help Center", id: "Pusat Bantuan" }, desc: { en: "FAQ & documentation", id: "FAQ & dokumentasi" }, href: "/help" },
  { icon: MessageSquare, title: { en: "Community", id: "Komunitas" }, desc: { en: "Join 5,000+ finance pros", id: "Gabung 5.000+ praktisi keuangan" }, href: "/resources/community", comingSoon: true },
  { icon: FileSpreadsheet, title: { en: "Templates", id: "Template" }, desc: { en: "Free Excel & spreadsheet kits", id: "Kit Excel & spreadsheet gratis" }, href: "/resources/templates", comingSoon: true },
];

const toSlug = (value: string) => value.toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function AnimateDropdown({ open, children, onMouseEnter, onMouseLeave }: { open: boolean; children: React.ReactNode; onMouseEnter?: () => void; onMouseLeave?: () => void }) {
  return (
    <motion.div
      initial={false}
      animate={open ? { opacity: 1, y: 0, scale: 1, pointerEvents: "auto" as const } : { opacity: 0, y: -8, scale: 0.96, pointerEvents: "none" as const }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ visibility: open ? "visible" : "hidden" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </motion.div>
  );
}

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileMenuOpen(false); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const openMenu = (key: string) => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpenDropdown(key); };
  const scheduleCloseMenu = () => { if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setOpenDropdown(null), 250); };
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const menuItems = [
    { name: language === "id" ? "Solusi" : "Solutions", key: "solutions", items: solutionItems },
    { name: language === "id" ? "Produk" : "Products", key: "products", items: productItems },
    { name: language === "id" ? "Sumber daya" : "Resources", key: "resources", items: resourceItems },
  ];

  return (
    <header className={`fixed top-2 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl z-[999] bg-white/80 dark:bg-darkCard/80 backdrop-blur-md rounded-xl border border-primary-500/20 transition-all duration-300 ${scrolled ? "shadow-lg" : "shadow-none"}`}>
      <div className="w-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
          <img src={logo} alt="LedgerFlow" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 object-contain transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 flex-shrink-0" />
          <div className="flex flex-col justify-center leading-none">
            <span className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-gray-900 dark:text-white">LedgerFlow</span>
            <span className="text-[8px] sm:text-[9px] lg:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-cyan-600 dark:text-cyan-400 mt-0.5">Financial Platform</span>
          </div>
        </Link>
        <div className="hidden lg:flex items-center gap-1">
          {menuItems.map((item) => (
            <div key={item.key} className="relative group" onMouseEnter={() => openMenu(item.key)} onMouseLeave={scheduleCloseMenu}>
              <button onClick={() => navigate(`/${item.key}`)} className="relative text-sm font-medium text-gray-600 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 inline-flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-primary-500/10">
                {item.name} <ChevronDown size={14} className={`transition-transform duration-200 ${openDropdown === item.key ? "rotate-180" : ""}`} />
              </button>
              <AnimateDropdown open={openDropdown === item.key} onMouseEnter={() => openMenu(item.key)} onMouseLeave={scheduleCloseMenu}>
                <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white/95 dark:bg-darkCard/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 py-3 z-50 ${item.items.length > 4 ? "w-[480px] grid grid-cols-2 gap-0.5 px-3" : "w-[280px] px-2"}`}>
                  {item.items.map((sub) => {
                    const isComingSoon = (sub as NavItem).comingSoon;
                    const className = `flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors group/sub ${isComingSoon ? "opacity-50 cursor-not-allowed" : "hover:bg-primary-500/10 dark:hover:bg-primary-900/20"}`;
                    const content = (<><div className="flex-shrink-0 mt-0.5 p-2 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 group-hover/sub:bg-primary-500/20 transition-colors"><sub.icon size={16} /></div><div><p className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover/sub:text-primary-600 dark:group-hover/sub:text-primary-400 transition-colors">{sub.title[language]}{isComingSoon && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-normal">Coming Soon</span>}</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{sub.desc[language]}</p></div></>);
                    if (isComingSoon) return (<div key={sub.title.en} className={className}>{content}</div>);
                    if (sub.href) return (<Link key={sub.title.en} to={sub.href} className={className}>{content}</Link>);
                    return (<Link key={sub.title.en} to={`/${item.key}/${toSlug(sub.title.en)}`} className={className}>{content}</Link>);
                  })}
                </div>
              </AnimateDropdown>
            </div>
          ))}
          <Link to="/pricing" className="text-sm font-medium text-gray-600 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 px-3 py-2 rounded-lg hover:bg-primary-500/10">{language === "id" ? "Harga" : "Pricing"}</Link>
          <Link to="/login" className="text-sm font-medium text-primary-600 dark:text-primary-400 border-l border-gray-200 dark:border-white/20 pl-4 ml-2 hover:text-primary-500 dark:hover:text-primary-300 transition">{language === "id" ? "Lihat Demonya" : "See it in action"}</Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher /><ThemeSwitcher />
          {user ? (<><Link to="/dashboard" className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl shadow-md hover:shadow-lg transition">{language === "id" ? "Dashboard" : "Dashboard"}</Link><button onClick={logout} className="hidden sm:inline-flex text-sm font-medium text-gray-600 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400">{language === "id" ? "Keluar" : "Logout"}</button></>) : (<Link to="/login" className="hidden sm:inline-flex text-sm font-medium text-gray-600 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400">{language === "id" ? "Masuk" : "Sign in"}</Link>)}
          <button onClick={() => setMobileMenuOpen((o) => !o)} className="lg:hidden relative h-11 w-11 rounded-xl border border-primary-500/15 bg-primary-500/5 text-gray-700 dark:text-gray-100 hover:bg-primary-500/10 active:scale-95 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary-500/50" aria-label={mobileMenuOpen ? "Close mobile menu" : "Open mobile menu"} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation">
            <motion.div initial={false} animate={{ rotate: mobileMenuOpen ? 180 : 0, scale: mobileMenuOpen ? 1.05 : 1 }} transition={{ duration: 0.25, ease: "easeInOut" }}>{mobileMenuOpen ? <X size={22} className="text-primary-600 dark:text-primary-400" /> : <Menu size={22} />}</motion.div>
          </button>
        </div>
      </div>
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div id="mobile-navigation" initial={{ opacity: 0, y: -12, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -12, height: 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} className="lg:hidden border-t border-gray-200/80 dark:border-white/10 bg-white/95 dark:bg-darkCard/95 backdrop-blur-2xl overflow-hidden rounded-b-2xl shadow-2xl">
            <nav className="px-3 py-3 max-h-[calc(100vh-5.5rem)] overflow-y-auto scrollbar-thin" aria-label="Mobile navigation">
              <div className="space-y-2">
                {menuItems.map((item) => {
                  const isOpen = mobileSection === item.key;
                  return (
                    <div key={item.key} className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.03] overflow-hidden">
                      <button type="button" onClick={() => setMobileSection(isOpen ? null : item.key)} aria-expanded={isOpen} className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-bold text-gray-800 dark:text-gray-100">{item.name}<ChevronDown size={18} className={`text-primary-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} /></button>
                      <AnimatePresence initial={false}>
                        {isOpen && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24, ease: "easeOut" }} className="overflow-hidden"><div className="px-2 pb-2 grid gap-1">{item.items.map((sub) => { const className = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-600 dark:text-gray-200 hover:bg-white dark:hover:bg-white/10 hover:text-primary-600 transition-colors"; const content = <><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400"><sub.icon size={16} /></span><span className="min-w-0"><span className="block text-sm font-semibold">{sub.title[language]}</span><span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{sub.desc[language]}</span></span></>; return <Link key={sub.title.en} to={sub.href ?? `/${item.key}/${toSlug(sub.title.en)}`} className={className} onClick={() => setMobileMenuOpen(false)}>{content}</Link>; })}</div></motion.div>)}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-200 dark:border-white/10 pt-3">
                <Link to="/pricing" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/15 px-3 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">{language === "id" ? "Harga" : "Pricing"}</Link>
                <Link to={user ? "/dashboard" : "/login"} onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-cyan-500 px-3 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-500/20">{user ? "Dashboard" : language === "id" ? "Masuk" : "Sign in"}<ArrowRight size={16} /></Link>
              </div>
              {user && <button onClick={logout} className="mt-2 w-full rounded-xl py-2 text-sm font-semibold text-rose-600 dark:text-rose-400">{language === "id" ? "Keluar" : "Logout"}</button>}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
