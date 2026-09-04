// src/pages/HomePage.tsx
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
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
  Zap,
  KeyRound,
  ShieldCheck,
  Bot,
  Download,
  FileBarChart,
  UsersRound,
} from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import OwlMascot from "../components/home/OwlMascot";
import FeatureCarousel from "../components/home/FeatureCarousel";
import ScrollCardWrapper from "../components/home/ScrollCardWrapper";
import BorderBeamBadge from "../components/home/BorderBeamBadge";
import InViewVideo from "../components/home/InViewVideo";
import { TextReveal } from "../components/TextReveal";
import ScrollReveal from "../components/ScrollReveal";
import { SCROLL_REVEAL, SCROLL_REVEAL_STAGGER } from "../lib/scrollAnimations";
import FloatingIconField from "../components/home/FloatingIconField";

// Video demo — jika file belum tersedia, section video akan di-skip
let dashboardDemo = "";
let dashboardDemoFallback = "";
try {
  dashboardDemo = new URL("../assets/dashboard-demo.webm", import.meta.url)
    .href;
  dashboardDemoFallback = new URL(
    "../assets/dashboard-demo-D7bRiZnr.mp4",
    import.meta.url,
  ).href;
} catch {
  dashboardDemo = "";
}



// ─── Type for featureCards (kept inline since it's homepage-specific) ──
type L = { en: string; id: string };

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

// ─── Main Page ───────────────────────────────────────────────────────
export default function HomePage() {
  const { user } = useAuth();
  const { language } = useLanguage();

  return (
    <div
      className="relative h-screen overflow-y-auto overflow-x-hidden homepage-scroll bg-white dark:bg-darkBg"
    >
      <Navbar />
      <ScrollCardWrapper>
        {/* ═══ Hero ═══ */}
        <section className="relative min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-darkBg dark:to-darkBg">
          {/* Desktop: 2 kolom (teks kiri, 3D kanan). Mobile: teks atas, 3D bawah. */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 lg:pt-24 min-h-[100svh] flex flex-col lg:grid lg:grid-cols-2 lg:items-center gap-8 lg:gap-4">
            {/* ── Teks Kiri ──
                Mobile: center; Desktop (lg): rata kiri dalam grid 2 kolom */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-center lg:text-left flex flex-col items-center lg:items-start"
            >
              <BorderBeamBadge
                text={
                  language === "id"
                    ? "Akuntansi Modern"
                    : "Modern Accounting"
                }
                icon={<Sparkles size={14} />}
              />

              <h2 className="mt-4 sm:mt-5 text-[1.6rem] leading-[1.15] sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={language}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {language === "id" ? (
                      <>
                        <span className="block">Kelola Masa Depan</span>
                        <span className="block">Keuangan Anda</span>
                      </>
                    ) : (
                      <>
                        <span className="block">Manage Your</span>
                        <span className="block">Financial Future</span>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
                <span className="block bg-gradient-to-r from-primary-600 to-cyan-500 dark:from-primary-400 dark:to-cyan-300 bg-clip-text text-transparent">
                  <TextReveal
                    text={
                      language === "id"
                        ? "Dengan Percaya Diri"
                        : "With Confidence"
                    }
                    delay={0.4}
                    staggerDelay={0.03}
                    language={language}
                  />
                </span>
              </h2>

              <AnimatePresence mode="wait">
                <motion.p
                  key={language}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
                  className="mt-6 text-base sm:text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-lg mx-auto lg:mx-0 leading-relaxed"
                >
                  {language === "id"
                    ? "LedgerFlow menghilangkan pembukuan manual, mempercepat tutup buku bulanan, dan menyajikan kondisi keuangan secara real-time."
                    : "LedgerFlow eliminates manual bookkeeping, speeds up month-end close, and gives you real-time financials."}
                </motion.p>
              </AnimatePresence>

              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center sm:flex-wrap gap-3">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="justify-center px-5 sm:px-7 py-3 sm:py-3.5 text-sm sm:text-base bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:scale-[1.02] transition-all flex items-center gap-2"
                  >
                    {language === "id" ? "Buka Dashboard" : "Go to Dashboard"}{" "}
                    <ChevronRight size={18} />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="justify-center px-5 sm:px-7 py-3 sm:py-3.5 text-sm sm:text-base bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:scale-[1.02] transition-all flex items-center gap-2"
                    >
                      {language === "id"
                        ? "Coba Gratis 15 Hari"
                        : "15-Day Free Trial"}{" "}
                      <ArrowRight size={18} />
                    </Link>
                    <Link
                      to="/login"
                      className="justify-center px-5 sm:px-7 py-3 sm:py-3.5 text-sm sm:text-base border border-gray-200 dark:border-white/20 rounded-xl text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-all font-medium flex items-center gap-2"
                    >
                      <PlayCircle size={18} className="opacity-60" />
                      {language === "id"
                        ? "Lihat Cara Kerjanya"
                        : "See How It Works"}
                    </Link>
                  </>
                )}
              </div>

              <p className="mt-4 sm:mt-5 text-xs sm:text-sm text-gray-400 flex items-center gap-2">
                <Lock size={14} className="flex-shrink-0" />
                {language === "id"
                  ? "Keamanan kelas enterprise dengan enkripsi penuh"
                  : "Enterprise-grade security with full encryption"}
              </p>
            </motion.div>

            {/* ── Floating Icons + Device Mockup Kanan ──
                Hidden below lg: pixel-locked orbit (350px image, 600px arms)
                tidak muat di viewport sempit — teks full-width lebih rapih. */}
            <div className="hidden lg:block relative h-[70vh] min-h-[480px]">
              <FloatingIconField />
            </div>
          </div>
        </section>

        {/* ═══ Security ═══ */}
        <motion.section id="security" {...SCROLL_REVEAL} className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              {...SCROLL_REVEAL_STAGGER(0)}
              className="text-center mb-12"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                <TextReveal
                  text={
                    language === "id"
                      ? "Dipercaya bisnis modern"
                      : "Trusted by modern businesses"
                  }
                  language={language}
                />
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {language === "id"
                  ? "Keamanan setingkat bank & kepatuhan perusahaan"
                  : "Bank-grade security & enterprise compliance"}
              </p>
            </motion.div>
            <div className="grid gap-5 sm:gap-8 md:grid-cols-2">
              <motion.div
                {...SCROLL_REVEAL_STAGGER(1)}
                className="bg-white dark:bg-darkCard rounded-2xl shadow-xl border border-primary-500/20 p-5 sm:p-6 min-w-0 hover:shadow-2xl transition"
              >
                <div className="flex items-start gap-3 mb-4 flex-wrap">
                  <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center text-cyan-600">
                    <Building size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                      {language === "id"
                        ? "Data Bank via Plaid"
                        : "Bank Data via Plaid"}
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
                {...SCROLL_REVEAL_STAGGER(2)}
                className="bg-white dark:bg-darkCard rounded-2xl shadow-xl border border-primary-500/20 p-5 sm:p-6 min-w-0 hover:shadow-2xl transition"
              >
                <div className="flex items-start gap-3 mb-4 flex-wrap">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600">
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                      {language === "id"
                        ? "Pembayaran via Stripe"
                        : "Payments via Stripe"}
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
              {...SCROLL_REVEAL_STAGGER(3)}
              className="flex flex-wrap justify-center gap-6 mt-10 pt-4 border-t border-gray-200 dark:border-gray-800"
            >
              {[
                {
                  icon: Shield,
                  label:
                    language === "id"
                      ? "Enkripsi 256-bit AES"
                      : "256-bit AES Encryption",
                },
                {
                  icon: Globe,
                  label:
                    language === "id" ? "Multi-mata uang" : "Multi-currency",
                },
                {
                  icon: Cloud,
                  label: language === "id" ? "Uptime 99,9%" : "99.9% Uptime",
                },
                {
                  icon: Lock,
                  label:
                    language === "id"
                      ? "Login OTP WhatsApp"
                      : "WhatsApp OTP Login",
                },
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
            id="demo"
            {...SCROLL_REVEAL}
            className="relative py-20 px-6 overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[150px]" />
            </div>

            <div className="relative max-w-[1500px] mx-auto">
              {/* Heading */}
              <div className="text-center max-w-4xl mx-auto mb-16">
                <BorderBeamBadge
                  text={language === "id" ? "Demo Produk" : "Product Demo"}
                  icon={<Sparkles size={16} />}
                />
                <h2 className="mt-6 text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
                  <TextReveal
                    text={
                      language === "id" ? "Lihat LedgerFlow" : "See LedgerFlow"
                    }
                    language={language}
                  />
                  <span className="block bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-400 bg-clip-text text-transparent">
                    <TextReveal
                      text={
                        language === "id" ? "Secara Real-Time" : "In Real-Time"
                      }
                      delay={0.15}
                      language={language}
                    />
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
                <div className="relative overflow-hidden rounded-[36px] border border-white/20 bg-white/60 dark:bg-darkCard/70 backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,0.18)] transition-[background-color,border-color,box-shadow,transform] duration-700 group-hover:-translate-y-2">
                  <ScrollReveal direction="scale" className="w-full">
                    <InViewVideo
                      sources={[
                        { src: dashboardDemo, type: "video/webm" },
                        { src: dashboardDemoFallback, type: "video/mp4" },
                      ]}
                      className="w-full min-h-[100px] md:min-h-[300px] lg:min-h-[450px] object-cover"
                    />
                  </ScrollReveal>
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
                      {language === "id"
                        ? "Pertumbuhan Bulanan"
                        : "Monthly Growth"}
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
          {...SCROLL_REVEAL}
          className="text-center max-w-2xl mx-auto px-6 py-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            <TextReveal
              text={
                language === "id"
                  ? "Jelajahi Fitur di Dalamnya"
                  : "Explore What's Inside"
              }
              language={language}
            />
          </h2>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
            {language === "id"
              ? "Semua alat yang Anda perlukan, dalam satu platform."
              : "Every tool you need, built into one platform."}
          </p>
        </motion.div>
        <FeatureCarousel />

        {/* ═══ Features ═══ */}
        <section id="features" className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <motion.div {...SCROLL_REVEAL} className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                <TextReveal
                  text={
                    language === "id"
                      ? "Semua yang Anda butuhkan untuk berkembang"
                      : "Everything you need to scale"
                  }
                  language={language}
                />
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-3">
                {language === "id"
                  ? "Fitur andal yang dibuat untuk tim keuangan modern"
                  : "Powerful features built for modern finance teams"}
              </p>
            </motion.div>
            <div className="grid gap-5 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
              {featureCards.map((feat, idx) => (
                <motion.div
                  key={feat.title.en}
                  {...SCROLL_REVEAL_STAGGER(idx)}
                  whileHover={{
                    y: -6,
                    transition: { type: "tween", duration: 0.15 },
                  }}
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

        {/* ═══ CTA + Owl Mascot ═══ */}
        <motion.section
          {...SCROLL_REVEAL}
          className="pt-28 sm:pt-32 md:pt-36 pb-20 px-4 sm:px-6"
        >
          {/* Wrapper positioning context: owl + kartu sejajar */}
          <div className="relative max-w-5xl mx-auto">
            {/* Owl hinggap DI ATAS tepi kiri kartu — sibling, bukan anak
              kartu. Kaki (-87% translate) menempel di atap, badan di luar. */}
            <div className="absolute top-0 left-6 sm:left-10 md:left-14 lg:left-16 z-20 -translate-y-[87%]">
              <OwlMascot />
            </div>

            <div className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-cyan-900 rounded-[1.75rem] sm:rounded-[2.5rem] py-16 sm:py-20 md:py-24 px-6 sm:px-10 md:px-16 text-center text-white shadow-2xl">
              {/* Dekorasi glow latar — dipotong di layer sendiri supaya
                kartu tidak perlu overflow-hidden (owl bebas keluar atap) */}
              <div className="absolute inset-0 rounded-[1.75rem] sm:rounded-[2.5rem] overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-[100px]" />
                <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-primary-400/20 blur-[100px]" />
              </div>

              <div className="relative">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-snug">
                  <TextReveal
                    text={
                      language === "id"
                        ? "Ambil Kendali Keuangan Anda Hari Ini"
                        : "Take Control of Your Finances Today"
                    }
                    language={language}
                  />
                </h2>
                <p className="mt-4 text-primary-100 text-base sm:text-lg">
                  {language === "id"
                    ? "Mulai uji coba gratis 15 hari — tanpa kartu kredit"
                    : "Start your 15-day free trial — no credit card required"}
                </p>
                <div className="mt-8 flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4">
                  {user ? (
                    <Link
                      to="/dashboard"
                      className="w-full sm:w-auto justify-center px-6 py-3 bg-white text-primary-700 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center gap-2"
                    >
                      {language === "id" ? "Buka Dashboard" : "Go to Dashboard"}{" "}
                      <ArrowRight size={18} />
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/register"
                        className="w-full sm:w-auto justify-center px-6 py-3 bg-white text-primary-700 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center gap-2 shadow-md"
                      >
                        {language === "id"
                          ? "Mulai uji coba gratis 15 hari"
                          : "Start Free Trial"}{" "}
                        <ArrowRight size={18} />
                      </Link>
                      <Link
                        to="/login"
                        className="w-full sm:w-auto text-center px-6 py-3 border border-white/30 rounded-xl font-semibold hover:bg-white/10 transition"
                      >
                        {language === "id" ? "Hubungi Sales" : "Talk to Sales"}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <Footer />
      </ScrollCardWrapper>
    </div>
  );
}
