import { loadEnv } from "./lib/env.js";
loadEnv();

// Render free tier tidak punya rute IPv6 → koneksi SMTP ke smtp.gmail.com
// memilih IPv6 dulu dan gagal (ENETUNREACH). Paksa resolusi DNS prefer IPv4.
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

import authRoutes from "./routes/auth.js";
import waAuthRoutes from "./routes/wa-auth.js";
import accountRoutes from "./routes/accounts.js";
import journalRoutes from "./routes/journal.js";
import ledgerRoutes from "./routes/ledger.js";
import periods from "./routes/periods.js";
import reports from "./routes/reports.js";
import users from "./routes/users.js";
import payments from "./routes/payments.js";
import companiesRoutes from "./routes/companies.js";
import passwordResetRoutes from "./routes/password-reset.js";

import userMgmtRoutes from "./routes/user-management.js";
import adminGateRoutes from "./routes/admin-gate.js";
import uploadRoutes from "./routes/upload.js";
import healthRoutes from "./routes/health.js";
import aiRoutes from "./routes/ai.js";
import notificationsRoutes from "./routes/notifications.js";
import { normalRateLimit, userRateLimit, passwordResetRateLimit } from "./middleware/rate-limit.js";
import { securityHeaders } from "./middleware/security-headers.js";

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use("*", prettyJSON());
app.use("*", securityHeaders());

// Izinkan origin dev mana pun di localhost (port bebas; vite bisa naik 5173->5174
// saat port sebelumnya terpakai) + FRONTEND_URL terkonfigurasi + prod Vercel.
const isAllowedOrigin = (origin: string): boolean => {
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (origin === "https://ledger-flow-frontend-azure.vercel.app") return true;
  const fe = process.env.FRONTEND_URL;
  return !!fe && origin === fe;
};

app.use(
  "*",
  cors({
    origin: (origin) => (origin && isAllowedOrigin(origin) ? origin : undefined),
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  })
);

// Required for Google Sign-In popup/postMessage flow
app.use("*", async (c, next) => {
  await next();
  c.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
});

// Rate limit: route anonim (auth/OTP) pakai NORMAL per-IP, route yang lain
// pakai USER per-user id (JWT sub) supaya pengguna sah tidak kena cap per-IP
// yang terlalu ketat. Endpoint OTP dapat batas lebih ketat di routes/wa-auth.ts
// (STRICT per IP+nomor — lihat middleware/rate-limit.ts).
app.use("/api/auth", normalRateLimit);
app.use("/api/wa", normalRateLimit);
app.use("/api/auth/forgot-password", passwordResetRateLimit);
app.use("/api/auth/reset-password", passwordResetRateLimit);
app.use("/api/*", userRateLimit);

// Health check
app.get("/health", (c) => c.json({ status: "ok", app: "LedgerFlow API" }));

// Routes
app.route("/api/auth", authRoutes);
app.route("/api/wa", waAuthRoutes);
app.route("/api/accounts", accountRoutes);
app.route("/api/journal", journalRoutes);
app.route("/api/ledger", ledgerRoutes);
app.route("/api/periods", periods);
app.route("/api/reports", reports);
app.route("/api/users", users);
app.route("/api/companies", companiesRoutes);
app.route("/api/payments", payments);
app.route("/api/auth", passwordResetRoutes);
app.route("/api/users-management", userMgmtRoutes);
app.route("/api/admin-gate", adminGateRoutes);
app.route("/api/upload", uploadRoutes);
app.route("/api/health", healthRoutes);
app.route("/api/ai", aiRoutes);
app.route("/api/notifications", notificationsRoutes);

// 404 fallback
app.notFound((c) => c.json({ error: "Route not found" }, 404));

// Error handler — jangan bocorkan detail internal ke client.
// AppError mengembalikan pesan + status yang sesuai; error lain → 500 generik.
import { AppError } from "./lib/app-errors.js";

app.onError((err, c) => {
  // Hono errors (mis. route mismatch) → 404 generik
  if (err.message === "404 Not Found") {
    return c.json({ error: "Route not found" }, 404);
  }

  if (err instanceof AppError) {
    const body: Record<string, unknown> = { error: err.message };
    if (process.env.NODE_ENV !== "production") {
      body.stack = err.stack;
    }
    return c.json(body, err.statusCode as any);
  }

  console.error("[GLOBAL ERROR]", err);
  return c.json({ error: "Internal server error" }, 500);
});

const PORT = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`LedgerFlow API running on http://localhost:${PORT}`);
});

export default app;
