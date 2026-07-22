import "dotenv/config";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

import authRoutes from "./routes/auth.js";
import accountRoutes from "./routes/accounts.js";
import journalRoutes from "./routes/journal.js";
import ledgerRoutes from "./routes/ledger.js";
import periods from "./routes/periods.js";
import reports from "./routes/reports.js";
import users from "./routes/users.js";
import payments from "./routes/payments.js";
import companiesRoutes from "./routes/companies.js";

const app = new Hono();

// Global middleware
// Global middleware
app.use("*", logger());
app.use("*", prettyJSON());

app.use(
  "*",
  cors({
    origin: [
      process.env.FRONTEND_URL ?? "http://localhost:5173", 
      "https://ledger-flow-frontend-azure.vercel.app"
    ],
    allowHeaders: ["Content-Type", "Authorization", "x-user-id", "x-company-id"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  })
);

// Required for Google Sign-In popup/postMessage flow
app.use("*", async (c, next) => {
  await next();
  c.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
});

// Health check
app.get("/health", (c) => c.json({ status: "ok", app: "LedgerFlow API" }));

// Routes
app.route("/api/auth", authRoutes);
app.route("/api/accounts", accountRoutes);
app.route("/api/journal", journalRoutes);
app.route("/api/ledger", ledgerRoutes);
app.route("/api/periods", periods);
app.route("/api/reports", reports);
app.route("/api/users", users);
app.route("/api/companies", companiesRoutes);
app.route("/api/payments", payments);          // ← TAMBAH INI

// 404 fallback
app.notFound((c) => c.json({ error: "Route not found" }, 404));

// Error handler
app.onError((err, c) => {
  console.error("GLOBAL ERROR:", err);

  return c.json(
    {
      error: "Internal server error",
      message: err instanceof Error ? err.message : String(err),
    },
    500,
  );
});

const PORT = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`LedgerFlow API running on http://localhost:${PORT}`);
});

export default app;
