import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/)
    .filter((l) => l && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const apiUser = env.SMTP_USER;
const apiKey = env.SMTP_PASS;
console.log("apiUser:", apiUser, "| apiKey:", apiKey ? "(ada)" : "(KOSONG)");

console.log("\n=== A. kirim API send (persis seperti fallback code) dari LOKAL ===");
try {
  const body = new URLSearchParams({
    apiUser,
    apiKey,
    from: "no-reply@izrs2s.send.aurorasendcloud.org",
    fromName: "LedgerFlow",
    to: "qwerty23mar2007@gmail.com",
    subject: "Uji SendCloud API - LedgerFlow",
    html: "<h3>Uji API</h3><p>dikirim via REST API aurorasendcloud</p>",
  });
  const r = await fetch("https://api.aurorasendcloud.com/api/mail/send", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(20000),
  });
  console.log("HTTP", r.status, (await r.text()).slice(0, 400));
} catch (e) {
  console.log("gagal:", e.message);
}

console.log("\n=== B. emailStatus raw (cek struktur info) ===");
try {
  const b = new URLSearchParams({ apiUser, apiKey, days: "2", limit: "20" });
  const r = await fetch(`https://api.aurorasendcloud.com/api/data/emailStatus?${b}`);
  const raw = await r.text();
  console.log("RAW:", raw.slice(0, 1200));
} catch (e) {
  console.log("gagal:", e.message);
}