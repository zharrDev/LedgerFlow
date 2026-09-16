// Unit test provisionCompanyFoundation (lib/companyProvision.ts).
// Supabase di-mock: verifikasi isi upsert (26 akun + 12 periode) tanpa DB.
import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const upsert = vi.fn(async (..._args: any[]): Promise<any> => ({ error: null }));
  const from = vi.fn((_table: string) => ({ upsert }));
  return { upsert, from };
});

vi.mock("../lib/supabase.js", () => ({ supabase: { from: mocks.from } }));

import {
  provisionCompanyFoundation,
  DEFAULT_ACCOUNTS,
} from "../lib/companyProvision.js";

beforeEach(() => {
  mocks.from.mockClear();
  mocks.upsert.mockClear();
});

describe("provisionCompanyFoundation", () => {
  it("upsert 26 akun standar + 12 periode dalam 2 round-trip", async () => {
    await provisionCompanyFoundation("comp-1");

    expect(mocks.from).toHaveBeenCalledWith("accounts");
    expect(mocks.from).toHaveBeenCalledWith("periods");
    expect(mocks.upsert).toHaveBeenCalledTimes(2);

    const [accRows, accOpts] = mocks.upsert.mock.calls[0] as unknown as [
      Array<Record<string, unknown>>,
      Record<string, unknown>,
    ];
    expect(accRows).toHaveLength(26);
    expect(accRows).toHaveLength(DEFAULT_ACCOUNTS.length);
    expect(accOpts).toMatchObject({ onConflict: "company_id,code" });
    for (const row of accRows) {
      expect(row.company_id).toBe("comp-1");
      expect(row.is_active).toBe(true);
    }

    const [perRows, perOpts] = mocks.upsert.mock.calls[1] as unknown as [
      Array<Record<string, unknown>>,
      Record<string, unknown>,
    ];
    expect(perRows).toHaveLength(12);
    expect(perOpts).toMatchObject({ onConflict: "company_id,year,month" });
    const months = perRows.map((r) => r.month).sort((a, b) => (a as number) - (b as number));
    expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("throw bila upsert akun gagal", async () => {
    mocks.upsert.mockResolvedValueOnce({ error: { message: "boom" } });
    await expect(provisionCompanyFoundation("comp-1")).rejects.toThrow(/seed_accounts/);
  });

  it("throw bila upsert periode gagal", async () => {
    mocks.upsert
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "boom" } });
    await expect(provisionCompanyFoundation("comp-1")).rejects.toThrow(/seed_periods/);
  });
});
