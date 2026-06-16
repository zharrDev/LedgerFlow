import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { FormEvent, ChangeEvent } from "react";
import type {
  JournalLineForm,
  JournalEntryForm,
  JournalFormErrors,
  CreateJournalPayload,
} from "../../types/journal";
import {
  makeEmptyLine,
  DEFAULT_JOURNAL_FORM,
  MIN_LINES,
} from "../../types/constants";
import {
  SpinnerIcon,
  IconPlus,
  IconTrash,
  IconArrowLeft,
  IconCheck,
  IconSend,
} from "./JournalShared";
import { useAccounts } from "../../hooks/useAccounts";
import type { Account } from "../../types/account";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface JournalFormProps {
  saving: boolean;
  onSave: (payload: CreateJournalPayload) => Promise<boolean>;
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────
function parseAmount(v: string): number {
  const n = parseFloat(v.replace(/[^\d.]/g, ""));
  return isNaN(n) || n < 0 ? 0 : n;
}

function sumLines(lines: JournalLineForm[], field: "debit" | "credit"): number {
  return lines.reduce((s, l) => s + parseAmount(l[field]), 0);
}

function formatDisplayAmount(v: string): string {
  const n = parseAmount(v);
  if (n === 0) return "";
  return new Intl.NumberFormat("id-ID").format(n);
}

// ─── Helper: Build payload from form ──────────────────────────────────
function buildPayload(
  form: JournalEntryForm,
  status?: "draft" | "posted",
): CreateJournalPayload {
  return {
    entry_date: form.date,
    description: form.description.trim(),
    status: status || "draft",
    lines: form.lines
      .filter(
        (l) =>
          l.accountCode.trim() &&
          (parseAmount(l.debit) > 0 || parseAmount(l.credit) > 0),
      )
      .map((l) => ({
        accountCode: l.accountCode.trim(),
        accountName: l.accountName.trim(),
        description: l.description.trim(),
        memo: l.description.trim(),
        debit: parseAmount(l.debit),
        credit: parseAmount(l.credit),
      })),
  };
}

// ─── Component ────────────────────────────────────────────────────────
export function JournalForm({ saving, onSave, onBack }: JournalFormProps) {
  const [form, setForm] = useState<JournalEntryForm>({
    ...DEFAULT_JOURNAL_FORM,
    lines: [makeEmptyLine(), makeEmptyLine()],
  });
  const [errors, setErrors] = useState<JournalFormErrors>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { accounts } = useAccounts();

  const totalDebit = useMemo(() => sumLines(form.lines, "debit"), [form.lines]);
  const totalCredit = useMemo(
    () => sumLines(form.lines, "credit"),
    [form.lines],
  );
  const diff = Math.abs(totalDebit - totalCredit);
  const isBalanced = diff < 0.005;
  const hasAmounts = totalDebit > 0 || totalCredit > 0;

  const validate = useCallback((): boolean => {
    const e: JournalFormErrors = {};
    if (!form.date) e.date = "Tanggal wajib diisi";
    if (!form.description.trim()) e.description = "Deskripsi wajib diisi";

    const filledLines = form.lines.filter(
      (l) =>
        l.accountCode.trim() ||
        parseAmount(l.debit) > 0 ||
        parseAmount(l.credit) > 0,
    );
    if (filledLines.length < 2) {
      e.lines = "Minimal 2 baris akun harus diisi";
    }

    const hasDebitLine = form.lines.some((l) => parseAmount(l.debit) > 0);
    const hasCreditLine = form.lines.some((l) => parseAmount(l.credit) > 0);
    if (!hasDebitLine || !hasCreditLine) {
      e.lines = "Harus ada minimal 1 baris debit dan 1 baris kredit";
    }

    if (totalDebit === 0 || totalCredit === 0) {
      e.balance = "Total debit dan kredit tidak boleh nol";
    } else if (!isBalanced) {
      e.balance = `Debit dan kredit tidak seimbang (selisih ${new Intl.NumberFormat("id-ID").format(diff)})`;
    }

    const debitAccounts = new Set<string>();
    const creditAccounts = new Set<string>();

    for (const l of form.lines) {
      if (
        !l.accountCode.trim() &&
        (parseAmount(l.debit) > 0 || parseAmount(l.credit) > 0)
      ) {
        e.lines = "Semua baris yang memiliki nilai harus memilih akun";
        break;
      }
      if (l.accountCode.trim()) {
        const acc = accounts.find((a) => a.code === l.accountCode.trim());
        if (!acc) {
          e.lines = `Kode akun ${l.accountCode.trim()} tidak valid`;
          break;
        }

        const accType = (acc.type || "").toLowerCase();
        const hasDebit = parseAmount(l.debit) > 0;
        const hasCredit = parseAmount(l.credit) > 0;

        if (accType === "revenue" && hasDebit) {
          e.lines = `Akun pendapatan "${acc.code} - ${acc.name}" harus dicatat di sisi KREDIT, bukan Debit.`;
          break;
        }
        if (accType === "expense" && hasCredit) {
          e.lines = `Akun beban "${acc.code} - ${acc.name}" harus dicatat di sisi DEBIT, bukan Kredit.`;
          break;
        }

        if (hasDebit) debitAccounts.add(l.accountCode.trim());
        if (hasCredit) creditAccounts.add(l.accountCode.trim());
      }
    }

    if (!e.lines) {
      const duplicateAccounts = [...debitAccounts].filter((code) =>
        creditAccounts.has(code),
      );
      if (duplicateAccounts.length > 0) {
        const dupNames = duplicateAccounts.map((code) => {
          const acc = accounts.find((a) => a.code === code);
          return acc ? `${code} (${acc.name})` : code;
        });
        e.lines = `Akun debit dan kredit tidak boleh sama pada jurnal yang sama. Akun beririsan: ${dupNames.join(", ")}`;
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form, totalDebit, totalCredit, isBalanced, diff, accounts]);

  const updateLine = useCallback(
    (uid: string, field: keyof JournalLineForm, value: string) => {
      setForm((f) => ({
        ...f,
        lines: f.lines.map((l) => {
          if (l.uid !== uid) return l;
          const updated = { ...l, [field]: value };
          if (field === "debit" && value && parseAmount(value) > 0)
            updated.credit = "";
          if (field === "credit" && value && parseAmount(value) > 0)
            updated.debit = "";
          return updated;
        }),
      }));
    },
    [],
  );

  const updateAccount = useCallback(
    (uid: string, accountCode: string, accountName: string) => {
      setForm((f) => ({
        ...f,
        lines: f.lines.map((l) => {
          if (l.uid !== uid) return l;
          return { ...l, accountCode, accountName };
        }),
      }));
    },
    [],
  );

  const addLine = useCallback(() => {
    setForm((f) => ({ ...f, lines: [...f.lines, makeEmptyLine()] }));
  }, []);

  const removeLine = useCallback((uid: string) => {
    setForm((f) => {
      if (f.lines.length <= MIN_LINES) return f;
      return { ...f, lines: f.lines.filter((l) => l.uid !== uid) };
    });
  }, []);

  // ── Simpan Draft ──
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!validate()) return;

    const payload = buildPayload(form, "draft");
    const ok = await onSave(payload);
    if (ok) onBack();
  };

  // ── Simpan & Post ──
  const handleSaveAndPost = async () => {
    setSubmitAttempted(true);
    if (!validate()) return;

    const payload = buildPayload(form, "posted");
    const ok = await onSave(payload);
    if (ok) onBack();
  };

  const handleChange = (fn: () => void) => {
    fn();
    if (submitAttempted) {
      setTimeout(() => validate(), 0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Header fields */}
      <div className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-md p-5">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Informasi Entry
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-4">
          <div>
            <label className={labelCls}>
              Tanggal <Required />
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleChange(() =>
                  setForm((f) => ({ ...f, date: e.target.value })),
                )
              }
              className={`${inputCls} ${errors.date ? errorRing : ""}`}
            />
            {errors.date && <ErrorMsg>{errors.date}</ErrorMsg>}
          </div>
          <div>
            <label className={labelCls}>
              Deskripsi <Required />
            </label>
            <input
              type="text"
              placeholder="Misal: Pembayaran sewa kantor bulan Januari"
              value={form.description}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleChange(() =>
                  setForm((f) => ({ ...f, description: e.target.value })),
                )
              }
              className={`${inputCls} ${errors.description ? errorRing : ""}`}
            />
            {errors.description && <ErrorMsg>{errors.description}</ErrorMsg>}
          </div>
        </div>
      </div>

      {/* Lines */}
      <div className="bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-md">
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/80 dark:bg-gray-800/50 rounded-t-2xl">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Baris Jurnal
          </h2>
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
          >
            <IconPlus size={13} />
            Tambah Baris
          </button>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[780px]">
            <div className="grid grid-cols-[5fr_4fr_2.5fr_2.5fr_auto] gap-2 px-5 py-2 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/30">
              {["Akun", "Keterangan", "Debit (Rp)", "Kredit (Rp)", ""].map(
                (h) => (
                  <span
                    key={h}
                    className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </span>
                ),
              )}
            </div>

            <div className="divide-y divide-gray-50 dark:divide-gray-800/30">
              {form.lines.map((line, idx) => (
                <JournalLineRow
                  key={line.uid}
                  line={line}
                  index={idx}
                  accounts={accounts}
                  canRemove={form.lines.length > MIN_LINES}
                  onUpdate={updateLine}
                  onUpdateAccount={updateAccount}
                  onRemove={removeLine}
                />
              ))}
            </div>
          </div>
        </div>

        <BalanceFooter
          totalDebit={totalDebit}
          totalCredit={totalCredit}
          isBalanced={isBalanced}
          hasAmounts={hasAmounts}
          diff={diff}
        />
      </div>

      {/* Error messages */}
      {(errors.lines || errors.balance) && (
        <div className="flex flex-col gap-1.5">
          {errors.lines && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-sm text-rose-600 dark:text-rose-400">
              <AlertTriangle size={14} />
              {errors.lines}
            </div>
          )}
          {errors.balance && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle size={14} />
              {errors.balance}
            </div>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between gap-3 pt-1 pb-2">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          <IconArrowLeft size={15} />
          Kembali
        </button>
        <div className="flex gap-2.5">
          {/* Simpan Draft */}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-60"
          >
            {saving ? (
              <SpinnerIcon className="w-3.5 h-3.5" />
            ) : (
              <IconCheck size={14} />
            )}
            Simpan Draft
          </button>

          {/* Simpan & Post — langsung posted */}
          <button
            type="button"
            disabled={saving || !isBalanced || !hasAmounts}
            onClick={handleSaveAndPost}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl hover:shadow-lg hover:shadow-primary-500/25 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {saving ? (
              <SpinnerIcon className="w-3.5 h-3.5" />
            ) : (
              <IconSend size={14} />
            )}
            Simpan & Post
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── AccountSelect ────────────────────────────────────────────────────
function AccountSelect({
  accounts,
  value,
  onChange,
}: {
  accounts: Account[];
  value: string;
  onChange: (code: string, name: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedAccount = accounts.find((a) => a.code === value);
  const displayValue = selectedAccount
    ? `${selectedAccount.code} — ${selectedAccount.name}`
    : "";

  const updatePosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScroll = () => setIsOpen(false);
      const handleResize = () => updatePosition();
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = accounts.filter((a) => {
    const s = search.toLowerCase();
    return a.code.toLowerCase().includes(s) || a.name.toLowerCase().includes(s);
  });

  const dropdown = (
    <div
      ref={dropdownRef}
      style={
        dropdownPos
          ? {
              position: "fixed",
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
            }
          : {}
      }
      className="z-[9999] bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {filtered.length === 0 ? (
        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
          Tidak ada akun ditemukan
        </div>
      ) : (
        filtered.map((a) => (
          <div
            key={a.code}
            className="px-3 py-2 text-sm hover:bg-primary-50 dark:hover:bg-primary-500/10 cursor-pointer flex flex-col"
            onClick={() => {
              onChange(a.code, a.name);
              setIsOpen(false);
              setSearch("");
            }}
          >
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {a.code}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-[11px]">
              {a.name}
            </span>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        className={`w-full px-2 py-1.5 min-h-[34px] text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-darkBg text-gray-800 dark:text-gray-200 outline-none focus-within:ring-2 focus-within:ring-primary-500/30 focus-within:border-primary-500 transition cursor-text flex items-center`}
        onClick={() => {
          setIsOpen(true);
          updatePosition();
        }}
      >
        {isOpen ? (
          <input
            autoFocus
            type="text"
            className="w-full bg-transparent outline-none placeholder-gray-300 dark:placeholder-gray-600"
            placeholder="Cari kode/nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsOpen(false);
            }}
          />
        ) : (
          <span
            className={`w-full truncate ${!displayValue ? "text-gray-400 dark:text-gray-500" : ""}`}
          >
            {displayValue || "Pilih Akun..."}
          </span>
        )}
      </div>
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(dropdown, document.body)}
    </div>
  );
}

// ─── JournalLineRow ───────────────────────────────────────────────────
interface LineRowProps {
  line: JournalLineForm;
  index: number;
  accounts: Account[];
  canRemove: boolean;
  onUpdate: (uid: string, field: keyof JournalLineForm, value: string) => void;
  onUpdateAccount: (uid: string, code: string, name: string) => void;
  onRemove: (uid: string) => void;
}

function JournalLineRow({
  line,
  index,
  accounts,
  canRemove,
  onUpdate,
  onUpdateAccount,
  onRemove,
}: LineRowProps) {
  const hasDebit = parseFloat(line.debit) > 0;
  const hasCredit = parseFloat(line.credit) > 0;

  return (
    <div className="grid grid-cols-[5fr_4fr_2.5fr_2.5fr_auto] gap-2 px-5 py-2 items-center group hover:bg-primary-50/30 dark:hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-400 dark:text-gray-600 w-4 shrink-0 tabular-nums font-medium">
          {index + 1}
        </span>
        <AccountSelect
          accounts={accounts}
          value={line.accountCode}
          onChange={(code, name) => onUpdateAccount(line.uid, code, name)}
        />
      </div>
      <div>
        <input
          type="text"
          placeholder="Keterangan baris (opsional)"
          value={line.description}
          onChange={(e) => onUpdate(line.uid, "description", e.target.value)}
          className={linputCls}
        />
      </div>
      <div>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={line.debit}
          onChange={(e) => onUpdate(line.uid, "debit", e.target.value)}
          disabled={hasCredit}
          className={`${linputCls} text-right tabular-nums ${hasDebit ? "text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/20" : ""} disabled:opacity-40 disabled:cursor-not-allowed`}
        />
      </div>
      <div>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={line.credit}
          onChange={(e) => onUpdate(line.uid, "credit", e.target.value)}
          disabled={hasDebit}
          className={`${linputCls} text-right tabular-nums ${hasCredit ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" : ""} disabled:opacity-40 disabled:cursor-not-allowed`}
        />
      </div>
      <div className="flex justify-center ml-1">
        <button
          type="button"
          onClick={() => onRemove(line.uid)}
          disabled={!canRemove}
          title="Hapus baris"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 disabled:pointer-events-none"
        >
          <IconTrash size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── BalanceFooter ────────────────────────────────────────────────────
interface BalanceFooterProps {
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  hasAmounts: boolean;
  diff: number;
}

function BalanceFooter({
  totalDebit,
  totalCredit,
  isBalanced,
  hasAmounts,
  diff,
}: BalanceFooterProps) {
  const fmt = (n: number) =>
    n === 0
      ? "—"
      : new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);

  return (
    <div
      className={`px-5 py-3 border-t flex items-center justify-between ${
        !hasAmounts
          ? "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30"
          : isBalanced
            ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5"
            : "border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5"
      }`}
    >
      <div className="flex items-center gap-2">
        {hasAmounts &&
          (isBalanced ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 size={16} />
              Seimbang
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              <AlertTriangle size={16} />
              Selisih: {fmt(diff)}
            </span>
          ))}
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div className="text-right">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
            Total Debit
          </p>
          <p className="font-semibold tabular-nums text-primary-700 dark:text-primary-400 mt-0.5">
            {fmt(totalDebit)}
          </p>
        </div>
        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />
        <div className="text-right">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
            Total Kredit
          </p>
          <p className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5">
            {fmt(totalCredit)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Shared UI Helpers ────────────────────────────────────────────────
function Required() {
  return <span className="text-rose-400 ml-0.5">*</span>;
}

function ErrorMsg({ children }: { children: string }) {
  return (
    <p className="mt-1.5 text-[11px] font-medium text-rose-500 flex items-center gap-1">
      <AlertTriangle size={12} />
      {children}
    </p>
  );
}

const labelCls =
  "block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5";
const inputCls =
  "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-darkBg text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition shadow-sm";
const errorRing =
  "border-rose-400 dark:border-rose-500 focus:ring-rose-500/30 focus:border-rose-500";
const linputCls =
  "w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-darkBg text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition placeholder-gray-300 dark:placeholder-gray-600";

void formatDisplayAmount;
