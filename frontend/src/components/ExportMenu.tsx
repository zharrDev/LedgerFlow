import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, FileText, FileSpreadsheet, FileDown } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { tx } from "../i18n/tx";

export type ExportFormat = "pdf" | "excel" | "word" | "csv";

interface ExportMenuProps {
  disabled?: boolean;
  formats?: ExportFormat[];
  onExport: (format: ExportFormat) => void;
  label?: string;
  align?: "left" | "right";
}

const FORMAT_META: Record<
  ExportFormat,
  { label: string; icon: typeof FileText; color: string }
> = {
  pdf: { label: "Export PDF", icon: FileText, color: "text-rose-500" },
  excel: {
    label: "Export Excel",
    icon: FileSpreadsheet,
    color: "text-emerald-500",
  },
  word: { label: "Export Word", icon: FileText, color: "text-blue-500" },
  csv: { label: "Export CSV", icon: FileDown, color: "text-amber-500" },
};

export function ExportMenu({
  disabled,
  formats = ["pdf", "excel", "word"],
  onExport,
  label,
  align = "right",
}: ExportMenuProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative w-full sm:w-auto" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-darkCard shadow-sm"
      >
        <Download size={16} />
        <span className="text-sm font-medium">{label ?? tx(language, "Export", "Ekspor")}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className={`absolute ${align === "right" ? "right-0" : "left-0"} mt-2 w-full sm:w-52 bg-white dark:bg-darkCard rounded-xl shadow-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden z-50`}
          >
            {formats.map((fmt, idx) => {
              const meta = FORMAT_META[fmt];
              const Icon = meta.icon;
              return (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => {
                    onExport(fmt);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors ${
                    idx > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""
                  }`}
                >
                  <Icon size={16} className={`${meta.color} flex-shrink-0`} />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
