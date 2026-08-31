import { useState, useEffect, useCallback } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { AppNav } from "./AppNav";
import { getMyCompany } from "../services/companiesService";
import { getCurrency, setCurrency } from "../utils/currency";
import { useAppShellConfig } from "../context/AppShellConfigContext";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const config = useAppShellConfig();
  const { title, description, fullHeight, hideTitle } = config;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sinkronkan mata uang dari database (per-company) ke localStorage.
  useEffect(() => {
    let cancelled = false;
    getMyCompany()
      .then((company) => {
        if (cancelled) return;
        if (company?.currency && company.currency !== getCurrency()) {
          setCurrency(company.currency);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const toggleMobileMenu = useCallback(
    () => setMobileMenuOpen((prev) => !prev),
    [],
  );
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0B1120] transition-colors overflow-x-hidden">    
      {/* Desktop: 2 floating cards */}
      <div className="hidden lg:flex h-screen p-4 gap-4">
        {/* Sidebar card */}
        <aside className="w-64 shrink-0 h-full rounded-3xl bg-white dark:bg-darkCard shadow-lg border border-gray-200/60 dark:border-gray-700/30 overflow-hidden flex flex-col">
          <Sidebar mode="desktop" onLinkClick={closeMobileMenu} />
        </aside>

        {/* Content area — header + main as separate cards */}
        <div className="flex-1 h-full flex flex-col gap-2 min-w-0">
          {/* Header card */}
          <div className="shrink-0 rounded-2xl bg-white dark:bg-darkCard shadow-lg border border-gray-200/60 dark:border-gray-700/30 overflow-visible relative z-30">
            <Header onMenuClick={toggleMobileMenu} mobileMenuOpen={mobileMenuOpen} />
          </div>

          {/* Main content card */}
          <div className="flex-1 min-h-0 rounded-2xl bg-white dark:bg-darkCard shadow-lg border border-gray-200/60 dark:border-gray-700/30 overflow-hidden flex flex-col min-w-0">
            <main
              className={`flex-1 overflow-x-hidden ${
                fullHeight
                  ? "overflow-hidden flex flex-col p-3 sm:p-4 lg:p-6"
                  : "overflow-y-auto app-scroll p-4 sm:p-6 lg:p-8 pb-8"
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
        </div>
      </div>

      {/* Mobile / Tablet: drawer + content */}
      <div className="lg:hidden min-h-screen flex flex-col">
        <Header onMenuClick={toggleMobileMenu} mobileMenuOpen={mobileMenuOpen} />

        {mobileMenuOpen && (
          <div
            className="fixed inset-0 top-16 bg-black/60 backdrop-blur-sm z-30 animate-fade-in"
            onClick={closeMobileMenu}
          />
        )}

        <Sidebar
          mobileMenuOpen={mobileMenuOpen}
          onLinkClick={closeMobileMenu}
        />

        <main
          className={`flex-1 ${
            fullHeight
              ? "h-[calc(100dvh-4rem)] overflow-hidden flex flex-col p-3 sm:p-4"
              : "overflow-x-hidden p-4 sm:p-6 pb-24 lg:pb-8"
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

        <AppNav />
      </div>
    </div>
  );
}
