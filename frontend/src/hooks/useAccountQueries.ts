// frontend/src/hooks/useAccountQueries.ts
// React Query hooks untuk accounts — caching, refetch otomatis.
// Terpisah dari useAccounts.ts (legacy) untuk backward compatibility.
//
// Pemakaian baru:
//   const { data, isLoading } = useAccountListQuery()
//   const create = useCreateAccountMutation()

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { accountsService } from "../services/accountsService";
import type { AccountFormData } from "../types/account";
import { useToast } from "../context/ToastContext";

/** List semua akun (React Query version) */
export function useAccountListQuery() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: accountsService.getAll,
    staleTime: 5 * 60 * 1000,
  });
}

/** Buat akun baru */
export function useCreateAccountMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (formData: AccountFormData) => accountsService.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast({ variant: "success", title: "Akun berhasil dibuat" });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.error || err?.message || "Gagal membuat akun";
      toast({ variant: "error", title: "Gagal membuat akun", message: msg });
    },
  });
}

/** Update akun */
export function useUpdateAccountMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<AccountFormData>;
    }) => accountsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast({ variant: "success", title: "Akun berhasil diperbarui" });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Gagal memperbarui akun";
      toast({
        variant: "error",
        title: "Gagal memperbarui akun",
        message: msg,
      });
    },
  });
}

/** Hapus/nonaktifkan akun */
export function useDeleteAccountMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => accountsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast({ variant: "success", title: "Akun berhasil dinonaktifkan" });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Gagal menonaktifkan akun";
      toast({
        variant: "error",
        title: "Gagal menonaktifkan akun",
        message: msg,
      });
    },
  });
}
