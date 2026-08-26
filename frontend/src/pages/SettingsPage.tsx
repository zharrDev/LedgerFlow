// src/pages/SettingsPage.tsx
import { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { useToast } from "../context/ToastContext";
import { useSubscription } from "../hooks/useSubscription";
import { useLanguage } from "../hooks/useLanguage";
import { tx } from "../i18n/tx";
import { formatPrice, cancelSubscription } from "../services/paymentService";
import { getErrorMessage } from "../lib/errorMessage";
import { HoverDropdown } from "../components/HoverDropdown";
import { CURRENCIES, getCurrency, setCurrency as persistCurrency } from "../utils/currency";
import { getMyCompany, updateCompanyCurrency } from "../services/companiesService";
import {
  Settings,
  Palette,
  Globe,
  Bell,
  Shield,
  Moon,
  Sun,
  Monitor,
  Check,
  CreditCard,
  Crown,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
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
const letterContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.045, delayChildren: 0.3 },
  },
};
const letterVariants: Variants = {
  hidden: { y: 40, opacity: 0, rotateX: -90 },
  visible: {
    y: 0,
    opacity: 1,
    rotateX: 0,
    transition: { type: "spring", stiffness: 200, damping: 18 },
  },
};

type ThemeOption = "light" | "dark" | "system";
type CurrencyOption = (typeof CURRENCIES)[number]["code"];

export default function SettingsPage() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [saved, setSaved] = useState(false);

  // Subscription
  const {
    subscription,
    isPro,
    isEnterprise,
    isTrial,
    trialDaysLeft,
    isFree,
    isActive,
    refresh: refreshSub,
  } = useSubscription();

  // Settings state
  const [theme, setTheme] = useState<ThemeOption>("system");
  const [currency, setCurrency] = useState<CurrencyOption>("IDR");
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    journal: true,
    report: false,
  });
  const [cancelLoading, setCancelLoading] = useState(false);

  // Load settings dari localStorage + mata uang dari database (per-company).
  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") ||
      "system") as ThemeOption;
    setTheme(savedTheme);
    setCurrency(getCurrency());
    const savedNotif = localStorage.getItem("notifications");
    if (savedNotif) {
      try {
        setNotifications(JSON.parse(savedNotif));
      } catch {}
    }

    // Mata uang tersimpan per-company di database — ambil yang terbaru
    // supaya tampilan Settings selalu konsisten dengan company.
    getMyCompany()
      .then((company) => {
        if (company?.currency) {
          setCurrency(company.currency);
        }
      })
      .catch(() => {
        // Abaikan — localStorage tetap dipakai sebagai fallback.
      });
  }, []);

  const applyTheme = (t: ThemeOption) => {
    setTheme(t);
    localStorage.setItem("theme", t);
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
    } else if (t === "light") {
      root.classList.remove("dark");
    } else {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (isDark) root.classList.add("dark");
      else root.classList.remove("dark");
    }
  };

  const handleSave = async () => {
    setSaved(true);
    toast({
      variant: "success",
      title: tx(language, "Settings Saved!", "Pengaturan Disimpan!"),
      message: tx(language, "All your preferences have been updated successfully.", "Semua preferensi Anda berhasil diperbarui."),
    });
    setTimeout(() => setSaved(false), 2000);

    // Mata uang disimpan ke database (berlaku untuk semua anggota company)
    // + localStorage (untuk tampilan langsung). CATATAN: setCurrency di sini
    // adalah state setter, jadi localStorage ditulis eksplisit via persistCurrency.
    persistCurrency(currency);
    try {
      await updateCompanyCurrency(currency);
    } catch {
      // Simpan lokal tetap jalan; sinkron DB gagal tidak memblokir UI.
    }
    localStorage.setItem("notifications", JSON.stringify(notifications));
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        tx(language, "Are you sure you want to cancel subscription? You will be returned to the Free plan.", "Yakin ingin cancel subscription? Anda akan dikembalikan ke plan Free."),
      )
    )
      return;
    setCancelLoading(true);
    try {
      await cancelSubscription("User requested from settings");
      toast({
        variant: "success",
        title: tx(language, "Subscription Cancelled", "Subscription Dibatalkan"),
        message: tx(language, "You have been returned to the Free plan.", "Anda telah dikembalikan ke plan Free."),
      });
      refreshSub();
    } catch (err: any) {
      toast({
        variant: "error",
        title: tx(language, "Failed", "Gagal"),
        message: getErrorMessage(err),
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const themeOptions: {
    value: ThemeOption;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { value: "light", label: tx(language, "Light", "Terang"), icon: <Sun size={16} /> },
    { value: "dark", label: tx(language, "Dark", "Gelap"), icon: <Moon size={16} /> },
    { value: "system", label: tx(language, "System", "Sistem"), icon: <Monitor size={16} /> },
  ];

  return (
    <AppShell>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-3xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-primary-500/10 text-primary-500">
              <Settings size={20} />
            </div>
            <motion.h1
              variants={letterContainerVariants}
              initial="hidden"
              animate="visible"
              className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center flex-wrap"
              style={{ perspective: "600px" }}
            >
              {tx(language, "Settings", "Pengaturan").split("").map((char, i) => (
                <motion.span
                  key={i}
                  variants={letterVariants}
                  className="inline-block"
                  style={{ transformOrigin: "bottom center" }}
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </motion.h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {tx(language, "Manage app preferences and configuration", "Kelola preferensi dan konfigurasi aplikasi")}
          </p>
        </motion.div>

        {/* ── Langganan / Subscription ── */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-primary-500" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              {tx(language, "Subscription", "Langganan")}
            </h3>
          </div>

          <div className="space-y-3">
            {/* Plan saat ini */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {tx(language, "Current Plan", "Plan Saat Ini")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {subscription?.plans?.display_name || "Free"}
                </p>
              </div>
              <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                {formatPrice(subscription?.plans?.price_monthly || 0)}/{tx(language, "month", "bulan")}
              </span>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {tx(language, "Status", "Status")}
                </p>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                    : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20"
                }`}
              >
                {isTrial
                  ? tx(language, `Trial (${trialDaysLeft} days left)`, `Trial (${trialDaysLeft} hari tersisa)`)
                  : isActive
                    ? tx(language, "Active", "Aktif")
                    : tx(language, "Inactive", "Tidak Aktif")}
              </span>
            </div>

            {/* Trial info */}
            {isTrial && trialDaysLeft > 0 && (
              <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                <Sparkles size={14} className="text-amber-500" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {tx(language, "Trial ends in", "Trial berakhir dalam")} <strong>{trialDaysLeft} {tx(language, "days", "hari")}</strong>.
                  {tx(language, "Upgrade now to not lose access to premium features.", "Upgrade sekarang agar tidak kehilangan akses fitur premium.")}
                </p>
              </div>
            )}

            {/* Billing cycle */}
            {(isPro || isEnterprise) && !isTrial && (
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {tx(language, "Billing Cycle", "Siklus Pembayaran")}
                  </p>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                  {subscription?.billing_cycle === "yearly"
                    ? tx(language, "Yearly", "Tahunan")
                    : tx(language, "Monthly", "Bulanan")}
                </span>
              </div>
            )}

            {/* Periode berakhir */}
            {subscription?.current_period_end && isActive && !isTrial && (
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {tx(language, "Valid Until", "Berlaku Sampai")}
                  </p>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {new Date(subscription.current_period_end).toLocaleDateString(
                    "id-ID",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              {(isFree || isTrial) && (
                <Link
                  to="/pricing"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium hover:shadow-md transition-all shadow-sm"
                >
                  <Crown size={14} className="flex-shrink-0" />
                  <span>{tx(language, "Upgrade Plan", "Upgrade Plan")}</span>
                  <ArrowRight size={14} className="flex-shrink-0" />
                </Link>
              )}

              {(isPro || isEnterprise) && !isTrial && (
                <>
                  <Link
                    to="/pricing"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium hover:shadow-md transition-all shadow-sm"
                  >
                    <span>{tx(language, "Change Plan", "Ganti Plan")}</span>
                  </Link>
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancelLoading}
                    className="flex-1 py-2.5 px-4 text-center rounded-xl border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50 shadow-sm"
                  >
                    <span>
                      {cancelLoading ? tx(language, "Cancelling...", "Membatalkan...") : tx(language, "Cancel Subscription", "Cancel Subscription")}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Appearance ── */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Palette size={18} className="text-primary-500" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              {tx(language, "Appearance", "Tampilan")}
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {tx(language, "Theme", "Tema")}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => applyTheme(opt.value)}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      theme === opt.value
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-sm"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div
                      className={`${theme === opt.value ? "text-primary-500" : "text-gray-400"}`}
                    >
                      {opt.icon}
                    </div>
                    <span
                      className={`text-sm font-medium ${theme === opt.value ? "text-primary-600 dark:text-primary-400" : "text-gray-600 dark:text-gray-400"}`}
                    >
                      {opt.label}
                    </span>
                    {theme === opt.value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center"
                      >
                        <Check size={12} className="text-white" />
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Regional ── */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Globe size={18} className="text-primary-500" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              {tx(language, "Regional", "Regional")}
            </h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {tx(language, "Default Currency", "Mata Uang Default")}
            </label>
            <HoverDropdown
              value={currency}
              onChange={(v) => setCurrency(v as CurrencyOption)}
              fullWidth
              minWidth={240}
              options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
            />
            <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
              {tx(language, "This currency is used to display all numbers in the app (journal, ledger, reports, dashboard) and export results.", "Mata uang ini dipakai untuk menampilkan semua angka di aplikasi (jurnal, buku besar, laporan, dashboard) dan hasil export.")}
            </p>
          </div>
        </motion.div>

        {/* ── Notifications ── */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} className="text-primary-500" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              {tx(language, "Notifications", "Notifikasi")}
            </h3>
          </div>

          <div className="space-y-4">
            {[
              {
                key: "email" as const,
                label: tx(language, "Email Notifications", "Notifikasi Email"),
                desc: tx(language, "Receive updates via email", "Terima update via email"),
              },
              {
                key: "push" as const,
                label: tx(language, "Push Notification", "Push Notification"),
                desc: tx(language, "Notifications in browser", "Notifikasi di browser"),
              },
              {
                key: "journal" as const,
                label: tx(language, "New Journal Entry", "Journal Entry Baru"),
                desc: tx(language, "Notify when there is a new entry", "Notif saat ada entry baru"),
              },
              {
                key: "report" as const,
                label: tx(language, "Monthly Report", "Laporan Bulanan"),
                desc: tx(language, "Summary of reports each month", "Ringkasan laporan tiap bulan"),
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.desc}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setNotifications((prev) => ({
                      ...prev,
                      [item.key]: !prev[item.key],
                    }))
                  }
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                    notifications[item.key]
                      ? "bg-primary-500"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      notifications[item.key]
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Security ── */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-primary-500" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              {tx(language, "Security", "Keamanan")}
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {tx(language, "Authentication", "Autentikasi")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {tx(language, "Active login method", "Metode login yang aktif")}
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                Google OAuth
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {tx(language, "Active Session", "Sesi Aktif")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {tx(language, "Device currently logged in", "Perangkat yang sedang login")}
                </p>
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {tx(language, "1 device", "1 perangkat")}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Save Button ── */}
        <motion.div variants={itemVariants} className="flex justify-end pb-8">
          <button
            onClick={handleSave}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition-all w-full sm:w-auto ${
              saved
                ? "bg-emerald-500 text-white"
                : "bg-gradient-to-r from-primary-500 to-primary-600 text-white"
            }`}
          >
            {saved ? (
              <>
                <Check size={16} className="flex-shrink-0" />{" "}
                <span>{tx(language, "Saved!", "Tersimpan!")}</span>
              </>
            ) : (
              <span>{tx(language, "Save Settings", "Simpan Pengaturan")}</span>
            )}
          </button>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
