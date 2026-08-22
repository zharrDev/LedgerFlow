import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { FaqAccordion } from "../components/help/FaqAccordion";
import { ContactCards } from "../components/help/ContactCards";
import { helpFaqs, helpContactCards } from "../data/helpCenterContent";
import { useLanguage } from "../hooks/useLanguage";

export default function PublicHelpPage() {
  const { language } = useLanguage();
  const id = language === "id";
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-primary-50/30 dark:from-darkBg dark:via-darkBg dark:to-primary-900/10">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 pt-24 pb-10 sm:pb-14 space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/25">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {id ? "Pusat Bantuan" : "Help Center"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
            {id
              ? "FAQ & kontak support LedgerFlow — bisa diakses tanpa login"
              : "LedgerFlow FAQ & support contacts — accessible without login"}
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
              {id
                ? "Pertanyaan yang Sering Ditanyakan"
                : "Frequently Asked Questions"}
            </h2>
          </div>
          <FaqAccordion faqs={helpFaqs} />
        </section>
      </main>

      <Footer />
    </div>
  );
}
