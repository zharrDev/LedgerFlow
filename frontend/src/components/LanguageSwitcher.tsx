import { Languages } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="inline-flex items-center rounded-xl border border-gray-200 dark:border-white/15 bg-white/80 dark:bg-white/5 p-1 shadow-sm" aria-label="Language selector">
      <Languages size={15} className="ml-1.5 mr-1 text-primary-500" aria-hidden />
      <button type="button" onClick={() => setLanguage("id")} aria-pressed={language === "id"} className={`rounded-lg px-2 py-1 text-xs font-bold transition ${language === "id" ? "bg-primary-500 text-white shadow" : "text-gray-500 dark:text-gray-300 hover:text-primary-500"}`}>ID</button>
      <button type="button" onClick={() => setLanguage("en")} aria-pressed={language === "en"} className={`rounded-lg px-2 py-1 text-xs font-bold transition ${language === "en" ? "bg-primary-500 text-white shadow" : "text-gray-500 dark:text-gray-300 hover:text-primary-500"}`}>EN</button>
    </div>
  );
}
