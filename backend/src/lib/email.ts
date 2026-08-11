import nodemailer from "nodemailer";
import dns from "node:dns";

// Beberapa host (mis. instans free Render) tidak punya rute IPv6; Node bisa
// memilih IPv6 lebih dulu (verbatim) lalu koneksi SMTP mati dengan ENETUNREACH.
// Pin socket ke alamat IPv4 secara eksplisit; hostname asli tetap dipakai
// sebagai SNI (tls.servername) supaya sertifikat Gmail tetap terverifikasi.
async function resolveSmtpHost(host: string): Promise<{ host: string; servername?: string }> {
  try {
    const addrs = await new Promise<string[]>((resolve, reject) => {
      dns.resolve4(host, (err, addresses) => (err ? reject(err) : resolve(addresses)));
    });
    if (addrs && addrs.length > 0) {
      return { host: addrs[0], servername: host };
    }
  } catch {
    // lookup gagal -> pakai hostname apa adanya
  }
  return { host };
}

let transporterPromise: Promise<ReturnType<typeof nodemailer.createTransport>> | null = null;

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const hostName = process.env.SMTP_HOST || "smtp.gmail.com";
      const port = Number(process.env.SMTP_PORT) || 587;
      const secure = process.env.SMTP_SECURE === "true";
      const { host, servername } = await resolveSmtpHost(hostName);
      return nodemailer.createTransport({
        host,
        port,
        secure,
        ...(servername ? { tls: { servername } } : {}),
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    })();
  }
  return transporterPromise;
}

function parseFrom(raw: string): { from: string; fromName?: string } {
  const m = raw.match(/^\s*"?(.+?)"?\s*<([^>]+)>\s*$/);
  if (m) return { from: m[2].trim(), fromName: m[1].trim() };
  return { from: raw.trim() };
}

// Transport cadangan via REST API SendCloud (HTTPS/443).
// Dipakai bila SMTP terblokir jaringan (mis. ETIMEDOUT dari Render ke
// smtp2.sendcloud.net). Menggunakan kredensial SendCloud yang sama.
//
// Catatan: API_USER berjenis "test" hanya boleh mengirim ke penerima yang
// terdaftar di dashboard SendCloud (error 40886: "Test API_USER ... manage
// your recipients"). Daftarkan penerima di dashboard; pakai API_USER formal
// bila ingin mengirim ke sembarang alamat.
async function sendViaSendCloudAPI(to: string, subject: string, html: string) {
  const apiUser = process.env.SMTP_USER;
  const apiKey = process.env.SMTP_PASS;
  const base = process.env.SENDCLOUD_API_BASE || "https://api.aurorasendcloud.com";
  if (!apiUser || !apiKey) {
    throw new Error("SendCloud API fallback tidak bisa dipakai (SMTP_USER/SMTP_PASS kosong)");
  }
  const parsed = parseFrom(process.env.SMTP_FROM || `LedgerFlow <${apiUser}>`);
  const body = new URLSearchParams({
    apiUser,
    apiKey,
    from: parsed.from,
    subject,
    to,
    html,
    ...(parsed.fromName ? { fromName: parsed.fromName } : {}),
  });
  const res = await fetch(`${base}/api/mail/send`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`SendCloud API HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  if (json?.result !== true) {
    throw new Error(`SendCloud API ditolak: ${text.slice(0, 300)}`);
  }
  const emailId = json?.info?.emailIdList?.[0] ?? json?.info?.emailId ?? "?";
  console.log("[email] SendCloud API terkirim ke", to, "| emailId:", emailId);
  return emailId as string;
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP not configured. Skipping email send to", to);
    return;
  }
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"LedgerFlow" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(
      "[email] sent to",
      to,
      "| subject:",
      subject,
      "| messageId:",
      info.messageId,
    );
  } catch (smtpErr: any) {
    // SMTP gagal (umumnya blokir jaringan di hosting) -> coba jalur API.
    try {
      await sendViaSendCloudAPI(to, subject, html);
    } catch (apiErr: any) {
      console.error(
        "[email] SMTP gagal:", smtpErr?.message,
        "| SendCloud API juga gagal:", apiErr?.message,
      );
      throw smtpErr;
    }
  }
}

export interface SmtpProbeResult {
  configured: boolean;
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  to?: string;
  status: "sent" | "auth_failed" | "send_error" | "not_configured";
  messageId?: string | null;
  accepted?: string[];
  rejected?: string[];
  response?: string;
  error?: string;
  errorCode?: string;
  errorResponse?: string;
}

// Probe SMTP end-to-end: verifikasi koneksi/auth lalu kirim email uji.
// Dipakai endpoint diagnostik untuk melihat hasil SMTP mentah (bukan hanya log).
export async function probeSmtp(to: string): Promise<SmtpProbeResult> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true";

  if (!user || !pass) {
    return { configured: false, status: "not_configured", host, port, secure };
  }

  const t = await getTransporter();

  // 1) Uji koneksi + autentikasi
  try {
    await t.verify();
  } catch (err: any) {
    return {
      configured: true,
      host,
      port,
      secure,
      user,
      to,
      status: "auth_failed",
      error: err?.message || String(err),
      errorCode: err?.code,
      errorResponse: err?.response,
    };
  }

  // 2) Kirim email uji
  const html = `
    <h3 style="color: #1f2937; margin: 0 0 8px;">Uji SMTP - LedgerFlow</h3>
    <p style="color: #6b7280; font-size: 14px;">Jika Anda menerima email ini, berarti konfigurasi SMTP benar-benar berfungsi.</p>
    <p style="color: #9ca3af; font-size: 12px;">${new Date().toISOString()} &middot; dikirim melalui endpoint diagnostik</p>
  `;

  try {
    const info = await t.sendMail({
      from: process.env.SMTP_FROM || `"LedgerFlow" <${user}>`,
      to,
      subject: `LedgerFlow SMTP Test - ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`,
      html,
    });
    return {
      configured: true,
      host,
      port,
      secure,
      user,
      to,
      status: "sent",
      messageId: info.messageId,
      accepted: (info.accepted ?? []).map((a) => String(a)),
      rejected: (info.rejected ?? []).map((a) => String(a)),
      response: info.response,
    };
  } catch (err: any) {
    return {
      configured: true,
      host,
      port,
      secure,
      user,
      to,
      status: "send_error",
      error: err?.message || String(err),
      errorCode: err?.code,
      errorResponse: err?.response,
    };
  }
}

function baseTemplate(content: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 40px 20px;">
      <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #1e3a5f; margin: 0;">LedgerFlow</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Financial Platform</p>
        </div>
        ${content}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">&copy; 2026 LedgerFlow. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

function infoRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding: 6px 12px; color: #6b7280; font-size: 13px; width: 90px;">${label}</td>
      <td style="padding: 6px 12px; color: #1f2937; font-size: 13px; font-weight: 600;">${value}</td>
    </tr>
  `;
}

function wibNow(): string {
  return new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  companyName?: string,
) {
  try {
    const html = baseTemplate(`
      <h3 style="color: #1f2937; margin: 0 0 8px;">Selamat Datang, ${name}! 👋</h3>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Akun LedgerFlow Anda berhasil dibuat${
        companyName ? ` untuk perusahaan <strong>${companyName}</strong>` : ""
      }. Anda sudah bisa mulai mencatat keuangan perusahaan Anda.</p>
      <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 12px; margin: 16px 0;">
        ${infoRow("Nama", name)}
        ${infoRow("Email", to)}
        ${companyName ? infoRow("Perusahaan", companyName) : ""}
      </table>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">Mulai Sekarang</a>
      </div>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">Butuh bantuan? Hubungi kami kapan saja.</p>
    `);
    await sendEmail(to, "Selamat Datang di LedgerFlow!", html);
  } catch (err) {
    console.error("sendWelcomeEmail error:", err);
  }
}

export interface LoginMeta {
  companyName?: string;
  device?: string;
  ip?: string;
}

export async function sendLoginNotification(
  to: string,
  name: string,
  meta: LoginMeta = {},
) {
  try {
    const html = baseTemplate(`
      <h3 style="color: #1f2937; margin: 0 0 8px;">Notifikasi Login</h3>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Halo <strong>${name}</strong>,</p>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Akun Anda telah login ke LedgerFlow pada:</p>
      <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; text-align: center; margin: 16px 0;">
        <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0;">${wibNow()} WIB</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 12px; margin: 12px 0;">
        ${meta.companyName ? infoRow("Perusahaan", meta.companyName) : ""}
        ${meta.device ? infoRow("Perangkat", meta.device) : ""}
        ${meta.ip ? infoRow("IP Address", meta.ip) : ""}
      </table>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">Jika bukan Anda yang melakukan login, segera ubah kata sandi dan hubungi tim dukungan kami.</p>
    `);
    await sendEmail(to, "Notifikasi Login - LedgerFlow", html);
  } catch (err) {
    console.error("sendLoginNotification error:", err);
  }
}

export async function sendMemberLoginNotification(
  to: string,
  ownerName: string,
  memberName: string,
  memberEmail: string,
  meta: LoginMeta = {},
) {
  try {
    const html = baseTemplate(`
      <h3 style="color: #1f2937; margin: 0 0 8px;">Aktivitas Login Member</h3>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Halo <strong>${ownerName}</strong>,</p>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Anggota tim Anda telah login ke LedgerFlow:</p>
      <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; text-align: center; margin: 16px 0;">
        <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0;">${memberName}</p>
        <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0;">${memberEmail}</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 12px; margin: 12px 0;">
        ${infoRow("Waktu", `${wibNow()} WIB`)}
        ${meta.companyName ? infoRow("Perusahaan", meta.companyName) : ""}
        ${meta.device ? infoRow("Perangkat", meta.device) : ""}
        ${meta.ip ? infoRow("IP Address", meta.ip) : ""}
      </table>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">Jika aktivitas ini tidak dikenali, segera hubungi anggota tim tersebut.</p>
    `);
    await sendEmail(to, "Aktivitas Login - LedgerFlow", html);
  } catch (err) {
    console.error("sendMemberLoginNotification error:", err);
  }
}

export async function sendAccountCreatedEmail(
  to: string,
  name: string,
  companyName: string,
  resetLink: string,
) {
  try {
    const html = baseTemplate(`
      <h3 style="color: #1f2937; margin: 0 0 8px;">Akun Anda Telah Dibuat 🎉</h3>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Halo <strong>${name}</strong>,</p>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Pemilik perusahaan <strong>${companyName}</strong> telah membuatkan akun LedgerFlow untuk Anda. Anda diundang sebagai anggota tim.</p>
      <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 12px; margin: 12px 0;">
        ${infoRow("Email", to)}
        ${infoRow("Perusahaan", companyName)}
      </table>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Klik tombol di bawah untuk membuat kata sandi sendiri:</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${resetLink}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">Atur Kata Sandi</a>
      </div>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">Link ini berlaku selama 1 jam. Setelah mengatur kata sandi, Anda bisa login dengan email di atas.</p>
    `);
    await sendEmail(to, "Akun LedgerFlow Anda - Atur Kata Sandi", html);
  } catch (err) {
    console.error("sendAccountCreatedEmail error:", err);
  }
}

export async function sendOTPEmail(to: string, name: string, otp: string, expiresMinutes = 15) {
  const html = baseTemplate(`
      <h3 style="color: #1f2937; margin: 0 0 8px;">Kode Verifikasi</h3>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Halo <strong>${name}</strong>,</p>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Gunakan kode berikut untuk memverifikasi akun Anda:</p>
      <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; letter-spacing: 8px;">
        <span style="font-size: 32px; font-weight: 700; color: #1e3a5f;">${otp}</span>
      </div>
      <p style="color: #ef4444; font-size: 13px; font-weight: 600; line-height: 1.5;">Kode ini berlaku selama ${expiresMinutes} menit sejak email ini diterima. Jangan bagikan kode ini kepada siapa pun.</p>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">Cek juga folder Spam jika email ini tidak terlihat di inbox. Jika Anda tidak meminta kode ini, abaikan email ini.</p>
    `);
  await sendEmail(to, "Kode Verifikasi - LedgerFlow", html);
}

export async function sendResetPasswordEmail(to: string, name: string, resetLink: string) {
  try {
    const html = baseTemplate(`
      <h3 style="color: #1f2937; margin: 0 0 8px;">Reset Password</h3>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Halo <strong>${name}</strong>,</p>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Kami menerima permintaan reset password untuk akun LedgerFlow Anda. Klik tombol di bawah untuk membuat password baru:</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${resetLink}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">Reset Password</a>
      </div>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">Link ini berlaku selama <strong>1 jam</strong>. Jika Anda tidak meminta reset password, abaikan email ini.</p>
    `);
    await sendEmail(to, "Reset Password - LedgerFlow", html);
  } catch (err) {
    console.error("sendResetPasswordEmail error:", err);
  }
}
