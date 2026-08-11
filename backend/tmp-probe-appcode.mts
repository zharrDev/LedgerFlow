process.env.SMTP_HOST = "smtp2.sendcloud.net";
process.env.SMTP_PORT = "587";
process.env.SMTP_SECURE = "false";
process.env.SMTP_USER = "zzxcvnnnnn_test_ZUfkAp";
process.env.SMTP_PASS = "59ac9d27b5f474811e59a43858ae1b72";
process.env.SMTP_FROM = "LedgerFlow <no-reply@izrs2s.send.aurorasendcloud.org>";

const { probeSmtp, sendOTPEmail } = await import("./src/lib/email.js");

const probe = await probeSmtp("qwerty23mar2007@gmail.com");
console.log("PROBE ->", JSON.stringify(probe, null, 1));

const otp = await sendOTPEmail("qwerty23mar2007@gmail.com", "LedgerFlow Test", "482913");
console.log("sendOTPEmail OK ->", otp?.messageId ?? JSON.stringify(otp));