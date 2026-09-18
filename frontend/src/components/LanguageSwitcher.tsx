import { useEffect, useRef, useState } from "react";
import { Languages, Check } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";

export default function LanguageSwitcher({ variant = "default" }: { variant?: "default" | "compact" } = {}) {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== "compact" || !open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [variant, open]);

  // Varian compact (header mobile yang sesak): tombol ikon saja, diklik
  // membuka dropdown ID/EN. State bahasa sama — sinkron dengan varian penuh.
  if (variant === "compact") {
    return (
      <div className="relative" ref={wrapRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Ganti bahasa / Change language"
          aria-expanded={open}
          className="p-1.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
        >
          <Languages size={20} />
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-32 rounded-xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-2xl overflow-hidden z-50">
            {(
              [
                { code: "id", label: "Indonesia" },
                { code: "en", label: "English" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => {
                  setLanguage(opt.code);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-primary-50 dark:hover:bg-primary-500/10 ${
                  language === opt.code
                    ? "font-bold text-primary-600 dark:text-primary-400"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {opt.label}
                {language === opt.code && <Check size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center rounded-xl border border-gray-200 dark:border-white/15 bg-white/80 dark:bg-white/5 p-1 shadow-sm" aria-label="Language selector">
      <Languages size={15} className="ml-1.5 mr-1 text-primary-500" aria-hidden />
      <button type="button" onClick={() => setLanguage("id")} aria-pressed={language === "id"} className={`rounded-lg px-2 py-1 text-xs font-bold transition ${language === "id" ? "bg-primary-500 text-white shadow" : "text-gray-500 dark:text-gray-300 hover:text-primary-500"}`}>ID</button>
      <button type="button" onClick={() => setLanguage("en")} aria-pressed={language === "en"} className={`rounded-lg px-2 py-1 text-xs font-bold transition ${language === "en" ? "bg-primary-500 text-white shadow" : "text-gray-500 dark:text-gray-300 hover:text-primary-500"}`}>EN</button>
    </div>
  );
}
