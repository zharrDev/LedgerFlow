import { SignJWT } from "jose";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/)
    .filter((l) => l && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const PROD = "https://ledgerflow-backend-02vs.onrender.com";

console.log("=== kirim OTP sungguhan dari prod (fallback API) ===");
try {
  const r = await fetch(`${PROD}/api/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "qwerty23mar2007@gmail.com", purpose: "register_verification" }),
    signal: AbortSignal.timeout(120000),
  });
  console.log("HTTP", r.status, (await r.text()).slice(0, 300));
} catch (e) {
  console.log("send-otp gagal:", e.message);
}

await new Promise((r2) => setTimeout(r2, 8000));

console.log("\n=== cek log SendCloud (emailStatus, 1 hari terakhir) ===");
try {
  const b = new URLSearchParams({
    apiUser: env.SMTP_USER, apiKey: env.SMTP_PASS, days: "1", limit: "20",
  });
  const r = await fetch(`https://api.aurorasendcloud.com/api/data/emailStatus?${b}`);
  const j = await r.json();
  let info = j?.info;
  if (typeof info === "string") info = JSON.parse(info);
  const list = info?.list ?? [];
  console.log("total:", info?.total, "| records:", list.length);
  for (const m of list) {
    console.log(
      (m.sendTime || m.createTime) , "|", m.to ?? m.addresses ?? "",
      "|", m.status, "|", (m.sendLog || m.deliverLog || "").slice(0, 70),
    );
  }
} catch (e) {
  console.log("emailStatus gagal:", e.message);
}