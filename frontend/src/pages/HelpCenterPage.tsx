import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";

import {
  HelpCircle,
  Send,
  CheckCircle2,
} from "lucide-react";
import { FaqAccordion } from "../components/help/FaqAccordion";
import { ContactCards } from "../components/help/ContactCards";
import { helpFaqs, helpContactCards } from "../data/helpCenterContent";
import { useLanguage } from "../hooks/useLanguage";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export default function HelpCenterPage() {
  const { language } = useLanguage();
  const id = language === "id";
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.message.trim()) return;

    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setForm({ name: "", email: "", message: "" });
      setTimeout(() => setSent(false), 4000);
    }, 1200);
  };

  return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
        className="max-w-4xl mx-auto space-y-8"
      >
        <motion.div variants={itemVariants} className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/25">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Help Center
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
            {id
              ? "Temukan jawaban untuk pertanyaan umum atau hubungi kami untuk bantuan"
              : "Find answers to common questions or contact us for help"}
          </p>
        </motion.div>

        <motion.div variants={itemVariants}>
          <ContactCards cards={helpContactCards} />
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
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
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-6 lg:p-8"
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400">
              <Send size={18} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {id ? "Hubungi Kami" : "Contact Us"}
            </h2>
          </div>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {id ? "Pesan Terkirim!" : "Message Sent!"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {id
                    ? "Terima kasih, tim kami akan segera menghubungi Anda"
                    : "Thank you, our team will contact you shortly"}
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                      {id ? "Nama" : "Name"}
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder={id ? "Nama Anda" : "Your name"}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkBg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      placeholder={id ? "email@anda.com" : "you@email.com"}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkBg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    {id ? "Pesan" : "Message"}
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) =>
                      setForm({ ...form, message: e.target.value })
                    }
                    rows={4}
                    placeholder={
                      id
                        ? "Tuliskan pertanyaan atau masalah Anda..."
                        : "Write your question or issue..."
                    }
                    required
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkBg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition resize-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={sending}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    <Send
                      size={16}
                      className={sending ? "animate-pulse" : ""}
                    />
                    {sending
                      ? id
                        ? "Mengirim..."
                        : "Sending..."
                      : id
                      ? "Kirim Pesan"
                      : "Send Message"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
  );
}
