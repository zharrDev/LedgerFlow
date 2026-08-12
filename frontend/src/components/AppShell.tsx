import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  /** Kunci tinggi viewport — scroll hanya di dalam children (mis. halaman chat AI) */
  fullHeight?: boolean;
  hideTitle?: boolean;
}

export function AppShell({ children, title, description, fullHeight, hideTitle }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleMobileMenu = useCallback(
    () => setMobileMenuOpen((prev) => !prev),
    [],
  );
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30 dark:from-darkBg dark:via-darkBg dark:to-primary-900/10">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-300/20 dark:bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 -left-40 w-96 h-96 bg-emerald-300/20 dark:bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <Header onMenuClick={toggleMobileMenu} mobileMenuOpen={mobileMenuOpen} />

      <div className="flex relative">
        <Sidebar
          mobileMenuOpen={mobileMenuOpen}
          onLinkClick={closeMobileMenu}
        />

        {mobileMenuOpen && (
          <div
            className="fixed inset-0 top-16 bg-black/60 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
            onClick={closeMobileMenu}
          />
        )}

        <main
          className={`flex-1 lg:ml-64 ${
            fullHeight
              ? "h-[calc(100dvh-4rem)] overflow-hidden flex flex-col p-3 sm:p-4 lg:p-6 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-6"
              : "overflow-x-hidden p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8"
          }`}
        >
          {!hideTitle && (title || description) && (
            <div className={fullHeight ? "mb-3 shrink-0" : "mb-6"}>
              {title && (
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  {description}
                </p>
              )}
            </div>
          )}
          {fullHeight ? (
            <div className="flex-1 min-h-0 flex flex-col">{children}</div>
          ) : (
            children
          )}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
