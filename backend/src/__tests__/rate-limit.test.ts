// Unit test middleware rate limit (middleware/rate-limit.ts).
// Diuji lewat Hono app.request() tanpa server sungguhan.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Hono } from "hono";
import { rateLimit, strictOtpRateLimit, getClientIp } from "../middleware/rate-limit.js";

function buildApp(middleware: ReturnType<typeof rateLimit>) {
  const app = new Hono();
  app.use("*", middleware);
  app.get("/ping", (c) => c.json({ ok: true }));
  app.post("/otp", async (c) => {
    // Handler membaca body SETELAH limiter — membuktikan body tidak
    // ter-consume (Hono meng-cache parse JSON).
    const body = await c.req.json();
    return c.json({ got: body.phone });
  });
  app.options("/ping", (c) => c.json({ preflight: true }));
  return app;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit (tier NORMAL per IP)", () => {
  it("meloloskan request di bawah batas", async () => {
    const app = buildApp(rateLimit({ windowMs: 60_000, max: 3 }));
    const res = await app.request("/ping", {
      headers: { "x-forwarded-for": "1.1.1.1" },
    });
    expect(res.status).toBe(200);
  });

  it("menolak dengan 429 + header Retry-After saat melewati batas", async () => {
    const app = buildApp(rateLimit({ windowMs: 60_000, max: 2 }));
    const headers = { "x-forwarded-for": "2.2.2.2" };

    expect((await app.request("/ping", { headers })).status).toBe(200);
    expect((await app.request("/ping", { headers })).status).toBe(200);

    const blocked = await app.request("/ping", { headers });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    const body = (await blocked.json()) as { error?: string };
    expect(body.error).toMatch(/terlalu banyak permintaan/i);
  });

  it("IP berbeda punya kuota masing-masing", async () => {
    const app = buildApp(rateLimit({ windowMs: 60_000, max: 1 }));
    expect(
      (await app.request("/ping", { headers: { "x-forwarded-for": "3.3.3.3" } }))
        .status,
    ).toBe(200);
    expect(
      (await app.request("/ping", { headers: { "x-forwarded-for": "4.4.4.4" } }))
        .status,
    ).toBe(200);
  });

  it("kuota kembali setelah window berlalu", async () => {
    vi.useFakeTimers();
    const app = buildApp(rateLimit({ windowMs: 60_000, max: 1 }));
    const headers = { "x-forwarded-for": "5.5.5.5" };

    expect((await app.request("/ping", { headers })).status).toBe(200);
    expect((await app.request("/ping", { headers })).status).toBe(429);

    vi.advanceTimersByTime(61_000);
    expect((await app.request("/ping", { headers })).status).toBe(200);
  });

  it("preflight OPTIONS tidak memakan kuota", async () => {
    const app = buildApp(rateLimit({ windowMs: 60_000, max: 1 }));
    const headers = { "x-forwarded-for": "6.6.6.6" };

    expect((await app.request("/ping", { method: "OPTIONS", headers })).status).toBe(200);
    // Kuota masih utuh untuk GET pertama.
    expect((await app.request("/ping", { headers })).status).toBe(200);
    expect((await app.request("/ping", { headers })).status).toBe(429);
  });

  it("pesan error custom bisa di-set", async () => {
    const app = buildApp(
      rateLimit({ windowMs: 60_000, max: 0, message: "Kustom" }),
    );
    const res = await app.request("/ping");
    expect(((await res.json()) as { error: string }).error).toBe("Kustom");
  });
});

describe("strictOtpRateLimit (kunci IP + nomor telepon)", () => {
  it("menghitung per kombinasi IP+nomor dan tetap meneruskan body ke handler", async () => {
    // max tinggi supaya test fokus ke pemisahan kunci, bukan pemblokiran.
    const limiter = rateLimit({
      windowMs: 60_000,
      max: 100,
      keyGenerator: async (c) =>
        `${getClientIp(c)}:${String((await c.req.json().catch(() => ({})))?.phone ?? "").replace(/\D+/g, "")}`,
    });
    const app = new Hono();
    app.use("*", limiter);
    app.post("/otp", async (c) => c.json({ got: (await c.req.json()).phone }));

    const res = await app.request("/otp", {
      method: "POST",
      body: JSON.stringify({ phone: "+62 812-3456-7890" }),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "7.7.7.7",
      },
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { got: string }).got).toBe(
      "+62 812-3456-7890",
    );
  });

  it("STRICT: blokir per nomor saat melewati 5 request / 15 menit", async () => {
    const app = buildApp(strictOtpRateLimit());
    const makeReq = (ip: string, phone: string) =>
      app.request("/otp", {
        method: "POST",
        body: JSON.stringify({ phone }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": ip,
        },
      });

    // Nomor sama dari IP sama → diblokir di hit ke-6.
    for (let i = 0; i < 5; i++) {
      expect((await makeReq("8.8.8.8", "628111111111")).status).toBe(200);
    }
    const blocked = await makeReq("8.8.8.8", "628111111111");
    expect(blocked.status).toBe(429);

    // Nomor BERBEDA dari IP yang sama → masih diloloskan.
    expect((await makeReq("8.8.8.8", "628222222222")).status).toBe(200);
    // Nomor sama dari IP BERBEDA → masih diloloskan.
    expect((await makeReq("9.9.9.9", "628111111111")).status).toBe(200);
  });

  it("body rusak/tanpa phone tidak membuat middleware crash", async () => {
    const app = new Hono();
    app.use("*", strictOtpRateLimit());
    app.post("/otp", (c) => c.json({ ok: true }));

    const res = await app.request("/otp", {
      method: "POST",
      body: "bukan-json",
      headers: { "content-type": "text/plain", "x-forwarded-for": "10.10.10.10" },
    });
    expect(res.status).toBe(200);
  });
});
