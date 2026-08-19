// src/pages/HomePage.tsx
import { useEffect, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ChevronRight,
  Shield,
  ArrowRight,
  Sparkles,
  PlayCircle,
  Lock,
  Server,
  Globe,
  CreditCard,
  Building,
  Cloud,
  ChevronDown,
  Menu,
  X,
  BookOpen,
  FileText,
  TrendingUp,
  Zap,
  Calculator,
  Users,
  Layers,
  FileSpreadsheet,
  Receipt,
  Landmark,
  HelpCircle,
  Newspaper,
  GraduationCap,
  MessageSquare,
  KeyRound,
  ShieldCheck,
  Bot,
  Download,
} from "lucide-react";
import ThemeSwitcher from "../components/ThemeSwitcher";
import logo from "../assets/ledgerflow.png";
import Footer from "../components/Footer"; // ← import shared Footer component
import FeatureCarousel from "../components/home/FeatureCarousel";
import ScrollCardWrapper from "../components/home/ScrollCardWrapper";
import fintechBgDesktop from "../assets/hero/fintech-bgdekstop.png";
import fintechBgMobile from "../assets/hero/fintech-bgmobile.png";
import heroBgAnim from "../assets/hero/hero-bg-anim.mp4";

// Video demo — jika file belum tersedia, section video akan di-skip
let dashboardDemo = "";
try {
  dashboardDemo = new URL(
    "../assets/dashboard-demo-D7bRiZnr.mp4",
    import.meta.url,
  ).href;
} catch {
  dashboardDemo = "";
}

// ─── Dropdown Data ──────────────────────────────────────────────────
const solutionItems = [
  {
    icon: Building,
    title: "Small Businesses",
    desc: "Simplified bookkeeping & tax prep",
  },
  {
    icon: Landmark,
    title: "Mid-Market Companies",
    desc: "Multi-entity & advanced reporting",
  },
  {
    icon: Users,
    title: "Accountants & Firms",
    desc: "Manage multiple clients in one place",
  },
  {
    icon: Receipt,
    title: "Startups",
    desc: "From day-one to Series A",
  },
];

const productItems = [
  {
    icon: BookOpen,
    title: "Chart of Accounts",
    desc: "Customizable account structure",
  },
  {
    icon: FileText,
    title: "Journal Entries",
    desc: "Double-entry with auto-balance",
  },
  {
    icon: TrendingUp,
    title: "Financial Reports",
    desc: "Income, Balance Sheet, Cash Flow",
  },
  {
    icon: Calculator,
    title: "Budget & Forecast",
    desc: "AI-powered financial planning",
  },
  {
    icon: Layers,
    title: "Integrations",
    desc: "Connect banks, ERPs, & more",
  },
  {
    icon: Shield,
    title: "Security & Compliance",
    desc: "SOC 2, GDPR, 256-bit encryption",
  },
];

const resourceItems = [
  {
    icon: Newspaper,
    title: "Blog",
    desc: "Tips & industry insights",
  },
  {
    icon: GraduationCap,
    title: "Guides & Tutorials",
    desc: "Step-by-step learning",
  },
  {
    icon: HelpCircle,
    title: "Help Center",
    desc: "FAQ & documentation",
    href: "/help",
  },
  {
    icon: MessageSquare,
    title: "Community",
    desc: "Join 5,000+ finance pros",
  },
  {
    icon: FileSpreadsheet,
    title: "Templates",
    desc: "Free Excel & spreadsheet kits",
  },
];

// ─── Fitur Utama (card ikon sederhana) ────────────────────────────────
const featureCards: Array<{
  icon: typeof Zap;
  title: string;
  desc: string;
}> = [
  {
    icon: KeyRound,
    title: "Role-Based Access",
    desc: "Owner and Accountant roles with tailored permissions",
  },
  {
    icon: ShieldCheck,
    title: "Bank-Grade Security",
    desc: "Encrypted data with WhatsApp OTP and Google sign-in",
  },
  {
    icon: FileText,
    title: "Instant Financial Reports",
    desc: "Balance sheet, income statement, and cash flow, always current",
  },
  {
    icon: Bot,
    title: "AI CFO Assistant",
    desc: "Ask about your finances and get insights instantly",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    desc: "Invite your team to work together on one shared ledger",
  },
  {
    icon: Download,
    title: "Export & Integration",
    desc: "Export reports anytime, fits right into your existing workflow",
  },
];

// ─── Navbar ──────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const menuItems = [
    { name: "Solutions", key: "solutions", items: solutionItems },
    { name: "Products", key: "products", items: productItems },
    { name: "Resources", key: "resources", items: resourceItems },
  ];

  return (
    <header
      className={`fixed top-2 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl z-[999] bg-darkCard/80 backdrop-blur-md rounded-xl border border-primary-500/20 transition-all duration-300 ${
        scrolled ? "shadow-lg" : "shadow-none"
      }`}
    >
      <div className="w-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
          <img
            src={logo}
            alt="LedgerFlow"
            className="w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 object-contain transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 flex-shrink-0"
          />
          <div className="flex flex-col justify-center leading-none">
            <span className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-white transition-all">
              LedgerFlow
            </span>
            <span className="text-[8px] sm:text-[9px] lg:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-cyan-400 transition-all mt-0.5">
              Financial Platform
            </span>
          </div>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-1">
          {menuItems.map((item) => (
            <div
              key={item.key}
              className="relative group"
              onMouseEnter={() => setOpenDropdown(item.key)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button className="relative text-sm font-medium text-gray-200 hover:text-primary-400 transition-all duration-200 inline-flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-primary-500/10">
                {item.name}
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${
                    openDropdown === item.key ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Mega-style Dropdown */}
              <AnimateDropdown open={openDropdown === item.key}>
                <div
                  className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-darkCard/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 py-3 z-50 ${
                    item.items.length > 4
                      ? "w-[480px] grid grid-cols-2 gap-0.5 px-3"
                      : "w-[280px] px-2"
                  }`}
                >
                  {item.items.map((sub) => {
                    const className =
                      "flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-primary-900/20 transition-colors group/sub";
                    const content = (
                      <>
                        <div className="flex-shrink-0 mt-0.5 p-2 rounded-lg bg-primary-500/10 text-primary-400 group-hover/sub:bg-primary-500/20 transition-colors">
                          <sub.icon size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-200 group-hover/sub:text-primary-400 transition-colors">
                            {sub.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                            {sub.desc}
                          </p>
                        </div>
                      </>
                    );
                    if ("href" in sub && sub.href) {
                      return (
                        <Link key={sub.title} to={sub.href} className={className}>
                          {content}
                        </Link>
                      );
                    }
                    return (
                      <a key={sub.title} href="#" className={className}>
                        {content}
                      </a>
                    );
                  })}
                </div>
              </AnimateDropdown>
            </div>
          ))}

          <Link
            to="/login"
            className="text-sm font-medium text-gray-200 hover:text-primary-400 transition-all duration-200 px-3 py-2 rounded-lg hover:bg-primary-500/10"
          >
            Pricing
          </Link>

          <Link
            to="/login"
            className="text-sm font-medium text-primary-400 border-l border-white/20 pl-4 ml-2 hover:text-primary-300 transition"
          >
            See it in action
          </Link>
        </div>

        {/* Right Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeSwitcher />

          {user ? (
            <>
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl shadow-md hover:shadow-lg transition"
              >
                Dashboard
              </Link>
              <button
                onClick={logout}
                className="hidden sm:inline-flex text-sm font-medium text-gray-200 hover:text-primary-400"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:inline-flex text-sm font-medium text-gray-200 hover:text-primary-400"
              >
                Sign in
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-gray-200 hover:bg-white/10 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            aria-label="Toggle mobile menu"
          >
            <motion.div
              initial={false}
              animate={{
                rotate: mobileMenuOpen ? 180 : 0,
                scale: mobileMenuOpen ? 1.05 : 1,
              }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {mobileMenuOpen ? (
                <X size={22} className="text-primary-400" />
              ) : (
                <Menu size={22} />
              )}
            </motion.div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden border-t border-white/10 bg-darkCard/95 backdrop-blur-xl overflow-hidden rounded-b-2xl shadow-2xl"
          >
            <div className="px-6 py-6 space-y-6 max-h-[82vh] overflow-y-auto scrollbar-thin">
              <div className="space-y-6">
                {menuItems.map((item) => (
                  <div key={item.key} className="space-y-2.5">
                    <p className="text-xs font-extrabold text-primary-400 uppercase tracking-wider px-1">
                      {item.name}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#111827]/70 p-3 rounded-2xl border border-white/10">
                      {item.items.map((sub) => {
                        const className =
                          "flex items-start gap-3 p-2.5 rounded-xl hover:bg-darkCard text-gray-200 hover:text-primary-400 transition-all group/mob shadow-sm hover:shadow";
                        const content = (
                          <>
                            <div className="p-2 rounded-xl bg-primary-500/10 text-primary-400 group-hover/mob:scale-110 transition-transform flex-shrink-0 mt-0.5">
                              <sub.icon size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold leading-snug">
                                {sub.title}
                              </p>
                              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                {sub.desc}
                              </p>
                            </div>
                          </>
                        );
                        if ("href" in sub && sub.href) {
                          return (
                            <Link
                              key={sub.title}
                              to={sub.href}
                              className={className}
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              {content}
                            </Link>
                          );
                        }
                        return (
                          <a key={sub.title} href="#" className={className}>
                            {content}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Links in Mobile Menu */}
              <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/pricing"
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/20 text-sm font-semibold text-gray-200 hover:bg-white/5 transition-all shadow-sm"
                >
                  Pricing
                </Link>
                {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                      <span>Dashboard</span> <ArrowRight size={16} />
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full sm:w-auto px-4 py-3 text-sm font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                      <span>Sign in</span> <ArrowRight size={16} />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ─── Animate Dropdown Helper ────────────────────────────────────────
function AnimateDropdown({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={false}
      animate={
        open
          ? { opacity: 1, y: 0, scale: 1, pointerEvents: "auto" }
          : { opacity: 0, y: -8, scale: 0.96, pointerEvents: "none" }
      }
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ visibility: open ? "visible" : "hidden" }}
    >
      {children}
    </motion.div>
  );
}

// ─── Animations ──────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

// ─── Main Page ───────────────────────────────────────────────────────
export default function HomePage() {
  const { user } = useAuth();
  const [heroVideoError, setHeroVideoError] = useState(false);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const opacityHero = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <div className="relative h-screen overflow-y-auto overflow-x-hidden homepage-scroll bg-gray-100 dark:bg-gray-950">
      <Navbar />
      <ScrollCardWrapper>
      {/* ═══ Hero ═══ */}
      <section className="relative min-h-[calc(100dvh-5rem)] flex items-center justify-center text-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat sm:hidden" style={{ backgroundImage: `url(${fintechBgMobile})` }} />
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat hidden sm:block" style={{ backgroundImage: `url(${fintechBgDesktop})` }} />
        {!heroVideoError && (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden
            poster={fintechBgDesktop}
            onError={() => setHeroVideoError(true)}
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={heroBgAnim} type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/25 via-darkBg/35 to-transparent pointer-events-none" />

        <motion.div
          style={{ y: heroY, opacity: opacityHero }}
          className="relative z-10 max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-[2.25rem] leading-tight sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white">
              Manage Your Financial <br />
              Future <br />
              <span className="bg-gradient-to-r from-primary-400 to-cyan-300 bg-clip-text text-transparent break-words">
                With Confidence
              </span>
            </h2>
            <p className="mt-6 text-base sm:text-lg md:text-xl text-gray-100 max-w-2xl mx-auto px-2">
              LedgerFlow eliminates manual bookkeeping, speeds up month-end
              close, and gives you real-time financials.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 w-full px-4">
              {user ? (
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto justify-center px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                >
                  Go to Dashboard <ChevronRight size={18} />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="w-full sm:w-auto justify-center px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                  >
                    15-day free trial <ChevronRight size={18} />
                  </Link>
                  <Link
                    to="/login"
                    className="w-full sm:w-auto text-center px-6 py-3 border border-white/30 rounded-xl text-white hover:bg-white/10 transition"
                  >
                    See how it works
                  </Link>
                </>
              )}
            </div>
            <p className="mt-6 text-xs sm:text-sm text-gray-300 flex flex-wrap items-center justify-center gap-2 px-4 text-center">
              <Lock size={14} className="flex-shrink-0" /> Enterprise-grade
              security · SOC 2 Type II · GDPR
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/60 flex justify-center">
            <div className="w-1 h-2 bg-white/60 rounded-full mt-2 animate-bounce" />
          </div>
        </motion.div>
      </section>

      {/* ═══ Security ═══ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
        className="py-16 px-6 bg-gray-50/50 dark:bg-gray-900/20"
      >
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Trusted by modern businesses
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Bank-grade security & enterprise compliance
            </p>
          </motion.div>
          <div className="grid gap-5 sm:gap-8 md:grid-cols-2">
            <motion.div
              variants={fadeUp}
              className="bg-white dark:bg-darkCard rounded-2xl shadow-xl border border-primary-500/20 p-5 sm:p-6 min-w-0 hover:shadow-2xl transition"
            >
              <div className="flex items-start gap-3 mb-4 flex-wrap">
                <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center text-cyan-600">
                  <Building size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                    Bank Data via Plaid
                  </h3>
                  <p className="text-sm text-gray-500">
                    Credentials never stored on our servers
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {["SOC 2 Type II", "ISO 27001", "GDPR"].map((badge) => (
                  <span
                    key={badge}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full text-xs font-medium"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </motion.div>
            <motion.div
              variants={fadeUp}
              className="bg-white dark:bg-darkCard rounded-2xl shadow-xl border border-primary-500/20 p-5 sm:p-6 min-w-0 hover:shadow-2xl transition"
            >
              <div className="flex items-start gap-3 mb-4 flex-wrap">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                    Payments via Stripe
                  </h3>
                  <p className="text-sm text-gray-500">
                    Trusted by millions of businesses
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {["PCI-DSS Level 1", "SOC 2", "3D Secure"].map((badge) => (
                  <span
                    key={badge}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full text-xs font-medium"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
          <motion.div
            variants={fadeUp}
            className="flex flex-wrap justify-center gap-6 mt-10 pt-4 border-t border-gray-200 dark:border-gray-800"
          >
            {[
              { icon: Shield, label: "256-bit AES" },
              { icon: Server, label: "SOC 2 Type II" },
              { icon: Globe, label: "GDPR Compliant" },
              { icon: Cloud, label: "99.9% Uptime" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
              >
                <item.icon size={18} className="text-primary-500" />
                <span>{item.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ═══ Dashboard Showcase (VIDEO!) ═══ */}
      {dashboardDemo && (
        <motion.section
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative py-32 px-6 overflow-hidden"
        >
          {/* Background Glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[150px]" />
          </div>

          <div className="relative max-w-[1500px] mx-auto">
            {/* Heading */}
            <div className="text-center max-w-4xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary-500/20 bg-primary-50 dark:bg-primary-900/20 text-primary-600 font-medium text-sm">
                <Sparkles size={16} />
                Product Demo
              </div>
              <h2 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
                See LedgerFlow
                <span className="block bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-400 bg-clip-text text-transparent">
                  In Real-Time
                </span>
              </h2>
              <p className="mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-400">
                Manage transactions, monitor cash flow, track expenses, and gain
                actionable insights through a beautifully designed financial
                dashboard.
              </p>
            </div>

            {/* Video Container */}
            <div className="relative group">
              {/* Outer Glow */}
              <div className="absolute -inset-10 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-sky-500/20 blur-3xl rounded-[50px]" />

              {/* Main Card */}
              <div className="relative overflow-hidden rounded-[36px] border border-white/20 bg-white/60 dark:bg-darkCard/70 backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,0.18)] transition-all duration-700 group-hover:-translate-y-2">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  className="w-full min-h-[100px] md:min-h-[300px] lg:min-h-[450px] object-cover"
                >
                  <source src={dashboardDemo} type="video/mp4" />
                </video>
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Floating Card 1 */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="hidden lg:flex absolute top-8 left-8 bg-white dark:bg-darkCard rounded-2xl shadow-xl px-5 py-4 items-center gap-3"
              >
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <p className="text-xs text-gray-500">System Status</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    All Systems Operational
                  </p>
                </div>
              </motion.div>

              {/* Floating Card 2 */}
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ repeat: Infinity, duration: 5 }}
                className="hidden lg:flex absolute bottom-8 right-8 bg-white dark:bg-darkCard rounded-2xl shadow-xl px-5 py-4 items-center gap-3"
              >
                <PlayCircle className="text-primary-500" />
                <div>
                  <p className="text-xs text-gray-500">Monthly Growth</p>
                  <p className="font-semibold text-green-500">+24.6%</p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>
      )}

      {/* ═══ Hero Carousel (gambar fitur) ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-2xl mx-auto px-6 mb-10"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
          Explore What's Inside
        </h2>
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
          Every tool you need, built into one platform.
        </p>
      </motion.div>
      <FeatureCarousel />

      {/* ═══ Features ═══ */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Everything you need to scale
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-3">
              Powerful features built for modern finance teams
            </p>
          </motion.div>
          <div className="grid gap-5 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feat, idx) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                whileHover={{ y: -6, transition: { type: "tween", duration: 0.15 } }}
                className="relative group bg-white/80 dark:bg-darkCard/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 min-w-0 border border-primary-500/20 shadow-md hover:shadow-xl transition-all duration-150"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-500/10 dark:bg-primary-500/15 text-primary-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feat.icon size={22} />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                  {feat.title}
                </h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <motion.section
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="py-20 px-4 sm:px-6"
      >
        <div className="max-w-5xl mx-auto bg-gradient-to-r from-primary-600 to-primary-700 rounded-3xl p-6 sm:p-10 md:p-16 text-center text-white shadow-2xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-snug">
            Ready to transform your financial operations?
          </h2>
          <p className="mt-4 text-primary-100 text-base sm:text-lg">
            Join thousands of businesses using LedgerFlow
          </p>
          <div className="mt-8 flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4">
            {user ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto justify-center px-6 py-3 bg-white text-primary-700 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center gap-2"
              >
                Go to Dashboard <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto justify-center px-6 py-3 bg-white text-primary-700 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center gap-2 shadow-md"
                >
                  Start 15-day free trial <ArrowRight size={18} />
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto text-center px-6 py-3 border border-white/30 rounded-xl font-semibold hover:bg-white/10 transition"
                >
                  Contact sales
                </Link>
              </>
            )}
          </div>
        </div>
      </motion.section>

      <Footer />
      </ScrollCardWrapper>
    </div>
  );
}
