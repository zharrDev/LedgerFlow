// Unit test endpoint monitoring admin-gate (routes/admin-gate.ts).
// Diuji lewat Hono app.request() dengan middleware auth & Supabase di-mock.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";

const mocks = vi.hoisted(() => {
  const state = {
    count: 0,
    rows: [] as any[],
    error: null as any,
  };
  const makeChain = () => {
    const chain: any = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.gte = vi.fn(() => chain);
    chain.or = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.limit = vi.fn(async () => ({ data: state.rows, error: state.error }));
    chain.range = vi.fn(async () => ({ data: state.rows, error: state.error }));
    chain.then = (resolve: any) => resolve({ count: state.count, error: state.error });
    return chain;
  };
  const from = vi.fn((_table: string) => makeChain());
  return { state, from };
});

vi.mock("../middleware/admin-gate.js", () => ({
  requireAdminGate: async (_c: any, next: any) => {
    await next();
  },
}));

vi.mock("../lib/supabase.js", () => ({ supabase: { from: mocks.from } }));

import adminGate from "../routes/admin-gate.js";

function buildApp() {
  const app = new Hono();
  app.route("/api/admin-gate", adminGate);
  return app;
}

beforeEach(() => {
  mocks.state.count = 0;
  mocks.state.rows = [];
  mocks.state.error = null;
  mocks.from.mockClear();
});

describe("GET /api/admin-gate/monitoring/summary", () => {
  it("mengembalikan totals + top lists untuk range valid", async () => {
    mocks.state.count = 7;
    mocks.state.rows = [
      { feature: "export_pdf", user_id: "u1", user_email: "a@x.co", granted: true, created_at: new Date().toISOString() },
      { feature: "export_pdf", user_id: "u1", user_email: "a@x.co", granted: false, created_at: new Date().toISOString() },
      { feature: "income_statement", user_id: "u2", user_email: null, granted: true, created_at: new Date().toISOString() },
    ];
    const res = await buildApp().request("/api/admin-gate/monitoring/summary?range=7d");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.range).toBe("7d");
    expect(body.totals.access).toBe(7);
    expect(body.top_features[0]).toMatchObject({ feature: "export_pdf", count: 2 });
    expect(body.top_users[0]).toMatchObject({ user_id: "u1", count: 2 });
  });

  it("range invalid jatuh ke 24h", async () => {
    const res = await buildApp().request("/api/admin-gate/monitoring/summary?range=99x");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.range).toBe("24h");
  });

  it("error DB menjadi 500 generik tanpa bocor detail", async () => {
    mocks.state.error = { message: "SECRET_DB_DETAIL", code: "XX000" };
    const res = await buildApp().request("/api/admin-gate/monitoring/summary");
    expect(res.status).toBe(500);
    const body = (await res.json()) as any;
    expect(JSON.stringify(body)).not.toContain("SECRET_DB_DETAIL");
  });
});

describe("GET /api/admin-gate/monitoring/feature-logs", () => {
  it("memvalidasi limit/page dan mengembalikan data", async () => {
    mocks.state.rows = [{ id: "1" }];
    const res = await buildApp().request(
      "/api/admin-gate/monitoring/feature-logs?feature=export_pdf&granted=true&limit=9999&page=0",
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.page).toBe(1);
    expect(body.limit).toBe(200);
    expect(body.data).toEqual([{ id: "1" }]);
  });
});

describe("GET /api/admin-gate/monitoring/rate-limit-logs", () => {
  it("mengembalikan data + pagination", async () => {
    mocks.state.rows = [{ id: "9" }];
    const res = await buildApp().request("/api/admin-gate/monitoring/rate-limit-logs?search=1.2.3.4&page=2&limit=10");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.page).toBe(2);
    expect(body.limit).toBe(10);
    expect(body.data).toEqual([{ id: "9" }]);
  });
});
