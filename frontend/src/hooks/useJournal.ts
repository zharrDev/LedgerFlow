import { useState, useEffect, useCallback } from "react";
import type {
  JournalEntry,
  CreateJournalPayload,
} from "../types/journal";
import { journalService } from "../services/journalService";
import { getErrorMessage } from "../lib/errorMessage";
import { useToast } from "../context/ToastContext";

// Helper: urutkan jurnal berdasarkan nomor entry secara ascending
function sortByEntryNumber(list: JournalEntry[]): JournalEntry[] {
  return [...list].sort((a, b) => {
    const numA = a.number ?? "";
    const numB = b.number ?? "";
    return numA.localeCompare(numB);
  });
}

// Hook jurnal: fetch, create, update (draft), post, void, delete + toast global
export function useJournal() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);

  // Ambil semua jurnal dari backend
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await journalService.getAll();
      setEntries(sortByEntryNumber(data));
    } catch (e) {
      const msg = getErrorMessage(e);
      setError(msg);
      toast({ variant: "error", title: "Gagal memuat jurnal", message: msg });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Buat jurnal baru
  const createEntry = useCallback(
    async (payload: CreateJournalPayload): Promise<JournalEntry | null> => {
      setSaving(true);
      try {
        const created = await journalService.create(payload);
        setEntries((prev) => sortByEntryNumber([...prev, created]));
        toast({ variant: "success", title: "Entry berhasil dibuat", message: created.number });
        return created;
      } catch (e) {
        const msg = getErrorMessage(e);
        toast({ variant: "error", title: "Gagal membuat entry", message: msg });
        return null;
      } finally {
        setSaving(false);
      }
    },
    [toast],
  );

  // Edit jurnal draft (PUT /api/journal/:id)
  const updateEntry = useCallback(
    async (id: string, payload: CreateJournalPayload): Promise<JournalEntry | null> => {
      setSaving(true);
      try {
        const updated = await journalService.update(id, payload);
        setEntries((prev) =>
          sortByEntryNumber(prev.map((e) => (e.id === id ? updated : e))),
        );
        toast({ variant: "success", title: "Entry berhasil diperbarui", message: updated.number });
        return updated;
      } catch (e) {
        const msg = getErrorMessage(e);
        toast({ variant: "error", title: "Gagal memperbarui entry", message: msg });
        return null;
      } finally {
        setSaving(false);
      }
    },
    [toast],
  );

  // Posting jurnal draft ke buku besar
  const postEntry = useCallback(
    async (id: string): Promise<boolean> => {
      setPosting(true);
      try {
        const updated = await journalService.post(id);
        setEntries((prev) =>
          sortByEntryNumber(prev.map((e) => (e.id === id ? updated : e))),
        );
        toast({ variant: "success", title: "Entry diposting", message: "Entry berhasil diposting ke buku besar" });
        return true;
      } catch (e) {
        const msg = getErrorMessage(e);
        toast({ variant: "error", title: "Gagal memposting", message: msg });
        return false;
      } finally {
        setPosting(false);
      }
    },
    [toast],
  );

  // Void jurnal posted (pembatalan tanpa hapus data)
  const voidEntry = useCallback(
    async (id: string, reason: string): Promise<boolean> => {
      try {
        const updated = await journalService.void(id, reason);
        setEntries((prev) =>
          sortByEntryNumber(prev.map((e) => (e.id === id ? updated : e))),
        );
        toast({ variant: "success", title: "Entry di-void", message: "Entry berhasil di-void" });
        return true;
      } catch (e) {
        const msg = getErrorMessage(e);
        toast({ variant: "error", title: "Gagal void entry", message: msg });
        return false;
      }
    },
    [toast],
  );

  // Hapus jurnal
  const deleteEntry = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await journalService.remove(id);
        setEntries((prev) => prev.filter((e) => e.id !== id));
        toast({ variant: "success", title: "Draft dihapus", message: "Draft berhasil dihapus" });
        return true;
      } catch (e) {
        const msg = getErrorMessage(e);
        toast({ variant: "error", title: "Gagal menghapus", message: msg });
        return false;
      }
    },
    [toast],
  );

  return {
    entries,
    loading,
    error,
    saving,
    posting,
    toasts: [],
    fetchEntries,
    createEntry,
    updateEntry,
    postEntry,
    deleteEntry,
    voidEntry,
  };
}
