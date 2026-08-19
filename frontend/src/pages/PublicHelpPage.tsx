import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import ThemeSwitcher from "../components/ThemeSwitcher";
import Footer from "../components/Footer";
import { FaqAccordion } from "../components/help/FaqAccordion";
import { ContactCards } from "../components/help/ContactCards";
import { helpFaqs, helpContactCards } from "../data/helpCenterContent";
import logo from "../assets/ledgerflow.webp";

export default function PublicHelpPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-primary-50/30 dark:from-darkBg dark:via-darkBg dark:to-primary-900/10">
      {/* Public header (konsisten dengan landing) */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-darkBg/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src={logo}
              alt="LedgerFlow"
              className="w-9 h-9 object-contain group-hover:scale-105 transition-transform"
            />
            <span className="font-bold text-gray-900 dark:text-white tracking-tight">
              LedgerFlow
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeSwitcher />
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-500 px-3 py-2 rounded-lg transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 px-4 py-2 rounded-xl shadow-sm transition-colors"
            >
              Daftar
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14 space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/25">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Help Center
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
            FAQ & kontak support LedgerFlow — bisa diakses tanpa login
          </p>
        </motion.div>

        <section>
          <ContactCards cards={helpContactCards} />
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <HelpCircle size={18} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Pertanyaan yang Sering Ditanyakan
            </h2>
          </div>
          <FaqAccordion faqs={helpFaqs} />
        </section>
      </main>

      <Footer />
    </div>
  );
}
