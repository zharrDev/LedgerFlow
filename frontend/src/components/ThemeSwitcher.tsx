import { useState, useEffect, type MouseEvent } from "react";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return "light";
  });

  useEffect(() => {
    localStorage.setItem("theme", theme);
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = (e: MouseEvent<HTMLButtonElement>) => {
    // Titik asal circle-reveal: pusat tombol yang diklik.
    const rect = e.currentTarget.getBoundingClientRect();
    const root = document.documentElement;
    root.style.setProperty("--theme-toggle-x", `${rect.left + rect.width / 2}px`);
    root.style.setProperty("--theme-toggle-y", `${rect.top + rect.height / 2}px`);

    const newTheme: Theme = theme === "light" ? "dark" : "light";

    // Hormati preferensi pengguna yang sensitif terhadap gerakan —
    // ganti tema langsung tanpa efek circle-reveal.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTheme(newTheme);
      return;
    }

    // Fallback browser tanpa View Transitions API (Safari/Firefox lama):
    // ganti tema langsung, animasi ikon sun/moon tetap jalan seperti biasa.
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };
    if (!doc.startViewTransition) {
      setTheme(newTheme);
      return;
    }

    root.classList.add("theme-transitioning");
    const transition = doc.startViewTransition(() => {
      // Terapkan class dark langsung (sinkron) supaya snapshot "baru"
      // View Transition pasti sudah memakai tema target, lalu sinkronkan
      // state React — useEffect-nya cuma meng-apply ulang class yang sama.
      applyTheme(newTheme);
      setTheme(newTheme);
    });
    transition.finished.finally(() => {
      root.classList.remove("theme-transitioning");
    });
  };

  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {theme === "light" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
