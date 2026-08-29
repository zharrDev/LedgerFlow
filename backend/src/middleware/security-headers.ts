// Security headers middleware — Hono-compatible replacement for Express helmet.
// Adds standard security headers to every response. Customize per-environment.

import type { Context, Next } from "hono";

/**
 * Middleware keamanan header HTTP — memasang header pelindung di setiap
 * response. Tidak memerlukan dependensi eksternal; semua diatur lewat
 * Hono middleware murni.
 *
 * Pemasangan:
 *   app.use("*", securityHeaders());
 */
export function securityHeaders() {
  return async (c: Context, next: Next) => {
    await next();

    const isProduction = process.env.NODE_ENV === "production";

    // X-Content-Type-Options: mencegah MIME sniffing
    c.header("X-Content-Type-Options", "nosniff");

    // X-Frame-Options: mencegah clickjacking
    c.header("X-Frame-Options", "DENY");

    // X-XSS-Protection: legacy XSS filter (masih berguna untuk browser lama)
    c.header("X-XSS-Protection", "1; mode=block");

    // Referrer-Policy: kontrol informasi referer
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");

    // Permissions-Policy: nonaktifkan fitur browser yang tidak perlu
    c.header(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=()",
    );

    // Strict-Transport-Security: paksa HTTPS di production
    if (isProduction) {
      c.header(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload",
      );
    }

    // Content-Security-Policy: batasi sumber daya yang boleh dimuat.
    // Nilai CSP cukup longgar untuk development (inline styles/scripts);
    // production bisa diperketat via env FRONTEND_URL.
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com",
      `connect-src 'self' ${frontendUrl} https://api.openai.com https://*.supabase.co`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    c.header("Content-Security-Policy", cspDirectives);

    // Hapus header yang membocorkan informasi server
    c.header("X-Powered-By", "");
    c.header("Server", "");
  };
}
