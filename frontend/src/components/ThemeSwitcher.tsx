import { useState, useEffect, type MouseEvent } from "react";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { setThemeTransitioning, THEME_TRANSITION_END } from "../lib/themeTransition";

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

    // Animasi mask membutuhkan @property (terdaftar via CSS.registerProperty).
    // Browser tanpa dukungan → overlay tidak bisa dianimasikan → instan saja.
    if (typeof CSS === "undefined" || !("registerProperty" in CSS)) {
      setTheme(newTheme);
      return;
    }

    // Flag sinkron — IntersectionObserver video mengabaikan callback
    // selama transisi supaya tidak ada play/pause nyentak.
    setThemeTransitioning(true);

    // Terapkan tema ke DOM live SEKARANG. Tidak ada startViewTransition,
    // tidak ada snapshot bitmap — <video> terus merender frame tema baru.
    applyTheme(newTheme);
    setTheme(newTheme);

    // Rapid toggle: buang overlay transisi sebelumnya bila masih ada
    // supaya tidak menumpuk (cek selesai: 3-4x toggle beruntun bersih).
    document.getElementById("theme-circle-overlay")?.remove();

    // Overlay warna tema LAMA; lubang transparan pada mask membesar dari
    // tombol, "menghapus" warna lama dan mengekspos halaman live baru.
    const oldBg = theme === "light" ? "#ffffff" : "#0F172A";
    const overlay = document.createElement("div");
    overlay.id = "theme-circle-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:99999;pointer-events:none;" +
      `background:${oldBg};` +
      "-webkit-mask-image:radial-gradient(circle at var(--theme-toggle-x,50%) var(--theme-toggle-y,50%),transparent var(--mask-r),black var(--mask-r));" +
      "mask-image:radial-gradient(circle at var(--theme-toggle-x,50%) var(--theme-toggle-y,50%),transparent var(--mask-r),black var(--mask-r));" +
      "animation:theme-circle-reveal 0.6s ease-in-out forwards;";
    document.body.appendChild(overlay);

    const cleanup = () => {
      overlay.remove();
      setThemeTransitioning(false);
      // Beri tahu consumer video agar melanjutkan pemutaran bila sempat
      // terhenti oleh reflow di tengah transisi.
      document.dispatchEvent(new Event(THEME_TRANSITION_END));
    };
    overlay.addEventListener("animationend", cleanup, { once: true });
    // Safety net kalau animationend tidak fire (tab background, dsb.);
    // isConnected mencegah cleanup ganda / overlay rapid-toggle lama.
    window.setTimeout(() => {
      if (overlay.isConnected) cleanup();
    }, 800);
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
