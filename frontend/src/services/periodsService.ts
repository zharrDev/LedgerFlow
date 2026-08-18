// services/periodsService.ts
import { api } from "../lib/api";
import type { Period } from "../types/reports";

// Service periode: handle request frontend ke endpoint periods backend
export const periodsService = {
  // Ambil semua periode berdasarkan companyId
  getAll: async (companyId: string): Promise<Period[]> => {
    const { data } = await api.get("api/periods", {
      params: { company_id: companyId },
      skipErrorToast: true,
    });
    return data;
  },

  // Membuka periode baru
  open: async (companyId: string, year: number, month: number) => {
    const { data } = await api.post(
      "api/periods",
      {
        company_id: companyId,
        year,
        month,
      },
      { skipErrorToast: true },
    );
    return data;
  },

  // Menutup periode berdasarkan id
  close: async (id: string) => {
    const { data } = await api.patch(`api/periods/${id}/close`, undefined, {
      skipErrorToast: true,
    });
    return data;
  },
};
