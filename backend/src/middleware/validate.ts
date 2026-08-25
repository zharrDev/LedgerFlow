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
 * - Body tidak ada / bukan JSON valid / gagal schema → 400 dengan details
 * - Valid → simpan hasil parse di c.get("validatedBody") lalu lanjut
 *
 * Pemakaian:
 *   route.post("/", validateBody(mySchema), requireRole(...), handler)
 *   const body = c.get("validatedBody") as z.infer<typeof mySchema>;
 */
export function validateBody<T>(schema: ZodType<T>) {
  return createMiddleware(async (c, next) => {
    const body = await c.req.json().catch(() => null);
    const result = schema.safeParse(body);
    if (!result.success) {
      return c.json(
        { error: "Data tidak valid", details: result.error.flatten() },
        400,
      );
    }
    c.set("validatedBody", result.data);
    await next();
  });
}
