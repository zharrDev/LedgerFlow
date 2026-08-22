// src/components/InfoPanel.tsx - VERSI CYAN (TERBARU)
import { Check, BarChart3, Shield, TrendingUp, Activity } from "lucide-react";
import logo from "../assets/ledgerflow.webp";
import { useLanguage } from "../hooks/useLanguage";

export default function InfoPanel({
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean;
  onToggle?: () => void;
}) {
  const { language } = useLanguage();
  const id = language === "id";

  const stats = [
    {
      value: "10K+",
      label: id ? "Transaksi Tercatat" : "Transactions Recorded",
      icon: Activity,
    },
    {
      value: "Real-Time",
      label: id ? "Dashboard Monitoring" : "Dashboard Monitoring",
      icon: BarChart3,
    },
    {
      value: "Smart",
      label: id ? "Analisis Keuangan" : "Financial Analytics",
      icon: TrendingUp,
    },
    {
      value: "Secure",
      label: id ? "Pengelolaan Data" : "Data Management",
      icon: Shield,
    },
  ];

  const compactFeatures = id
    ? [
        "Laporan laba rugi & neraca otomatis",
        "Integrasi bank & e-wallet",
        "Multi-entity & multi-currency",
        "Audit trail yang lengkap & aman",
      ]
    : [
        "Automatic income statement & balance sheet",
        "Bank & e-wallet integration",
        "Multi-entity & multi-currency",
        "Complete & secure audit trail",
      ];

  const expandedFeatures = id
    ? [
        "Pemasukan & Pengeluaran",
        "Laporan Laba Rugi & Neraca Otomatis",
        "Dashboard & Analisis Real-Time",
        "Integrasi Bank & E-Wallet",
        "Multi-entity & Multi-currency",
        "Audit Trail Lengkap & Aman",
      ]
    : [
        "Income & Expenses",
        "Automatic Income Statement & Balance Sheet",
        "Real-Time Dashboard & Analytics",
        "Bank & E-Wallet Integration",
        "Multi-entity & Multi-currency",
        "Complete & Secure Audit Trail",
      ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-10">
        <img src={logo} alt="LedgerFlow" className="w-10 h-10" />
        <span className="text-2xl font-bold text-white tracking-tight">
          LedgerFlow
        </span>
      </div>
      <div className="transition-all duration-500">
        <h2 className="text-3xl font-bold text-white leading-tight mb-3">
          {id
            ? "Kelola keuangan bisnis Anda dengan lebih cerdas."
            : "Manage your business finances smarter."}
        </h2>
        <p className="text-sm text-white/65 leading-relaxed mb-8">
          {isExpanded
            ? id
              ? "Platform manajemen keuangan modern yang membantu pengguna mengelola pemasukan, pengeluaran, dan aktivitas harian dalam satu dashboard terintegrasi."
              : "A modern financial management platform that helps users manage income, expenses, and daily activity in one integrated dashboard."
            : id
            ? "Bergabung dengan ribuan perusahaan yang menggunakan LedgerFlow untuk laporan keuangan real-time dan rekonsiliasi otomatis."
            : "Join thousands of companies using LedgerFlow for real-time financial reports and automatic reconciliation."}
        </p>
      </div>
      {!isExpanded && (
        <ul className="space-y-3.5">
          {compactFeatures.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 text-sm text-white/85"
            >
              <span className="w-5 h-5 mt-px rounded-full bg-white/15 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-cyan-300" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      )}
      {isExpanded && (
        <div className="flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3">
            {stats.map(({ value, label, icon: Icon }) => (
              <div
                key={label}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 border border-white/10"
              >
                <Icon className="w-3.5 h-3.5 text-cyan-300 mb-1.5" />
                <p className="text-base font-bold text-white leading-tight">
                  {value}
                </p>
                <p className="text-[11px] text-white/55 leading-tight mt-0.5">
                  {label}
                </p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-3">
              {id ? "Fitur Unggulan" : "Key Features"}
            </p>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
              {expandedFeatures.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-white/80"
                >
                  <Check className="w-3.5 h-3.5 text-cyan-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <p className="mt-auto text-xs text-white/30 pt-6">
    © 2026 LedgerFlow.
  </p>
      {onToggle && (
        <button
          onClick={onToggle}
          className="mt-6 w-full py-2.5 text-sm font-medium text-white/80 border border-white/20 rounded-xl hover:bg-white/10 lg:hidden"
        >
          {isExpanded
            ? id
              ? "Tutup Info"
              : "Close Info"
            : id
            ? "Pelajari LedgerFlow"
            : "Learn about LedgerFlow"}
        </button>
      )}
    </div>
  );
}
