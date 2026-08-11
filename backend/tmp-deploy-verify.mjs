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

const secret = new TextEncoder().encode(env.JWT_SECRET);
const token = await new SignJWT({
  sub: "6117d434-96cf-4166-9f69-c0b09d4a85f8",
  email: "qwerty23mar2007@gmail.com",
  role: "owner",
  company_id: "8daa5e18-b01c-466f-993a-cf6e05a7bdaf",
})
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1d")
  .sign(secret);

const PROD = "https://ledgerflow-backend-02vs.onrender.com";

async function waitDeploy() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${PROD}/api/health/net-test?url=${encodeURIComponent("https://api.aurorasendcloud.com/")}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(20000),
      });
      if (r.status === 404 || r.status === 500) {
        console.log(`[${i}] deploy belum selesai (${r.status}), tunggu 15s...`);
      } else {
        console.log(`[${i}] ROUTE HIDUP HTTP ${r.status}:`, (await r.text()).slice(0, 400));
        return;
      }
    } catch (e) {
      console.log(`[${i}] error ${e.message}, tunggu 15s...`);
    }
    await new Promise((r2) => setTimeout(r2, 15000));
  }
  throw new Error("deploy tidak selesai dalam waktu yang tersedia");
}

await waitDeploy();

console.log("\n=== net-test ke SendCloud API (dari jaringan Render) ===");
try {
  const r = await fetch(`${PROD}/api/health/net-test?url=${encodeURIComponent("https://api.aurorasendcloud.com/api/mail/send")}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30000),
  });
  console.log("HTTP", r.status, (await r.text()).slice(0, 500));
} catch (e) {
  console.log("net-test gagal:", e.message);
}

console.log("\n=== kirim OTP sungguhan dari prod (fallback API) ===");
try {
  const r = await fetch(`${PROD}/api/otp/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "qwerty23mar2007@gmail.com", purpose: "register_verification" }),
    signal: AbortSignal.timeout(90000),
  });
  console.log("HTTP", r.status, (await r.text()).slice(0, 300));
} catch (e) {
  console.log("send-otp gagal:", e.message);
}

console.log("\n=== cek log SendCloud (emailStatus, hari terakhir) ===");
try {
  const b = new URLSearchParams({
    apiUser: env.SMTP_USER, apiKey: env.SMTP_PASS, days: "1", limit: "20",
  });
  const r = await fetch(`https://api.aurorasendcloud.com/api/data/emailStatus?${b}`);
  const j = await r.json();
  const list = j?.info?.list ?? [];
  console.log("total:", j?.info?.total);
  for (const m of list) {
    console.log(m.sendTime || m.createTime, "|", m.maillist ? "[list]" : (m.to ?? m.addresses ?? []), "|", m.status, "|", (m.sendLog || m.deliverLog || "").slice(0, 60), "| ip:", m.sendIp || m.ip || "");
  }
} catch (e) {
  console.log("emailStatus gagal:", e.message);
}