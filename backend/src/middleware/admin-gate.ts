import { createMiddleware } from "hono/factory";
import { verifyAdminGateToken } from "../lib/adminGateJwt.js";

// Middleware khusus gerbang admin. TERPISAH dari authMiddleware/requireRole:
//   - HANYA menerima JWT dengan type "admin-gate"
//   - Menolak token user biasa (authMiddleware) — token mereka tidak punya
//     type "admin-gate"
// Dipakai untuk melindungi endpoint-endpoint dashboard admin.
export const requireAdminGate = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    await verifyAdminGateToken(authHeader.slice(7));
    await next();
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }
});
