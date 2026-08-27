import { useState, useEffect, useCallback } from "react";
import type { Account, AccountFormData } from "../types/account";
import { accountsService } from "../services/accountsService";
import { useToast } from "../context/ToastContext";
import { getSessionToken } from "../lib/session";
import { getErrorMessage } from "../lib/errorMessage";

// Helper: urutkan akun berdasarkan kode akun
function sortByCode(list: Account[]): Account[] {
  return [...list].sort((a, b) => a.code.localeCompare(b.code));
}

// Helper: ubah error backend menjadi pesan yang lebih ramah untuk user
function parseAccountError(e: unknown, code?: string): string {
  const anyErr = e as any;
  const status: number | undefined = anyErr?.response?.status;
  const serverMsg: string =
    anyErr?.response?.data?.error ||
    anyErr?.response?.data?.message ||
    (e instanceof Error ? e.message : "") ||
    "";

  const lower = serverMsg.toLowerCase();

  const looksDuplicate =
    status === 409 ||
    lower.includes("duplicate") ||
    lower.includes("unique") ||
    lower.includes("already exist") ||
    lower.includes("sudah ada") ||
    lower.includes("sudah dipakai") ||
    (status === 500 && lower.includes("code"));

  if (looksDuplicate) {
    return code
      ? `Code "${code}" sudah dipakai. Gunakan code yang unik.`
      : "Code akun sudah dipakai. Gunakan code yang unik.";
  }

  if (status === 401 || status === 403)
    return "Sesi Anda berakhir atau tidak memiliki izin. Silakan login ulang.";

  return getErrorMessage(e);
}

// Hook akun: handle fetch, create/update, dan toggle status akun
export function useAccounts() {
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchAccounts = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await accountsService.getAll();
      const list = Array.isArray(data) ? data : [];

      const mapped: Account[] = list.map((acc: any) => ({
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: (acc.type ?? "").toLowerCase(),
        normalBalance: acc.normal_balance === "DEBIT" ? "Debit" : "Credit",
        isActive: acc.is_active ?? true,
      }));

      setAccounts(sortByCode(mapped));
    } catch (e) {
      const msg = getErrorMessage(e);
      setError(msg);
      setAccounts([]);
      toast({ variant: "error", title: "Gagal memuat akun", message: msg });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Simpan akun: create kalau tanpa id, update kalau ada id
  const saveAccount = useCallback(
    async (data: AccountFormData, id?: string): Promise<boolean> => {
      setSaving(true);
      try {
        if (id) {
          await accountsService.update(id, data);
          toast({
            variant: "success",
            title: "Akun berhasil diperbarui",
            message: `${data.code} · ${data.name}`,
          });
        } else {
          await accountsService.create(data);
          toast({
            variant: "success",
            title: "Akun berhasil ditambahkan",
            message: `${data.code} · ${data.name}`,
          });
        }
        await fetchAccounts();
        return true;
      } catch (e) {
        toast({
          variant: "error",
          title: "Gagal menyimpan akun",
          message: parseAccountError(e, data.code),
        });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [toast, fetchAccounts],
  );

  // Toggle status aktif/nonaktif akun dengan optimistic update
  const toggleStatus = useCallback(
    async (account: Account) => {
      setToggling(true);
      const newStatus = !account.isActive;

      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === account.id ? { ...acc, isActive: newStatus } : acc,
        ),
      );

      try {
        await accountsService.update(account.id, {
          code: account.code,
          name: account.name,
          type: account.type,
          normalBalance: account.normalBalance,
          isActive: newStatus,
        });

        const title = newStatus
          ? "Akun berhasil diaktifkan"
          : "Akun berhasil dinonaktifkan";

        toast({
          variant: "success",
          title,
          message: `${account.code} · ${account.name}`,
        });

        return true;
      } catch (e) {
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.id === account.id ? { ...acc, isActive: !newStatus } : acc,
          ),
        );
        toast({
          variant: "error",
          title: "Gagal mengubah status",
          message: getErrorMessage(e),
        });
        return false;
      } finally {
        setToggling(false);
      }
    },
    [toast],
  );

  return {
    accounts,
    loading,
    error,
    saving,
    toggling,
    fetchAccounts,
    saveAccount,
    toggleStatus,
  };
}
