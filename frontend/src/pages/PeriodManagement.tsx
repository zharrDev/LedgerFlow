import React, { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { AppShell } from "../components/AppShell";
import { periodsService } from "../services/periodsService";
import { getErrorMessage } from "../lib/errorMessage";
import { useAuth } from "../context/AuthContext";
import { pushNotification } from "../components/Header";
import { HoverDropdown } from "../components/HoverDropdown";
import {
  Lock,
  Unlock,
  Plus,
  Loader2,
  CheckCircle2,
  Calendar,
  CalendarClock,
  CalendarX,
  AlertTriangle,
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
    transition: { staggerChildren: 0.04, delayChildren: 0.3 },
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

export default function PeriodManagement() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [confirmClose, setConfirmClose] = useState<string | null>(null);
  const [confirmYearFar, setConfirmYearFar] = useState(false);

  useEffect(() => {
    fetchPeriods();
  }, [user?.company_id]);

  const fetchPeriods = async () => {
    if (!user?.company_id) return;
    try {
      const data = await periodsService.getAll(user.company_id);
      setPeriods(Array.isArray(data) ? data : []);
    } catch {
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  };

  // Tahun yang wajar = tahun sekarang ± 2. Di luar itu minta konfirmasi dulu
  // (tetap boleh dibuka — misal periode historis/futuristik — tapi dicegah
  // dari salah ketik yang tidak disengaja).
  const isYearFar = Math.abs(newYear - new Date().getFullYear()) > 2;

  const doOpenPeriod = async () => {
    if (!user?.company_id) return;
    setIsSubmitting(true);
    try {
      await periodsService.open(user.company_id, newYear, newMonth);
      await fetchPeriods();
      pushNotification({
        type: "period_opened",
        title: "Periode Dibuka",
        message: `Periode ${monthNames[newMonth - 1]} ${newYear} sekarang aktif dan siap menerima transaksi.`,
        link: "/period-management",
      });
    } catch (err: any) {
      pushNotification({
        type: "period_opened",
        title: "Gagal Membuka Periode",
        message: getErrorMessage(err),
        link: "/period-management",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.company_id) return;
    // Tahun jauh dari tahun berjalan → minta konfirmasi dulu.
    if (isYearFar) {
      setConfirmYearFar(true);
      return;
    }
    await doOpenPeriod();
  };

  const handleClosePeriod = async (id: string) => {
    try {
      await periodsService.close(id);
      await fetchPeriods();
      setConfirmClose(null);
      pushNotification({
        type: "period_closed",
        title: "Periode Ditutup",
        message:
          "Periode berhasil ditutup. Transaksi tidak bisa diposting lagi ke periode ini.",
        link: "/period-management",
      });
    } catch {
      pushNotification({
        type: "period_closed",
        title: "Gagal Menutup Periode",
        message: "Terjadi kesalahan saat menutup periode.",
        link: "/period-management",
      });
    }
  };

  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  // Stats
  const openCount = periods.filter((p) => p.status === "open").length;
  const closedCount = periods.filter((p) => p.status === "closed").length;

  // Find the period being confirmed for close
  const closingPeriod = confirmClose
    ? periods.find((p) => p.id === confirmClose)
    : null;

  return (
    <AppShell>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-primary-500/10 text-primary-500">
              <CalendarClock size={20} />
            </div>
            <motion.h1
              variants={letterContainerVariants}
              initial="hidden"
              animate="visible"
              className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center flex-wrap"
              style={{ perspective: "600px" }}
            >
              {"Manajemen Periode".split("").map((char, i) => (
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
            Kontrol pembukaan dan penutupan buku bulanan
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {[
            {
              icon: Calendar,
              label: "Total Periode",
              value: periods.length,
              color: "primary",
            },
            {
              icon: Unlock,
              label: "Terbuka",
              value: openCount,
              color: "emerald",
            },
            {
              icon: Lock,
              label: "Tertutup",
              value: closedCount,
              color: "gray",
            },
          ].map((s) => (
            <motion.div
              key={s.label}
              whileHover={{ y: -4 }}
              className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all p-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl ${
                    s.color === "primary"
                      ? "bg-primary-50 dark:bg-primary-500/10 text-primary-500"
                      : s.color === "emerald"
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                  }`}
                >
                  <s.icon size={18} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {s.label}
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {s.value}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Form Buka Periode */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-6"
        >
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-500">
              <Plus size={14} />
            </div>
            Buka Periode Baru
          </h2>
          <form
            onSubmit={handleOpenPeriod}
            className="flex flex-wrap gap-4 items-end"
          >
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Tahun
              </label>
              <input
                type="number"
                value={newYear}
                onChange={(e) => setNewYear(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkBg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Bulan
              </label>
              <HoverDropdown
                value={String(newMonth)}
                onChange={(v) => setNewMonth(parseInt(v))}
                fullWidth
                minWidth={180}
                options={monthNames.map((m, i) => ({
                  value: String(i + 1),
                  label: m,
                }))}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-60 disabled:hover:scale-100 w-full sm:w-auto"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Buka Periode
            </button>
          </form>
        </motion.div>

        {/* Period List */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md overflow-hidden"
        >
          {/* Table header */}
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 flex items-center gap-2">
            <Calendar size={16} className="text-primary-500" />
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Daftar Periode
            </h2>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              <p className="text-sm">Memuat periode...</p>
            </div>
          ) : periods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <CalendarX
                size={40}
                className="text-gray-300 dark:text-gray-600"
              />
              <p className="text-sm">Belum ada periode</p>
              <p className="text-xs text-gray-400">
                Buat periode pertama Anda untuk memulai pencatatan
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {periods.map((p, idx) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 hover:bg-primary-50/30 dark:hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl ${
                        p.status === "open"
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {p.status === "open" ? (
                        <Unlock size={16} />
                      ) : (
                        <Lock size={16} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {monthNames[p.month - 1]} {p.year}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Periode buku bulanan
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    {p.status === "open" ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-xl text-xs font-semibold border border-emerald-200 dark:border-emerald-500/20 uppercase">
                        <Unlock size={12} /> Terbuka
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 uppercase">
                        <Lock size={12} /> Tertutup
                      </span>
                    )}

                    {p.status === "open" && (
                      <button
                        onClick={() => setConfirmClose(p.id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-500/20 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        Tutup Buku
                      </button>
                    )}
                    {p.status === "closed" && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <CheckCircle2 size={12} /> Selesai
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Footer */}
          {periods.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30 flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{periods.length} periode</span>
              <span>
                {openCount} terbuka · {closedCount} tertutup
              </span>
            </div>
          )}
        </motion.div>

        {/* ─────── Confirm Tahun Jauh Dialog ─────── */}
        {confirmYearFar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => setConfirmYearFar(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="bg-white dark:bg-darkCard rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700/50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Gradient top accent */}
              <div className="h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-rose-500" />

              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Animated warning icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 18,
                      delay: 0.1,
                    }}
                    className="shrink-0 p-3 rounded-2xl bg-amber-100 dark:bg-amber-500/10"
                  >
                    <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </motion.div>

                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Konfirmasi Tahun Periode
                    </h3>
                    <p className="text-primary-500 font-semibold text-sm mt-0.5">
                      {monthNames[newMonth - 1]} {newYear}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                      Tahun ini jauh dari tahun berjalan ({" "}
                      {new Date().getFullYear()}). Pastikan ini memang yang
                      Anda maksud — periode bisa dibuka untuk tahun apa saja
                      (historis atau masa depan), tapi salah ketik akan membuat
                      periode yang salah.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setConfirmYearFar(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  Batal
                </button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setConfirmYearFar(false);
                    doOpenPeriod();
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-sm font-semibold shadow-md transition-all"
                >
                  <Calendar size={15} />
                  Ya, Buka Periode Ini
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ─────── Confirm Close Dialog ─────── */}
        {confirmClose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => setConfirmClose(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="bg-white dark:bg-darkCard rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700/50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Gradient top accent */}
              <div className="h-1.5 bg-gradient-to-r from-amber-400 via-rose-500 to-rose-600" />

              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Animated warning icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 18,
                      delay: 0.1,
                    }}
                    className="shrink-0 p-3 rounded-2xl bg-amber-100 dark:bg-amber-500/10"
                  >
                    <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </motion.div>

                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Tutup Periode?
                    </h3>
                    {closingPeriod && (
                      <p className="text-primary-500 font-semibold text-sm mt-0.5">
                        {monthNames[closingPeriod.month - 1]}{" "}
                        {closingPeriod.year}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                      Setelah ditutup, transaksi tidak bisa diposting lagi ke
                      periode ini.
                      <span className="font-semibold text-rose-500 dark:text-rose-400">
                        {" "}
                        Tindakan ini tidak dapat dibatalkan.
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setConfirmClose(null)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  Batal
                </button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleClosePeriod(confirmClose)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-sm font-semibold shadow-md transition-all"
                >
                  <Lock size={15} />
                  Ya, Tutup Periode
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </AppShell>
  );
}
