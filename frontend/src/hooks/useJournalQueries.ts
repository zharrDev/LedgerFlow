// frontend/src/hooks/useJournalQueries.ts
// React Query hooks untuk journal entries — versi baru dengan caching.
// Terpisah dari useJournal.ts (legacy) untuk backward compatibility.
//
// Pemakaian baru:
//   const { data, isLoading } = useJournalListQuery()
//   const create = useCreateJournalMutation()

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { journalService } from "../services/journalService";
import type { CreateJournalPayload } from "../types/journal";
import { useToast } from "../context/ToastContext";

/** List semua journal entries */
export function useJournalListQuery() {
  return useQuery({
    queryKey: ["journals"],
    queryFn: journalService.getAll,
    staleTime: 2 * 60 * 1000,
  });
}

/** Detail satu journal entry */
export function useJournalDetailQuery(id: string | null) {
  return useQuery({
    queryKey: ["journals", id],
    queryFn: () => journalService.getById(id!),
    enabled: !!id,
  });
}

/** Kuota jurnal bulan ini */
export function useJournalQuotaQuery() {
  return useQuery({
    queryKey: ["journal-quota"],
    queryFn: journalService.getQuota,
    staleTime: 5 * 60 * 1000,
  });
}

/** Buat journal entry baru */
export function useCreateJournalMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateJournalPayload) =>
      journalService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      queryClient.invalidateQueries({ queryKey: ["journal-quota"] });
      toast({ variant: "success", title: "Jurnal berhasil dibuat" });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.error || err?.message || "Gagal membuat jurnal";
      toast({
        variant: "error",
        title: "Gagal membuat jurnal",
        message: msg,
      });
    },
  });
}

/** Post journal entry */
export function usePostJournalMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => journalService.post(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      queryClient.invalidateQueries({ queryKey: ["journal-quota"] });
      toast({ variant: "success", title: "Jurnal berhasil diposting" });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Gagal memposting jurnal";
      toast({
        variant: "error",
        title: "Gagal memposting jurnal",
        message: msg,
      });
    },
  });
}

/** Hapus journal entry */
export function useDeleteJournalMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => journalService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      queryClient.invalidateQueries({ queryKey: ["journal-quota"] });
      toast({ variant: "success", title: "Jurnal berhasil dihapus" });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Gagal menghapus jurnal";
      toast({
        variant: "error",
        title: "Gagal menghapus jurnal",
        message: msg,
      });
    },
  });
}
