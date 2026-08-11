import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAccounts } from "../hooks/useAccounts";
import { usePagination } from "../hooks/usePagination";
import { AppShell } from "../components/AppShell";
import {
  PlusCircle,
  Layers,
  Search,
  Database,
  CheckCircle,
  Landmark,
  CreditCard,
  Briefcase,
  TrendingDown,
  Filter,
  Upload,
  Download,
  TrendingUp,
  FileDown,
  FileUp,
  FileText,
  X,
  AlertCircle,
  Check,
} from "lucide-react";
import { AccountModal } from "../components/AccountModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { AccountTable } from "../components/AccountTable";
import { HoverDropdown } from "../components/HoverDropdown";
import { TablePagination } from "../components/TablePagination";
import {
  exportChartOfAccountsPDF,
  exportChartOfAccountsCSV,
  parseAccountsCSV,
  downloadImportTemplate,
  type ImportedAccount,
} from "../utils/exportPDF";

import type { AccountType } from "../types/account";
import { ACCOUNT_TYPES } from "../types/constants";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};
const letterContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.3 },
  },
};
const letterVariants = {
  hidden: { y: 40, opacity: 0, rotateX: -90 },
  visible: {
    y: 0,
    opacity: 1,
    rotateX: 0,
    transition: { type: "spring", stiffness: 200, damping: 18 },
  },
};

export default function ChartOfAccounts() {
  const { user } = useAuth();
  const {
    accounts,
    loading,
    error,
    saving,
    toggling,
    fetchAccounts,
    saveAccount,
    toggleStatus,
  } = useAccounts();
  const location = useLocation();

  // Modal & confirm state
  const [modalOpen, setModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<any>(null);
  const [confirmAccount, setConfirmAccount] = useState<any>(null);
  const [search, setSearch] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("search") || "";
  });
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Sinkronkan search dari query param (mis. dari Header search)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("search");
    if (q !== null) setSearch(q);
  }, [location.search]);

  // Import state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<ImportedAccount[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("lastPath", location.pathname);
  }, [location.pathname]);

  const safeAccounts = accounts ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return safeAccounts
      .filter(
        (a) =>
          a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q),
      )
      .filter((a) => filterType === "all" || a.type === filterType)
      .filter(
        (a) =>
          filterStatus === "all" ||
          (filterStatus === "active" && a.isActive) ||
          (filterStatus === "inactive" && !a.isActive),
      );
  }, [safeAccounts, search, filterType, filterStatus]);

  const pagination = usePagination(filtered, 10);

  const stats = useMemo(
    () => ({
      total: safeAccounts.length,
      active: safeAccounts.filter((a) => a.isActive).length,
      byType: ACCOUNT_TYPES.reduce(
        (acc, t) => ({
          ...acc,
          [t]: safeAccounts.filter((a) => a.type === t).length,
        }),
        {} as Record<AccountType, number>,
      ),
    }),
    [safeAccounts],
  );

  const statCards = [
    {
      label: "Total Accounts",
      value: stats.total,
      icon: Database,
      color: "primary",
    },
    {
      label: "Active Accounts",
      value: stats.active,
      icon: CheckCircle,
      color: "emerald",
    },
    {
      label: "Assets",
      value: stats.byType.asset,
      icon: Landmark,
      color: "cyan",
    },
    {
      label: "Liabilities",
      value: stats.byType.liability,
      icon: CreditCard,
      color: "amber",
    },
    {
      label: "Equity",
      value: stats.byType.equity,
      icon: Briefcase,
      color: "purple",
    },
    {
      label: "Revenue",
      value: stats.byType.revenue,
      icon: TrendingUp,
      color: "green",
    },
    {
      label: "Expenses",
      value: stats.byType.expense,
      icon: TrendingDown,
      color: "rose",
    },
  ];

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "asset", label: "Asset" },
    { value: "liability", label: "Liability" },
    { value: "equity", label: "Equity" },
    { value: "revenue", label: "Revenue" },
    { value: "expense", label: "Expense" },
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  const getTypeLabel = (val: string) => {
    if (val === "all") return "All Types";
    return val.charAt(0).toUpperCase() + val.slice(1);
  };

  const getStatusLabel = (val: string) => {
    if (val === "all") return "All Status";
    if (val === "active") return "Active";
    return "Inactive";
  };

  // ─── Export Handlers ──────────────────────────────────────────────
  const handleExportPDF = () => {
    exportChartOfAccountsPDF(safeAccounts);
  };

  const handleExportCSV = () => {
    exportChartOfAccountsCSV(safeAccounts);
  };

  // ─── Import Handlers ──────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const result = parseAccountsCSV(text);
      setImportData(result.accounts);
      setImportErrors(result.errors);
      setImportResult(null);
      setImportModalOpen(true);
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImportConfirm = async () => {
    if (importData.length === 0) return;
    setImporting(true);

    let success = 0;
    let failed = 0;

    for (const acc of importData) {
      try {
        await saveAccount({
          code: acc.code,
          name: acc.name,
          type: acc.type.toLowerCase(),
          normalBalance: acc.normalBalance,
        });
        success++;
      } catch (err) {
        failed++;
        console.error(`Failed to import ${acc.code}:`, err);
      }
    }

    setImportResult({ success, failed });
    setImporting(false);

    if (success > 0) {
      fetchAccounts();
    }
  };

  // ─── Export Dropdown State ────────────────────────────────────────
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <AppShell>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8"
      >
        {/* Page Header */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-primary-500/10 text-primary-500">
                <Layers size={20} />
              </div>
              <motion.h1
                variants={letterContainerVariants}
                initial="hidden"
                animate="visible"
                className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center flex-wrap"
                style={{ perspective: "600px" }}
              >
                {"Chart of Accounts".split("").map((char, i) => (
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
              Manage and organize your financial accounts efficiently.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setEditAccount(null);
                setModalOpen(true);
              }}
              className="group flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium shadow-md hover:shadow-primary-500/25 transition-all hover:scale-105 w-full sm:w-auto"
            >
              <PlusCircle
                size="16"
                className="transition-transform group-hover:rotate-90"
              />
              <span>Add Account</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative w-full sm:w-auto" ref={exportRef}>
              <button
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors w-full sm:w-auto"
              >
                <Download size="16" />
                <span>Export</span>
              </button>
              <AnimatePresence>
                {exportMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-full sm:w-48 bg-white dark:bg-darkCard rounded-xl shadow-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden z-50"
                  >
                    <button
                      onClick={() => {
                        handleExportPDF();
                        setExportMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                    >
                      <FileText
                        size={16}
                        className="text-rose-500 flex-shrink-0"
                      />
                      <span>Export PDF</span>
                    </button>
                    <button
                      onClick={() => {
                        handleExportCSV();
                        setExportMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors border-t border-gray-100 dark:border-gray-800"
                    >
                      <FileDown
                        size={16}
                        className="text-emerald-500 flex-shrink-0"
                      />
                      <span>Export CSV</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Import Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors w-full sm:w-auto"
            >
              <Upload size="16" />
              <span>Import</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </motion.div>

        {/* Stat Cards */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4"
        >
          {statCards.map((card) => (
            <motion.div
              key={card.label}
              whileHover={{ y: -4 }}
              className="group relative rounded-xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <card.icon size={16} className={`text-${card.color}-500`} />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {card.value}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {card.label}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Search & Filter Section */}
        <motion.div
          variants={itemVariants}
          className="relative z-30 flex flex-wrap items-center gap-3 bg-white/50 dark:bg-darkBg/50 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700/50 p-4"
        >
          <div className="relative flex-1 min-w-[100%] sm:min-w-[200px]">
            <Search
              size="16"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-darkCard text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Filter size="14" className="text-gray-400 flex-shrink-0" />
            <HoverDropdown
              value={filterType}
              onChange={setFilterType}
              options={typeOptions}
              labelRenderer={getTypeLabel}
            />
            <HoverDropdown
              value={filterStatus}
              onChange={setFilterStatus}
              options={statusOptions}
              labelRenderer={getStatusLabel}
            />
            {(search || filterType !== "all" || filterStatus !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setFilterType("all");
                  setFilterStatus("all");
                }}
                className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </motion.div>

        {/* Account Table */}
        <div className="relative z-10">
          <AccountTable
            accounts={pagination.pageItems}
            allAccountsCount={safeAccounts.length}
            loading={loading}
            error={error}
            onRetry={fetchAccounts}
            onEdit={(acc) => {
              setEditAccount(acc);
              setModalOpen(true);
            }}
            onToggleStatus={setConfirmAccount}
            toggling={toggling}
          />
          <TablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            canPrev={pagination.canPrev}
            canNext={pagination.canNext}
            onPrev={pagination.prev}
            onNext={pagination.next}
            onGoTo={pagination.goTo}
            itemLabel="akun"
          />
        </div>
      </motion.div>

      {/* Account Modal */}
      <AccountModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editAccount={editAccount}
        onSave={saveAccount}
        saving={saving}
        existingCodes={safeAccounts.map((a) => a.code)}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmAccount}
        onClose={() => setConfirmAccount(null)}
        onConfirm={async () => {
          if (confirmAccount) await toggleStatus(confirmAccount);
          setConfirmAccount(null);
        }}
        account={confirmAccount}
        loading={toggling}
      />

      {/* ═══ Import Modal ═══ */}
      <AnimatePresence>
        {importModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => !importing && setImportModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-darkCard rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700/50 w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary-500/10">
                    <FileUp size={20} className="text-primary-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Import Accounts
                    </h3>
                    <p className="text-xs text-gray-500">
                      Upload file CSV untuk tambah akun
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !importing && setImportModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {/* Errors */}
                {importErrors.length > 0 && (
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={16} className="text-rose-500" />
                      <span className="text-sm font-medium text-rose-700 dark:text-rose-400">
                        {importErrors.length} peringatan
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {importErrors.map((err, i) => (
                        <li
                          key={i}
                          className="text-xs text-rose-600 dark:text-rose-400"
                        >
                          • {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Result */}
                {importResult && (
                  <div
                    className={`rounded-xl p-4 border ${
                      importResult.failed === 0
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                        : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Check size={16} className="text-emerald-500" />
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {importResult.success} akun berhasil diimport
                        {importResult.failed > 0 &&
                          `, ${importResult.failed} gagal`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Preview Table */}
                {importData.length > 0 && !importResult && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Preview ({importData.length} akun)
                    </p>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                          <tr>
                            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">
                              Kode
                            </th>
                            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">
                              Nama
                            </th>
                            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">
                              Tipe
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {importData.slice(0, 10).map((acc, i) => (
                            <tr
                              key={i}
                              className="hover:bg-gray-50 dark:hover:bg-white/5"
                            >
                              <td className="py-2 px-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                                {acc.code}
                              </td>
                              <td className="py-2 px-3 text-gray-800 dark:text-gray-200">
                                {acc.name}
                              </td>
                              <td className="py-2 px-3">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 capitalize">
                                  {acc.type.toLowerCase()}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {importData.length > 10 && (
                            <tr>
                              <td
                                colSpan={3}
                                className="py-2 px-3 text-center text-xs text-gray-400"
                              >
                                ... dan {importData.length - 10} akun lainnya
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Download Template */}
                <button
                  onClick={downloadImportTemplate}
                  className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  <FileDown size={14} />
                  Download template CSV
                </button>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setImportModalOpen(false)}
                  disabled={importing}
                  className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {importResult ? "Tutup" : "Batal"}
                </button>
                {!importResult && importData.length > 0 && (
                  <button
                    onClick={handleImportConfirm}
                    disabled={importing}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {importing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        Import {importData.length} Akun
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
