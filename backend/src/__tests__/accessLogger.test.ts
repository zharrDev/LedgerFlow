// Unit test middleware featureAccessLogger (middleware/accessLogger.ts).
// Diuji lewat Hono app.request() tanpa server sungguhan.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import {
  featureAccessLogger,
  logFeatureAccess,
} from "../middleware/accessLogger.js";

// Mock Supabase: dukung rantai .select().eq().maybeSingle() dan .insert().
const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn(async () => ({
    data: { email: "t@t.co", company_id: "comp-1" },
    error: null,
  }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const insert = vi.fn(async (..._args: any[]) => ({ error: null }));
  const from = vi.fn(() => ({ select, insert }));
  return { maybeSingle, eq, select, insert, from };
});

vi.mock("../lib/supabase.js", () => ({ supabase: { from: mocks.from } }));

function buildApp(withUser: boolean) {
  const app = new Hono();
  if (withUser) {
    app.use("*", async (c, next) => {
      c.set("user", { sub: "user-1", role: "owner", company_id: "comp-1" });
      await next();
    });
  }
  app.use("/check", featureAccessLogger);
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

describe("featureAccessLogger", () => {
  it("mencatat akses fitur premium ke feature_access_logs", async () => {
    const app = buildApp(true);
    const res = await app.request("/check?feature=income_statement", {
      headers: {
        "x-forwarded-for": "1.2.3.4",
        "user-agent": "vitest",
      },
    });
    expect(res.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith("feature_access_logs");
    expect(mocks.insert).toHaveBeenCalledOnce();
    const logged = mocks.insert.mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(logged).toMatchObject({
      user_id: "user-1",
      feature: "income_statement",
      granted: true,
      ip_address: "1.2.3.4",
    });
  });

  it("tidak mencatat bila fitur bukan premium", async () => {
    const app = buildApp(true);
    const res = await app.request("/check?feature=dashboard");
    expect(res.status).toBe(200);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("tidak mencatat bila tanpa user", async () => {
    const app = buildApp(false);
    const res = await app.request("/check?feature=income_statement");
    expect(res.status).toBe(200);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("helper logFeatureAccess menulis satu baris log", async () => {
    const c = {
      req: {
        header: () => undefined,
        path: () => "/api/x",
        method: () => "POST",
      },
      get: () => ({ company_id: "comp-1" }),
    } as any;
    await logFeatureAccess("user-9", "export_pdf", false, "pro", c);
    expect(mocks.from).toHaveBeenCalledWith("feature_access_logs");
    const logged = mocks.insert.mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(logged).toMatchObject({
      user_id: "user-9",
      feature: "export_pdf",
      granted: false,
    });
  });
});
