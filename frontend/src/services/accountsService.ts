import type { Account, AccountFormData } from "../types/account";
import { api } from "../lib/api";
import { getSessionUser } from "../lib/session";

const API_BASE = "/api/accounts"; // endpoint dasar untuk semua request akun

// Helper: ambil company_id user dari sesi
const getCompanyId = () => {
  const user = getSessionUser<{
    company_id?: string;
    company?: { id?: string };
  }>();
  return user?.company_id || user?.company?.id || "";
};

// Service akun: bertugas menjembatani frontend dengan endpoint accounts di backend
export const accountsService = {
  // Ambil semua akun milik company user login
  getAll: async (): Promise<Account[]> => {
    const companyId = getCompanyId();
    const { data } = await api.get(API_BASE, {
      params: { company_id: companyId },
    });
    // Backend return { data, total, page, limit } — unwrap array
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  // Buat akun baru
  create: async (formData: AccountFormData): Promise<Account> => {
    const companyId = getCompanyId();
    const { data } = await api.post(API_BASE, {
      code: formData.code,
      name: formData.name,
      type: formData.type,
      normal_balance: formData.normalBalance,
      is_active: formData.isActive,
      company_id: companyId,
    });
    return data;
  },

  // Update akun berdasarkan id
  update: async (
    id: string,
    formData: Partial<AccountFormData>,
  ): Promise<Account> => {
    const payload: Record<string, any> = {};
    if (formData.code !== undefined) payload.code = formData.code;
    if (formData.name !== undefined) payload.name = formData.name;
    if (formData.type !== undefined) payload.type = formData.type;
    if (formData.normalBalance !== undefined)
      payload.normal_balance = formData.normalBalance;
    if (formData.isActive !== undefined) payload.is_active = formData.isActive;

    const { data } = await api.put(`${API_BASE}/${id}`, payload);
    return data;
  },

  // Hapus/nonaktifkan akun
  remove: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`${API_BASE}/${id}`);
    return data;
  },
};
