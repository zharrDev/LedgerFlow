// src/pages/HomePage.tsx
import { useEffect, useState, useRef } from "react";
import {
  type Variants,
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
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
  FileBarChart,
  UsersRound,
} from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import Footer from "../components/Footer"; // ← import shared Footer component
import Navbar from "../components/Navbar";
import FeatureCarousel from "../components/home/FeatureCarousel";
import ScrollCardWrapper from "../components/home/ScrollCardWrapper";
import BorderBeamBadge from "../components/home/BorderBeamBadge";
import InViewVideo from "../components/home/InViewVideo";
import fintechBgDesktop from "../assets/hero/fintech-bgdekstop.webp";
import fintechBgMobile from "../assets/hero/fintech-bgmobile.webp";
import heroBgAnim from "../assets/hero/hero-bg-anim.webm";
import heroBgAnimFallback from "../assets/hero/hero-bg-anim.mp4";

// Video demo — jika file belum tersedia, section video akan di-skip
let dashboardDemo = "";
let dashboardDemoFallback = "";
try {
  dashboardDemo = new URL(
    "../assets/dashboard-demo.webm",
    import.meta.url,
  ).href;
  dashboardDemoFallback = new URL(
    "../assets/dashboard-demo-D7bRiZnr.mp4",
    import.meta.url,
  ).href;
} catch {
  dashboardDemo = "";
}

// ─── Dropdown Data ──────────────────────────────────────────────────
type L = { en: string; id: string };

const solutionItems: Array<{
  icon: typeof Building;
  title: L;
  desc: L;
  href?: string;
}> = [
  {
    icon: Building,
    title: { en: "Small Businesses", id: "Usaha Kecil" },
    desc: {
      en: "Simplified bookkeeping & tax prep",
      id: "Pembukuan sederhana & siap pajak",
    },
    href: "/solutions/small-businesses",
  },
  {
    icon: Landmark,
    title: { en: "Mid-Market Companies", id: "Perusahaan Berkembang" },
    desc: {
      en: "Multi-entity & advanced reporting",
      id: "Multi-entitas & laporan lanjutan",
    },
    href: "/solutions/mid-market-companies",
  },
  {
    icon: Users,
    title: { en: "Accountants & Firms", id: "Akuntan & Firma" },
    desc: {
      en: "Manage multiple clients in one place",
      id: "Kelola banyak klien dalam satu tempat",
    },
    href: "/solutions/accountants-firms",
  },
  {
    icon: Receipt,
    title: { en: "Startups", id: "Startup" },
    desc: { en: "From day-one to Series A", id: "Dari hari pertama ke Series A" },
    href: "/solutions/startups",
  },
];

const productItems: Array<{
  icon: typeof Building;
  title: L;
  desc: L;
  href?: string;
}> = [
  {
    icon: BookOpen,
    title: { en: "Chart of Accounts", id: "Chart of Accounts" },
    desc: {
      en: "Customizable account structure",
      id: "Struktur akun yang bisa disesuaikan",
    },
    href: "/products/chart-of-accounts",
  },
  {
    icon: FileText,
    title: { en: "Journal Entries", id: "Jurnal Umum" },
    desc: {
      en: "Double-entry with auto-balance",
      id: "Double-entry dengan saldo otomatis",
    },
    href: "/products/journal-entries",
  },
  {
    icon: TrendingUp,
    title: { en: "Financial Reports", id: "Laporan Keuangan" },
    desc: {
      en: "Income, Balance Sheet, Cash Flow",
      id: "Laba rugi, neraca, arus kas",
    },
    href: "/products/financial-reports",
  },
  {
    icon: Calculator,
    title: { en: "Budget & Forecast", id: "Anggaran & Forecast" },
    desc: {
      en: "AI-powered financial planning",
      id: "Perencanaan keuangan berbasis AI",
    },
    href: "/products/budget-forecast",
  },
  {
    icon: Layers,
    title: { en: "Integrations", id: "Integrasi" },
    desc: { en: "Connect banks, ERPs, & more", id: "Hubungkan bank, ERP, & lainnya" },
    href: "/products/integrations",
  },
  {
    icon: Shield,
    title: { en: "Security & Compliance", id: "Keamanan & Kepatuhan" },
    desc: {
      en: "SOC 2, GDPR, 256-bit encryption",
      id: "SOC 2, GDPR, enkripsi 256-bit",
    },
    href: "/products/security-compliance",
  },
];

const resourceItems: Array<{
  icon: typeof Building;
  title: L;
  desc: L;
  href?: string;
}> = [
  {
    icon: Newspaper,
    title: { en: "Blog", id: "Blog" },
    desc: { en: "Tips & industry insights", id: "Tips & insight industri" },
    href: "/resources/blog",
  },
  {
    icon: GraduationCap,
    title: { en: "Guides & Tutorials", id: "Panduan & Tutorial" },
    desc: { en: "Step-by-step learning", id: "Belajar bertahap" },
    href: "/resources/guides-tutorials",
  },
  {
    icon: HelpCircle,
    title: { en: "Help Center", id: "Pusat Bantuan" },
    desc: { en: "FAQ & documentation", id: "FAQ & dokumentasi" },
    href: "/help-center",
  },
  {
    icon: MessageSquare,
    title: { en: "Community", id: "Komunitas" },
    desc: {
      en: "Join 5,000+ finance pros",
      id: "Gabung 5.000+ praktisi keuangan",
    },
    href: "/resources/community",
  },
  {
    icon: FileSpreadsheet,
    title: { en: "Templates", id: "Template" },
    desc: {
      en: "Free Excel & spreadsheet kits",
      id: "Kit Excel & spreadsheet gratis",
    },
    href: "/resources/templates",
  },
];

// ─── Fitur Utama (card ikon sederhana) ────────────────────────────────
const featureCards: Array<{
  icon: typeof Zap;
  title: L;
  desc: L;
}> = [
  {
    icon: KeyRound,
    title: { en: "Role-Based Access", id: "Akses Berbasis Peran" },
    desc: {
      en: "Owner and Accountant roles with tailored permissions",
      id: "Peran Owner dan Akuntan dengan izin yang disesuaikan",
    },
  },
  {
    icon: ShieldCheck,
    title: { en: "Bank-Grade Security", id: "Keamanan Kelas Bank" },
    desc: {
      en: "Encrypted data with WhatsApp OTP and Google sign-in",
      id: "Data terenkripsi dengan OTP WhatsApp dan login Google",
    },
  },
  {
    icon: FileBarChart,
    title: { en: "Instant Financial Reports", id: "Laporan Keuangan Instan" },
    desc: {
      en: "Balance sheet, income statement, and cash flow, always current",
      id: "Neraca, laba rugi, dan arus kas, selalu terkini",
    },
  },
  {
    icon: Bot,
    title: { en: "AI CFO Assistant", id: "Asisten AI CFO" },
    desc: {
      en: "Ask about your finances and get insights instantly",
      id: "Tanya soal keuanganmu, dapat insight seketika",
    },
  },
  {
    icon: UsersRound,
    title: { en: "Team Collaboration", id: "Kolaborasi Tim" },
    desc: {
      en: "Invite your team to work together on one shared ledger",
      id: "Undang tim untuk bekerja dalam satu buku bersama",
    },
  },
  {
    icon: Download,
    title: { en: "Export & Integration", id: "Ekspor & Integrasi" },
    desc: {
      en: "Export reports anytime, fits right into your existing workflow",
      id: "Ekspor laporan kapan saja, menyatu dengan alur kerja Anda",
    },
  },
];

const toSlug = (value: string) => value.toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");



// Titik kecil di ujung kursor + ekor elastis (spring berantai) — hanya device ber-kursor.
function CursorGlow() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  // Rantai spring: tiap segmen mengikuti segmen sebelumnya dengan kelentingan
  // makin besar, sehingga saat kursor digerakin ekornya "ketarik" mengikuti.
  const tail1X = useSpring(x, { stiffness: 550, damping: 38, mass: 0.5 });
  const tail1Y = useSpring(y, { stiffness: 550, damping: 38, mass: 0.5 });
  const tail2X = useSpring(tail1X, { stiffness: 320, damping: 30, mass: 0.7 });
  const tail2Y = useSpring(tail1Y, { stiffness: 320, damping: 30, mass: 0.7 });
  const tail3X = useSpring(tail2X, { stiffness: 170, damping: 24, mass: 0.9 });
  const tail3Y = useSpring(tail2Y, { stiffness: 170, damping: 24, mass: 0.9 });

  useEffect(() => {
    const pointerMove = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
    };
    window.addEventListener("pointermove", pointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", pointerMove);
  }, [x, y]);

  return (
    <>
      <motion.div aria-hidden className="cursor-tail cursor-tail-3" style={{ left: tail3X, top: tail3Y }} />
      <motion.div aria-hidden className="cursor-tail cursor-tail-2" style={{ left: tail2X, top: tail2Y }} />
      <motion.div aria-hidden className="cursor-tail cursor-tail-1" style={{ left: tail1X, top: tail1Y }} />
      <motion.div aria-hidden className="cursor-dot" style={{ left: x, top: y }} />
    </>
  );
}

// ─── Animations ──────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

// ─── Main Page ───────────────────────────────────────────────────────
export default function HomePage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [heroVideoError, setHeroVideoError] = useState(false);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const opacityHero = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <div className="relative h-screen overflow-y-auto overflow-x-hidden homepage-scroll bg-white dark:bg-darkBg">
      <CursorGlow />
      <Navbar />
      <ScrollCardWrapper>
      {/* ═══ Hero ═══ */}
      <section className="relative min-h-screen flex items-center justify-center text-center px-6 overflow-hidden">
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
            <source src={heroBgAnim} type="video/webm" />
            <source src={heroBgAnimFallback} type="video/mp4" />
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
              {language === "id" ? "Kelola Masa Depan" : "Manage Your Financial"} <br />
              {language === "id" ? "Keuangan Anda" : "Future"} <br />
              <span className="bg-gradient-to-r from-primary-400 to-cyan-300 bg-clip-text text-transparent break-words">
                {language === "id" ? "Dengan Percaya Diri" : "With Confidence"}
              </span>
            </h2>
            <p className="mt-6 text-base sm:text-lg md:text-xl text-gray-100 max-w-2xl mx-auto px-2">
              {language === "id" ? "LedgerFlow menghilangkan pembukuan manual, mempercepat tutup buku bulanan, dan menyajikan kondisi keuangan secara real-time." : "LedgerFlow eliminates manual bookkeeping, speeds up month-end close, and gives you real-time financials."}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 w-full px-4">
              {user ? (
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto justify-center px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                >
                  {language === "id" ? "Buka Dashboard" : "Go to Dashboard"} <ChevronRight size={18} />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="w-full sm:w-auto justify-center px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                  >
                    {language === "id" ? "Coba gratis 15 hari" : "15-day free trial"} <ChevronRight size={18} />
                  </Link>
                  <Link
                    to="/login"
                    className="w-full sm:w-auto text-center px-6 py-3 border border-white/30 rounded-xl text-white hover:bg-white/10 transition"
                  >
                    {language === "id" ? "Lihat cara kerjanya" : "See how it works"}
                  </Link>
                </>
              )}
            </div>
            <p className="mt-6 text-xs sm:text-sm text-gray-300 flex flex-wrap items-center justify-center gap-2 px-4 text-center">
              <Lock size={14} className="flex-shrink-0" />
              {language === "id"
                ? "Keamanan kelas enterprise dengan enkripsi penuh"
                : "Enterprise-grade security with full encryption"}
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
              {language === "id" ? "Dipercaya bisnis modern" : "Trusted by modern businesses"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {language === "id" ? "Keamanan setingkat bank & kepatuhan perusahaan" : "Bank-grade security & enterprise compliance"}
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
                    {language === "id" ? "Data Bank via Plaid" : "Bank Data via Plaid"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {language === "id"
                      ? "Kredensial tidak pernah disimpan di server kami"
                      : "Credentials never stored on our servers"}
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
                    {language === "id" ? "Pembayaran via Stripe" : "Payments via Stripe"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {language === "id"
                      ? "Dipercaya jutaan bisnis di seluruh dunia"
                      : "Trusted by millions of businesses"}
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
              { icon: Shield, label: language === "id" ? "Enkripsi 256-bit AES" : "256-bit AES Encryption" },
              { icon: Globe, label: language === "id" ? "Multi-mata uang" : "Multi-currency" },
              { icon: Cloud, label: language === "id" ? "Uptime 99,9%" : "99.9% Uptime" },
              { icon: Lock, label: language === "id" ? "Login OTP WhatsApp" : "WhatsApp OTP Login" },
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
          className="relative py-20 px-6 overflow-hidden"
        >
          {/* Background Glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[150px]" />
          </div>

          <div className="relative max-w-[1500px] mx-auto">
            {/* Heading */}
            <div className="text-center max-w-4xl mx-auto mb-16">
              <BorderBeamBadge text={language === "id" ? "Demo Produk" : "Product Demo"} icon={<Sparkles size={16} />} />
              <h2 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
                {language === "id" ? "Lihat LedgerFlow" : "See LedgerFlow"}
                <span className="block bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-400 bg-clip-text text-transparent">
                  {language === "id" ? "Secara Real-Time" : "In Real-Time"}
                </span>
              </h2>
              <p className="mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-400">
                {language === "id"
                  ? "Kelola transaksi, pantau arus kas, lacak pengeluaran, dan dapatkan insight yang bisa ditindaklanjuti lewat dashboard keuangan yang dirancang dengan indah."
                  : "Manage transactions, monitor cash flow, track expenses, and gain actionable insights through a beautifully designed financial dashboard."}
              </p>
            </div>

            {/* Video Container */}
            <div className="relative group">
              {/* Outer Glow */}
              <div className="absolute -inset-10 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-sky-500/20 blur-3xl rounded-[50px]" />

              {/* Main Card */}
              <div className="relative overflow-hidden rounded-[36px] border border-white/20 bg-white/60 dark:bg-darkCard/70 backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,0.18)] transition-all duration-700 group-hover:-translate-y-2">
                <InViewVideo
                  sources={[
                    { src: dashboardDemo, type: "video/webm" },
                    { src: dashboardDemoFallback, type: "video/mp4" },
                  ]}
                  className="w-full min-h-[100px] md:min-h-[300px] lg:min-h-[450px] object-cover"
                />
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
                  <p className="text-xs text-gray-500">
                    {language === "id" ? "Status Sistem" : "System Status"}
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {language === "id"
                      ? "Semua Sistem Beroperasi"
                      : "All Systems Operational"}
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
                  <p className="text-xs text-gray-500">
                    {language === "id" ? "Pertumbuhan Bulanan" : "Monthly Growth"}
                  </p>
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
          {language === "id" ? "Jelajahi Fitur di Dalamnya" : "Explore What's Inside"}
        </h2>
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
          {language === "id" ? "Semua alat yang Anda perlukan, dalam satu platform." : "Every tool you need, built into one platform."}
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
              {language === "id" ? "Semua yang Anda butuhkan untuk berkembang" : "Everything you need to scale"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-3">
              {language === "id" ? "Fitur andal yang dibuat untuk tim keuangan modern" : "Powerful features built for modern finance teams"}
            </p>
          </motion.div>
          <div className="grid gap-5 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feat, idx) => (
              <motion.div
                key={feat.title.en}
                initial={{ opacity: 0, x: idx % 3 === 0 ? -56 : idx % 3 === 1 ? 56 : 0, y: idx % 3 === 2 ? 56 : 16 }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, amount: 0.22 }}
                transition={{ duration: 0.62, delay: idx * 0.09, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6, transition: { type: "tween", duration: 0.15 } }}
                className="relative group bg-white/80 dark:bg-darkCard/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 min-w-0 border border-primary-500/20 shadow-md hover:shadow-xl transition-all duration-150"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-500/10 dark:bg-primary-500/15 text-primary-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feat.icon size={22} />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                  {feat.title[language]}
                </h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  {feat.desc[language]}
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
            {language === "id"
              ? "Siap mentransformasi operasi keuangan Anda?"
              : "Ready to transform your financial operations?"}
          </h2>
          <p className="mt-4 text-primary-100 text-base sm:text-lg">
            {language === "id"
              ? "Bergabunglah dengan ribuan bisnis yang menggunakan LedgerFlow"
              : "Join thousands of businesses using LedgerFlow"}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4">
            {user ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto justify-center px-6 py-3 bg-white text-primary-700 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center gap-2"
              >
                {language === "id" ? "Buka Dashboard" : "Go to Dashboard"} <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto justify-center px-6 py-3 bg-white text-primary-700 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center gap-2 shadow-md"
                >
                  {language === "id"
                    ? "Mulai uji coba gratis 15 hari"
                    : "Start 15-day free trial"}{" "}
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto text-center px-6 py-3 border border-white/30 rounded-xl font-semibold hover:bg-white/10 transition"
                >
                  {language === "id" ? "Hubungi Sales" : "Contact sales"}
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
