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

const res = await fetch("https://ledgerflow-backend-02vs.onrender.com/api/health/smtp-test", {
  headers: { Authorization: `Bearer ${token}` },
});
const text = await res.text();
console.log("HTTP", res.status);
console.log(text.slice(0, 2000));