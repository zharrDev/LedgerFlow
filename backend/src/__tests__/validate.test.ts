// Unit test middleware validateBody (middleware/validate.ts).
// Diuji lewat Hono app.request() tanpa server sungguhan.
import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";

const testSchema = z.object({
  email: z.email("Format email tidak valid."),
  lines: z
    .array(z.object({ code: z.string().min(1) }))
    .min(2, "Jurnal minimal memiliki 2 baris"),
});

function buildApp() {
  const app = new Hono();
  app.post(
    "/test",
    validateBody(testSchema),
    async (c) => c.json(c.get("validatedBody")),
  );
  return app;
}

describe("validateBody middleware", () => {
  it("meloloskan body valid & menyimpannya di validatedBody", async () => {
    const app = buildApp();
    const res = await app.request("/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "owner@ledgerflow.id",
        lines: [{ code: "1-1000" }, { code: "1-2000" }],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe("owner@ledgerflow.id");
    expect(body.lines).toHaveLength(2);
  });

  it("menolak body tidak valid dengan 400 + details.fieldErrors", async () => {
    const app = buildApp();
    const res = await app.request("/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "bukan-email",
        lines: [{ code: "1-1000" }], // kurang dari 2 baris
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Data tidak valid");
    expect(body.details.fieldErrors).toBeTruthy();
    expect(Array.isArray(body.details.fieldErrors.email)).toBe(true);
    expect(Array.isArray(body.details.fieldErrors.lines)).toBe(true);
  });

  it("menolak body bukan JSON dengan 400", async () => {
    const app = buildApp();
    const res = await app.request("/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bukan json",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Data tidak valid");
  });

  it("menolak body kosong (null) dengan 400", async () => {
    const app = buildApp();
    const res = await app.request("/test", { method: "POST" });
    expect(res.status).toBe(400);
  });
});
