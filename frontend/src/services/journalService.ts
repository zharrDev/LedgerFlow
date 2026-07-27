import type { JournalEntry, CreateJournalPayload } from "../types/journal";
import { api } from "../lib/api";

function mapJournal(j: any): JournalEntry {
  return {
    id: j.id,
    number: j.entry_number,
    date: j.entry_date,
    description: j.description ?? "",
    status: j.status,
    createdAt: j.created_at,

    lines: (j.journal_entry_lines ?? []).map((line: any) => ({
      id: line.id,
      accountCode: line.accounts?.code ?? "",
      accountName: line.accounts?.name ?? "",
      description: line.memo ?? "",
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0),
    })),

    totalDebit:
      j.journal_entry_lines?.reduce(
        (sum: number, line: any) => sum + Number(line.debit || 0),
        0,
      ) ?? 0,

    totalCredit:
      j.journal_entry_lines?.reduce(
        (sum: number, line: any) => sum + Number(line.credit || 0),
        0,
      ) ?? 0,
  };
}

export const journalService = {
  getAll: async (): Promise<JournalEntry[]> => {
    const { data } = await api.get("/api/journal");
    return data.map(mapJournal);
  },

  getById: async (id: string): Promise<JournalEntry> => {
    const { data } = await api.get(`/api/journal/${id}`);
    return mapJournal(data);
  },

  create: async (payload: CreateJournalPayload): Promise<JournalEntry> => {
    if (!payload.lines || payload.lines.length < 2) {
      throw new Error("Minimum 2 journal lines required");
    }

    for (const line of payload.lines) {
      if (!line.accountCode) {
        throw new Error("accountCode is required in all journal lines");
      }
    }

    try {
      const { data } = await api.post("/api/journal", payload);
      return journalService.getById(data.id);
    } catch (error: any) {
      console.error("Journal creation error:", error.response?.data);
      throw error;
    }
  },

  post: async (id: string): Promise<JournalEntry> => {
    const { data } = await api.post(`/api/journal/${id}/post`);
    return mapJournal(data);
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/api/journal/${id}`);
  },
};
