// Regression test: GET /api/payments/subscription WAJIB mengembalikan
// field computed is_active/is_trial/trial_days_left (kontrak dengan
// useSubscription di frontend). Tanpa field ini canAccess() selalu false →
// paywall permanen walau user sudah Pro.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

const DAY = 86400000;
const future = new Date(Date.now() + 10 * DAY).toISOString();
const past = new Date(Date.now() - 10 * DAY).toISOString();

const proFeatures = [
  "chart_of_accounts",
  "journal_entries",
  "dashboard",
  "general_ledger",
  "income_statement",
  "balance_sheet",
  "cash_flow",
  "export_pdf",
  "multi_company",
  "ai_cfo",
  "priority_support",
];

let currentSub: unknown = null;

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
      sub: "user-sub-test",
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
  mocks.maybeSingle.mockImplementation(async () => ({ data: currentSub, error: null }));
});

describe("GET /subscription computed fields", () => {
  it("Pro aktif → is_active true, bukan trial", async () => {
    currentSub = {
      status: "active",
      trial_end: null,
      current_period_end: future,
      plans: { name: "pro", features: proFeatures },
    };
    const res = await buildApp().request("/api/payments/subscription");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.is_active).toBe(true);
    expect(body.is_trial).toBe(false);
    expect(body.trial_days_left).toBe(0);
  });

  it("Trial berjalan → is_active + is_trial true dengan sisa hari", async () => {
    currentSub = {
      status: "trialing",
      trial_end: future,
      current_period_end: future,
      plans: { name: "free", features: ["dashboard"] },
    };
    const res = await buildApp().request("/api/payments/subscription");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.is_active).toBe(true);
    expect(body.is_trial).toBe(true);
    expect(body.trial_days_left).toBeGreaterThan(0);
  });

  it("Subscription kedaluwarsa → is_active false", async () => {
    currentSub = {
      status: "active",
      trial_end: null,
      current_period_end: past,
      plans: { name: "pro", features: proFeatures },
    };
    const res = await buildApp().request("/api/payments/subscription");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.is_active).toBe(false);
    expect(body.is_trial).toBe(false);
  });
});
