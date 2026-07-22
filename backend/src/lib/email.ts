import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP not configured. Skipping email send to", to);
    return;
  }

  await transporter.sendMail({
    from: `"LedgerFlow" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

export function passwordResetEmail(name: string, resetLink: string): string {
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
        <h3 style="color: #1f2937; margin: 0 0 8px;">Reset Password</h3>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Halo <strong>${name}</strong>,</p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Kami menerima permintaan reset password untuk akun LedgerFlow Anda. Klik tombol di bawah untuk membuat password baru:</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetLink}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">Reset Password</a>
        </div>
        <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">Link ini berlaku selama <strong>1 jam</strong>. Jika Anda tidak meminta reset password, abaikan email ini.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">&copy; 2026 LedgerFlow. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

export function welcomeEmail(name: string, dashboardLink: string): string {
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
        <h3 style="color: #1f2937; margin: 0 0 8px;">Selamat Datang, ${name}! 👋</h3>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Akun LedgerFlow Anda berhasil dibuat. Anda sudah bisa mulai mencatat keuangan perusahaan Anda.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${dashboardLink}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">Mulai Sekarang</a>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">&copy; 2026 LedgerFlow. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}
