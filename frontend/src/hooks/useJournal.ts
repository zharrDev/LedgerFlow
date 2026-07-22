import { useState, useEffect, useCallback, useRef } from "react";
import type {
  JournalEntry,
  Toast,
  CreateJournalPayload,
} from "../types/journal";
import { journalService } from "../services/journalService";

// Helper: urutkan jurnal berdasarkan nomor entry secara ascending
function sortByEntryNumber(list: JournalEntry[]): JournalEntry[] {
  return [...list].sort((a, b) => {
    const numA = a.number ?? "";
    const numB = b.number ?? "";
    return numA.localeCompare(numB);
  });
}

// Hook jurnal: handle fetch, create, post, delete, dan toast notifikasi lokal
export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  // Helper toast lokal untuk feedback aksi jurnal
  const addToast = useCallback(
    (msg: string, type: Toast["type"] = "success") => {
      const id = ++toastId.current;
      setToasts((prev) => [...prev, { id, msg, type }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        3500,
      );
    },
    [],
  );

  // Ambil semua jurnal dari backend
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await journalService.getAll();
      setEntries(sortByEntryNumber(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, []);

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
        addToast("Entry berhasil dibuat");
        return created;
      } catch (e) {
        addToast(
          e instanceof Error ? e.message : "Gagal membuat entry",
          "error",
        );
        return null;
      } finally {
        setSaving(false);
      }
    },
    [addToast],
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
        addToast("Entry berhasil diposting ke buku besar");
        return true;
      } catch (e) {
        addToast(
          e instanceof Error ? e.message : "Gagal posting entry",
          "error",
        );
        return false;
      } finally {
        setPosting(false);
      }
    },
    [addToast],
  );

  // Hapus jurnal
  const deleteEntry = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await journalService.remove(id);
        setEntries((prev) => prev.filter((e) => e.id !== id));
        addToast("Draft berhasil dihapus");
        return true;
      } catch (e) {
        addToast(
          e instanceof Error ? e.message : "Gagal menghapus entry",
          "error",
        );
        return false;
      }
    },
    [addToast],
  );

  return {
    entries,
    loading,
    error,
    saving,
    posting,
    toasts,
    fetchEntries,
    createEntry,
    postEntry,
    deleteEntry,
  };
}
