// Regression test: guard billing — kepemilikan order, validasi siklus,
// dan endpoint cancel (downgrade ke Free).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn(
    async (): Promise<{ data: any; error: any }> => ({ data: null, error: null }),
  );
  const single = vi.fn(
    async (): Promise<{ data: any; error: any }> => ({ data: null, error: null }),
  );
  const eqUpdate = vi.fn(async () => ({ error: null }));
  const eq = vi.fn(() => ({ maybeSingle, single }));
  const select = vi.fn(() => ({ eq }));
  const update = vi.fn(() => ({ eq: eqUpdate }));
  const insert = vi.fn(async (..._args: any[]) => ({ error: null }));
  const from = vi.fn(() => ({ select, insert, update }));
  return { maybeSingle, single, eqUpdate, eq, select, update, insert, from };
});

vi.mock("../lib/supabase.js", () => ({ supabase: { from: mocks.from } }));
vi.mock("../middleware/auth.js", () => ({
  authMiddleware: async (c: any, next: any) => {
    c.set("user", {
      sub: "user-billing-test",
      role: "owner",
      company_id: "11111111-1111-1111-8111-111111111111",
      email: "test@demo.com",
    });
    await next();
  },
  requireRole: (...roles: string[]) => async (c: any, next: any) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    if (!roles.includes(user.role)) return c.json({ error: "Forbidden" }, 403);
    await next();
  },
}));

import payments from "../routes/payments.js";

function buildApp() {
  const app = new Hono();
  app.route("/api/payments", payments as any);
  return app;
}

function postJson(app: Hono, path: string, body: unknown) {
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("billing guards", () => {
  it("subscribe menolak billing_cycle selain monthly/yearly", async () => {
    const res = await postJson(buildApp(), "/api/payments/subscribe", {
      plan_name: "pro",
      billing_cycle: "lifetime",
    });
    expect(res.status).toBe(400);
  });

  it("test-complete menolak order milik user lain (404 generik)", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: {
        id: "pay-1",
        user_id: "user-LAIN",
        status: "pending",
        plan_name: "pro",
        billing_cycle: "monthly",
      },
      error: null,
    });
    const res = await postJson(buildApp(), "/api/payments/test-complete", {
      order_id: "LF-abcdef12-123",
    });
    expect(res.status).toBe(404);
  });

  it("cancel downgrade ke Free", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { id: "sub-1", plan_id: "pro-id", midtrans_subscription_id: null },
      error: null,
    });
    mocks.single.mockResolvedValueOnce({ data: { id: "free-id" }, error: null });
    const res = await postJson(buildApp(), "/api/payments/cancel", {
      reason: "test",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe("ok");
    expect(mocks.update).toHaveBeenCalled();
  });

  it("cancel tanpa subscription → 404", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const res = await postJson(buildApp(), "/api/payments/cancel", {});
    expect(res.status).toBe(404);
  });
});
