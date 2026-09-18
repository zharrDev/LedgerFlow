// Regression test: GET /api/payments/check-access mengembalikan
// required_plan yang benar untuk user aktif yang plan-nya kurang.
// (Dulu income_statement/balance_sheet/cash_flow/export_pdf dipetakan ke
// "free" — user Free yang ditolak malah disuruh upgrade ke plan yang sudah
// dimilikinya.)
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

const freeActiveSub = {
  status: "active",
  trial_end: null,
  current_period_end: new Date(Date.now() + 86400000).toISOString(),
  plans: {
    name: "free",
    features: ["chart_of_accounts", "journal_entries", "dashboard", "general_ledger"],
  },
};

const trialSub = {
  status: "trialing",
  trial_end: new Date(Date.now() + 86400000).toISOString(),
  current_period_end: new Date(Date.now() + 86400000).toISOString(),
  plans: {
    name: "free",
    features: ["chart_of_accounts", "journal_entries", "dashboard", "general_ledger"],
  },
};

let currentSub: unknown = freeActiveSub;

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn(
    async (): Promise<{ data: any; error: any }> => ({ data: null, error: null }),
  );
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const insert = vi.fn(async (..._args: any[]) => ({ error: null }));
  const from = vi.fn(() => ({ select, insert }));
  return { maybeSingle, eq, select, insert, from };
});

vi.mock("../lib/supabase.js", () => ({ supabase: { from: mocks.from } }));
vi.mock("../middleware/auth.js", () => ({
  authMiddleware: async (c: any, next: any) => {
    c.set("user", {
      sub: "user-check-access-test",
      role: "owner",
      company_id: "11111111-1111-1111-8111-111111111111",
      email: "test@demo.com",
    });
    await next();
  },
  requireRole: () => async (_c: any, next: any) => next(),
}));

import payments from "../routes/payments.js";

function buildApp() {
  const app = new Hono();
  app.route("/api/payments", payments as any);
  return app;
}

beforeEach(() => {
  currentSub = freeActiveSub;
  mocks.maybeSingle.mockImplementation(async () => ({ data: currentSub, error: null }));
});

describe("check-access required_plan", () => {
  it("user Free aktif ditolak income_statement dengan required_plan=pro", async () => {
    const res = await buildApp().request(
      "/api/payments/check-access?feature=income_statement",
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.has_access).toBe(false);
    expect(body.required_plan).toBe("pro");
  });

  it("user Free aktif ditolak export_csv dengan required_plan=enterprise", async () => {
    const res = await buildApp().request(
      "/api/payments/check-access?feature=export_csv",
    );
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.has_access).toBe(false);
    expect(body.required_plan).toBe("enterprise");
  });

  it("user trial tetap lolos fitur inti tanpa required_plan", async () => {
    currentSub = trialSub;
    const res = await buildApp().request(
      "/api/payments/check-access?feature=cash_flow",
    );
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.has_access).toBe(true);
    expect(body.required_plan).toBeNull();
  });
});
