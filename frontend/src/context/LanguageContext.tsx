import { createContext, useEffect, useState, type ReactNode } from "react";

export type Language = "id" | "en";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem("ledgerflow-language") === "id" ? "id" : "en",
  );

  useEffect(() => {
    localStorage.setItem("ledgerflow-language", language);
    document.documentElement.lang = language;
  }, [language]);

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export { LanguageContext };
