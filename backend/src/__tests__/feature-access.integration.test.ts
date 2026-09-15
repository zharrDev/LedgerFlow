// Integration test komposisi middleware Week2: auth stub -> premiumFeatureRateLimit
// -> featureAccessLogger -> handler. Diuji lewat Hono app.request() tanpa DB.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { featureAccessLogger } from "../middleware/accessLogger.js";
import { premiumFeatureRateLimit } from "../middleware/rateLimit.js";

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn(async () => ({
    data: { email: "int@test.co", company_id: "comp-int" },
    error: null,
  }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const insert = vi.fn(async (..._args: any[]) => ({ error: null }));
  const from = vi.fn(() => ({ select, insert }));
  return { maybeSingle, eq, select, insert, from };
});

vi.mock("../lib/supabase.js", () => ({ supabase: { from: mocks.from } }));

function buildApp(userId: string) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("user", { sub: userId, role: "owner", company_id: "comp-int" });
    await next();
  });
  app.use("/check", premiumFeatureRateLimit, featureAccessLogger);
  app.get("/check", (c) => {
    (c as any).set("featureGranted", true);
    return c.json({ ok: true });
  });
  return app;
}

beforeEach(() => {
  mocks.from.mockClear();
  mocks.insert.mockClear();
});

describe("komposisi premiumFeatureRateLimit + featureAccessLogger", () => {
  it("request premium lolos dan tercatat di feature_access_logs", async () => {
    const app = buildApp("user-int-log");
    const res = await app.request("/check?feature=export_pdf", {
      headers: { "x-forwarded-for": "9.9.9.9", "user-agent": "vitest" },
    });
    expect(res.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith("feature_access_logs");
    const logged = mocks.insert.mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(logged).toMatchObject({
      user_id: "user-int-log",
      feature: "export_pdf",
      granted: true,
    });
  });

  it("memblokir request ke-31 dalam satu menit dengan 429", async () => {
    const app = buildApp("user-int-limit");
    for (let i = 0; i < 30; i++) {
      const res = await app.request("/check");
      expect(res.status).toBe(200);
    }
    const blocked = await app.request("/check");
    expect(blocked.status).toBe(429);
    const body = (await blocked.json()) as { retry_after?: number };
    expect(body.retry_after).toBeGreaterThan(0);
    expect(mocks.from).toHaveBeenCalledWith("rate_limit_logs");
  });
});
