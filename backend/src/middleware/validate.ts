// backend/src/middleware/validate.ts
// Middleware validasi body request berbasis zod — pola reusable untuk
// semua route. Zod hanya memvalidasi STRUKTUR & TIPE data; business rule
// tetap tanggung jawab handler (setelah middleware ini).

import { createMiddleware } from "hono/factory";
import type { ZodType } from "zod";

// Tambahkan typed variable 'validatedBody' ke context Hono agar bisa
// dipakai di route lain: c.get("validatedBody")
declare module "hono" {
  interface ContextVariableMap {
    validatedBody: unknown;
  }
}

/**
 * Middleware yang mem-parses & memvalidasi body JSON dengan schema zod.
 * - Body tidak ada / bukan JSON valid → 400 { error, details }
 * - Gagal schema (aturan bisnis: required/email/unique/min/max/enum/...) → 422
 * - Valid → simpan hasil parse di c.get("validatedBody") lalu lanjut
 *
 * Pemakaian:
 *   route.post("/", validateBody(mySchema), requireRole(...), handler)
 *   const body = c.get("validatedBody") as z.infer<typeof mySchema>;
 */
export function validateBody<T>(schema: ZodType<T>) {
  return createMiddleware(async (c, next) => {
    const body = await c.req.json().catch(() => null);
    if (body === null || typeof body !== "object") {
      return c.json(
        { error: "Body JSON tidak valid", details: null },
        400,
      );
    }
    const result = schema.safeParse(body);
    if (!result.success) {
      return c.json(
        { error: "Validasi gagal", details: result.error.flatten() },
        422,
      );
    }
    c.set("validatedBody", result.data);
    await next();
  });
}
