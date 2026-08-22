// frontend/src/components/DetailPageTemplate.tsx
// Shared visual template for detail pages — solutions, products, tools, resources, company.

import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { ArrowLeft, ArrowRight, type LucideIcon } from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useLanguage } from "../hooks/useLanguage";

type L = { en: string; id: string };

export type DetailPageContent = {
  heroIcon: LucideIcon;
  heroTitle: L;
  heroDescription: L;
  painPoints?: Array<{ title: L; description: L }>;
  keyCapabilities?: Array<{ title: L; description: L }>;
  ctaText?: L;
  /** Optional interactive content (e.g. calculator) rendered between capabilities and CTA */
  interactiveContent?: React.ReactNode;
};

// ─── Animation Variants ────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

// Hero element animations (staggered entrance)
const breadcrumbAnim = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut", delay: 0 } },
};
const badgeAnim = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut", delay: 0.1 } },
};
const titleAnim = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut", delay: 0.2 } },
};
const descAnim = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut", delay: 0.3 } },
};

export default function DetailPageTemplate({
  content,
  backHref,
  backLabel,
}: {
  content: DetailPageContent;
  backHref: string;
  backLabel?: string;
}) {
  const { language } = useLanguage();
  const id = language === "id";
  const Icon = content.heroIcon;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-darkBg">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        {/* ═══ Hero ═══ */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
          {/* Breadcrumb — own row with margin-bottom */}
          <motion.div
            {...breadcrumbAnim}
            className="mb-8"
          >
            <Link
              to={backHref}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition"
            >
              <ArrowLeft size={14} />
              {backLabel ?? (id ? "Kembali" : "Back")}
            </Link>
          </motion.div>

          {/* Badge icon — centered, normal flow, no overlap */}
          <motion.div {...badgeAnim} className="flex justify-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/25">
              <Icon className="w-8 h-8 text-white" />
            </div>
          </motion.div>

          {/* Title + Description */}
          <motion.h1
            {...titleAnim}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white"
          >
            {content.heroTitle[language]}
          </motion.h1>
          <motion.p
            {...descAnim}
            className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
          >
            {content.heroDescription[language]}
          </motion.p>
        </section>

        {/* ═══ Pain Points ═══ */}
        {content.painPoints && content.painPoints.length > 0 && (
          <motion.section
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="mt-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto"
          >
            <motion.h2 variants={fadeUp} className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
              {id ? "Masalah yang Sering Dihadapi" : "Common Challenges"}
            </motion.h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {content.painPoints.map((point, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="rounded-2xl bg-red-50/60 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/30 p-5"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {point.title[language]}
                  </h3>
                  <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
                    {point.description[language]}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ═══ Key Capabilities / Relevant Features ═══ */}
        {content.keyCapabilities && content.keyCapabilities.length > 0 && (
          <motion.section
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="mt-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto"
          >
            <motion.h2 variants={fadeUp} className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
              {id ? "Fitur Relevan di LedgerFlow" : "Relevant LedgerFlow Features"}
            </motion.h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {content.keyCapabilities.map((cap, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="flex items-start gap-4 rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-5"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-500/10 dark:bg-primary-500/15 text-primary-500 flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {cap.title[language]}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {cap.description[language]}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ═══ Interactive Content (optional) ═══ */}
        {content.interactiveContent && (
          <div className="mt-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
            {content.interactiveContent}
          </div>
        )}

        {/* ═══ CTA ═══ */}
        <motion.section
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mt-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto text-center"
        >
          <div className="rounded-3xl bg-gradient-to-r from-primary-600 to-primary-700 p-8 sm:p-12 text-white shadow-2xl">
            <h2 className="text-xl sm:text-2xl font-bold">
              {content.ctaText?.[language] ?? (id ? "Siap mencoba?" : "Ready to get started?")}
            </h2>
            <Link
              to="/register"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-700 rounded-xl font-semibold hover:bg-gray-100 transition shadow-md"
            >
              {id ? "Mulai Gratis" : "Start Free Trial"} <ArrowRight size={16} />
            </Link>
          </div>
        </motion.section>
      </main>
      <Footer />
    </div>
  );
}
