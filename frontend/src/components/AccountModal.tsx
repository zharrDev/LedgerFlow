import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FormEvent } from "react";
import type {
  Account,
  AccountFormData,
  FormErrors,
} from "../types/account";
import {
  ACCOUNT_TYPES,
  NORMAL_BALANCE_MAP,
  TYPE_CLASSES,
  DEFAULT_ACCOUNT_FORM,
  CODE_REGEX,
} from "../types/constants";
import { useLanguage } from "../hooks/useLanguage";
import { tx } from "../i18n/tx";
import { IconClose, SpinnerIcon } from "./AccountShared";

export function AccountModal({
  open,
  onClose,
  editAccount,
  onSave,
  saving,
  existingCodes = [],
}: {
  open: boolean;
  onClose: () => void;
  editAccount: Account | null;
  onSave: (data: AccountFormData, id?: string) => Promise<boolean>;
  saving: boolean;
  /** Daftar code akun yang sudah ada — untuk cek duplikat sebelum submit */
  existingCodes?: string[];
}) {
  const { language } = useLanguage();
  const [form, setForm] = useState<AccountFormData>(DEFAULT_ACCOUNT_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (open) {
      setErrors({});
      setForm(
        editAccount
          ? {
              code: editAccount.code,
              name: editAccount.name,
              type: editAccount.type,
              normalBalance: editAccount.normalBalance,
              isActive: editAccount.isActive,
            }
          : DEFAULT_ACCOUNT_FORM,
      );
    }
  }, [open, editAccount]);

  const validate = () => {
    const e: FormErrors = {};
    const code = form.code.trim();
    if (!code) e.code = tx(language, "Code is required", "Kode wajib diisi");
    else if (!CODE_REGEX.test(code)) e.code = tx(language, "Code must be 3-6 digits", "Kode harus 3-6 digit");
    else {
      // Cek duplikat (abaikan code milik akun yang sedang diedit)
      const isDuplicate = existingCodes.some(
        (c) =>
          c.trim().toLowerCase() === code.toLowerCase() &&
          c.trim().toLowerCase() !== (editAccount?.code ?? "").toLowerCase(),
      );
      if (isDuplicate)
        e.code = tx(language, `Code "${code}" is already in use — use a unique code`, `Code "${code}" sudah dipakai — gunakan code yang unik`);
    }
    if (!form.name.trim()) e.name = tx(language, "Name is required", "Nama wajib diisi");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const ok = await onSave(form, editAccount?.id);
    if (ok) onClose();
    // Jika gagal (mis. server tetap menolak duplikat), tandai field code
    else if (!ok)
      setErrors((prev) => ({
        ...prev,
        code:
          prev.code ||
          tx(language, "Failed to save — check if the code is already in use", "Gagal menyimpan — periksa apakah code sudah dipakai"),
      }));
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => !saving && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25 }}
            className="w-full max-w-md bg-white/95 dark:bg-darkBg/95 backdrop-blur-xl rounded-2xl border border-primary-500/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
                  {editAccount ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editAccount ? tx(language, "Edit Account", "Edit Akun") : tx(language, "Add New Account", "Tambah Akun Baru")}
                </h2>
              </div>
              <button
                onClick={onClose}
                disabled={saving}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Code & Name in one row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    {tx(language, "Account Code", "Kode Akun")}
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, code: e.target.value }))
                    }
                    className={`w-full px-3 py-2 text-sm border rounded-xl bg-white dark:bg-darkCard text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all ${errors.code ? "border-red-400" : "border-gray-200 dark:border-gray-700"}`}
                    placeholder={tx(language, "e.g. 1000", "cth. 1000")}
                  />
                  {errors.code && (
                    <p className="mt-1 text-xs text-red-500">{errors.code}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    {tx(language, "Account Name", "Nama Akun")}
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className={`w-full px-3 py-2 text-sm border rounded-xl bg-white dark:bg-darkCard text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 ${errors.name ? "border-red-400" : "border-gray-200 dark:border-gray-700"}`}
                    placeholder={tx(language, "e.g. Cash in Bank", "cth. Kas di Bank")}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                  )}
                </div>
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                  {tx(language, "Account Type", "Tipe Akun")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {ACCOUNT_TYPES.map((t) => {
                    const cls = TYPE_CLASSES[t];
                    const selected = form.type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setForm((f) => ({
                            ...f,
                            type: t,
                            normalBalance: NORMAL_BALANCE_MAP[t],
                          }));
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${selected ? `${cls.button} shadow-sm` : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-primary-500"}`}
                      >
                        {tx(language, t.charAt(0).toUpperCase() + t.slice(1), t === "asset" ? "Aset" : t === "liability" ? "Kewajiban" : t === "equity" ? "Ekuitas" : t === "revenue" ? "Pendapatan" : "Beban")}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Normal Balance & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                    {tx(language, "Normal Balance", "Saldo Normal")}
                  </label>
                  <div className="flex p-0.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, normalBalance: "Debit" }))
                      }
                      className={`flex-1 py-1.5 text-xs rounded-lg transition-all ${form.normalBalance === "Debit" ? "bg-white dark:bg-darkCard shadow-sm text-primary-600" : "text-gray-400"}`}
                    >
                      Debit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, normalBalance: "Credit" }))
                      }
                      className={`flex-1 py-1.5 text-xs rounded-lg transition-all ${form.normalBalance === "Credit" ? "bg-white dark:bg-darkCard shadow-sm text-primary-600" : "text-gray-400"}`}
                    >
                      Credit
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                    {tx(language, "Status", "Status")}
                  </label>
                  <div className="flex p-0.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, isActive: true }))}
                      className={`flex-1 py-1.5 text-xs rounded-lg transition-all ${form.isActive ? "bg-white dark:bg-darkCard shadow-sm text-emerald-600" : "text-gray-400"}`}
                    >
                      {tx(language, "Active", "Aktif")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, isActive: false }))
                      }
                      className={`flex-1 py-1.5 text-xs rounded-lg transition-all ${!form.isActive ? "bg-white dark:bg-darkCard shadow-sm text-rose-500" : "text-gray-400"}`}
                    >
                      {tx(language, "Inactive", "Nonaktif")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  {tx(language, "Cancel", "Batal")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-primary-500/25 transition-all"
                >
                  {saving && <SpinnerIcon className="w-4 h-4" />}
                  {editAccount ? tx(language, "Save Changes", "Simpan Perubahan") : tx(language, "Create Account", "Buat Akun")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
