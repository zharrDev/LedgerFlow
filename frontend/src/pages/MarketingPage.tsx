import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Layers, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useLanguage } from "../hooks/useLanguage";
import { TextReveal } from "../components/TextReveal";
import { SCROLL_REVEAL, SCROLL_REVEAL_STAGGER } from "../lib/scrollAnimations";
import { motion } from "framer-motion";

type Item = { title: string; description: string; icon: LucideIcon };
type Copy = { eyebrow: string; title: string; description: string; items: Item[] };

const VALID_SECTIONS = ["solutions", "products", "resources", "tools", "company"] as const;
type ValidSection = typeof VALID_SECTIONS[number];

const detailPaths = {
  solutions: ["small-businesses", "mid-market-companies", "accountants-firms"],
  products: ["chart-of-accounts", "financial-reports", "security-compliance"],
  resources: ["guides-tutorials", "help-center", "community"],
};

const content: Record<"solutions" | "products" | "resources", Record<"id" | "en", Copy>> = {
  solutions: {
    id: { eyebrow: "SOLUSI LEDGERFLOW", title: "Keuangan yang tumbuh bersama bisnis Anda", description: "Satu workspace keuangan yang aman untuk tim kecil, perusahaan berkembang, dan firma akuntansi.", items: [
      { title: "Usaha Kecil", description: "Pembukuan harian, laporan instan, dan data siap pajak tanpa spreadsheet yang berantakan.", icon: Layers },
      { title: "Perusahaan Berkembang", description: "Kelola beberapa entitas, persetujuan tim, serta analitik yang mendukung keputusan besar.", icon: Sparkles },
      { title: "Akuntan & Firma", description: "Kelola klien dalam workspace terpisah dengan akses yang tepat untuk setiap anggota tim.", icon: ShieldCheck },
    ] },
    en: { eyebrow: "LEDGERFLOW SOLUTIONS", title: "Finance that grows with your business", description: "One secure finance workspace for small teams, scaling companies, and accounting firms.", items: [
      { title: "Small Businesses", description: "Daily bookkeeping, instant reports, and tax-ready data without messy spreadsheets.", icon: Layers },
      { title: "Growing Companies", description: "Manage multiple entities, team approvals, and analytics for bigger decisions.", icon: Sparkles },
      { title: "Accountants & Firms", description: "Manage clients in separate workspaces with the right access for every team member.", icon: ShieldCheck },
    ] },
  },
  products: {
    id: { eyebrow: "PRODUK LEDGERFLOW", title: "Semua alat keuangan, dalam satu alur kerja", description: "Otomatiskan pekerjaan rutin agar tim Anda dapat fokus pada keputusan yang berdampak.", items: [
      { title: "Buku Besar Cerdas", description: "Chart of accounts dan jurnal double-entry yang selalu seimbang dan mudah ditelusuri.", icon: Layers },
      { title: "Laporan Real-Time", description: "Pantau laba rugi, neraca, dan arus kas dengan data terbaru setiap saat.", icon: Sparkles },
      { title: "Keamanan Terpercaya", description: "Role-based access, enkripsi, dan riwayat audit untuk menjaga setiap angka.", icon: ShieldCheck },
    ] },
    en: { eyebrow: "LEDGERFLOW PRODUCTS", title: "Every finance tool in one workflow", description: "Automate routine work so your team can focus on decisions that matter.", items: [
      { title: "Smart Ledger", description: "Chart of accounts and double-entry journals that stay balanced and easy to trace.", icon: Layers },
      { title: "Real-Time Reports", description: "Monitor income, balance sheet, and cash flow with up-to-date data at any moment.", icon: Sparkles },
      { title: "Trusted Security", description: "Role-based access, encryption, and audit history keep every number protected.", icon: ShieldCheck },
    ] },
  },
  resources: {
    id: { eyebrow: "SUMBER DAYA", title: "Belajar, dibantu, lalu bergerak lebih cepat", description: "Panduan praktis dan bantuan manusia untuk membantu Anda menguasai keuangan bisnis.", items: [
      { title: "Panduan & Tutorial", description: "Langkah demi langkah untuk menyiapkan pembukuan dan proses close yang lebih cepat.", icon: Layers },
      { title: "Pusat Bantuan", description: "Jawaban cepat untuk pertanyaan umum, akses akun, dan penggunaan LedgerFlow.", icon: Sparkles },
      { title: "Komunitas Profesional", description: "Temukan praktik terbaik dari pemilik bisnis dan praktisi keuangan lainnya.", icon: ShieldCheck },
    ] },
    en: { eyebrow: "RESOURCES", title: "Learn, get help, and move faster", description: "Practical guides and human support to help you master your business finances.", items: [
      { title: "Guides & Tutorials", description: "Step-by-step support for setting up bookkeeping and a faster close process.", icon: Layers },
      { title: "Help Center", description: "Quick answers for common questions, account access, and using LedgerFlow.", icon: Sparkles },
      { title: "Professional Community", description: "Discover best practices from business owners and finance practitioners.", icon: ShieldCheck },
    ] },
  },
};

export default function MarketingPage() {
  const { section = "products" } = useParams<{ section: string }>();
  const validSection = VALID_SECTIONS.includes(section as ValidSection) ? (section as ValidSection) : null;
  const key = validSection && validSection in content ? validSection as keyof typeof content : "products";
  const { language } = useLanguage();
  const page = content[key][language];
  const label = language === "id" ? { home: "Beranda", start: "Mulai gratis", explore: "Jelajahi", benefit: "Yang Anda dapatkan" } : { home: "Home", start: "Start free", explore: "Explore", benefit: "What you get" };

  if (!validSection) {
    return <Navigate to="/not-found" replace />;
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-darkBg dark:text-white">
      <Navbar />
      <main className="pt-20">
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden px-5 py-20 sm:py-28"
        >
          <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="relative mx-auto max-w-4xl text-center">
            <p className="text-xs font-extrabold tracking-[.22em] text-primary-500">{page.eyebrow}</p>
            <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-6xl">
              <TextReveal text={page.title} delay={0.1} language={language} />
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-300"
            >
              {page.description}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <Link to="/register" className="mt-9 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-cyan-500 px-6 py-3 font-bold text-white shadow-lg shadow-primary-500/25">
                {label.start}
                <ArrowRight size={18} />
              </Link>
            </motion.div>
          </div>
        </motion.section>

        <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-6">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5 }}
            className="mb-5 text-center text-sm font-bold tracking-widest text-primary-500"
          >
            {label.explore}
          </motion.p>
          <div className="grid gap-5 md:grid-cols-3">
            {page.items.map((item, index) => (
              <motion.div
                key={item.title}
                {...SCROLL_REVEAL_STAGGER(index)}
                whileHover={{ y: -8, transition: { type: "tween", duration: 0.15 } }}
              >
                <Link
                  to={`/${key}/${detailPaths[key][index]}`}
                  className="group relative block h-full overflow-hidden rounded-3xl border border-primary-500/15 bg-white p-7 shadow-lg shadow-primary-950/5 transition duration-300 hover:-translate-y-2 hover:border-primary-400/40 hover:shadow-2xl dark:bg-darkCard"
                >
                  <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-400/10 transition group-hover:scale-150" />
                  <item.icon className="relative h-11 w-11 rounded-xl bg-primary-500/10 p-2 text-primary-500 transition group-hover:rotate-3 group-hover:scale-110" />
                  <h2 className="relative mt-5 text-xl font-bold">{item.title}</h2>
                  <p className="relative mt-3 leading-relaxed text-gray-600 dark:text-gray-300">{item.description}</p>
                  <div className="relative mt-6 flex items-center gap-2 text-sm font-semibold text-primary-500">
                    <CheckCircle2 size={17} /> {label.benefit}
                    <ArrowRight size={16} className="ml-auto transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div
            {...SCROLL_REVEAL}
            className="mt-12 rounded-3xl bg-gray-950 px-7 py-8 text-white sm:flex sm:items-center sm:justify-between sm:px-10"
          >
            <div>
              <p className="text-sm font-bold text-cyan-300">LedgerFlow</p>
              <h2 className="mt-2 text-2xl font-bold">
                {language === "id" ? "Siap membuat keuangan lebih sederhana?" : "Ready to make finance simpler?"}
              </h2>
            </div>
            <Link to="/register" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-gray-950 sm:mt-0">
              {label.start}
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
