// Custom error classes — menggantikan manual throw new Error(...) di
// controller. Setiap kelas punya statusCode HTTP bawaan supaya error
// handler global bisa mengembalikan response yang konsisten tanpa bocor
// detail internal.
//
// Pemakaian:
//   throw new NotFoundError("Journal")
//   throw new ForbiddenError("Anda tidak memiliki izin")
//   throw new ValidationError("amount wajib positif")

import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** Base error class untuk semua error aplikasi */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 404 — Resource tidak ditemukan atau bukan milik company user */
export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} tidak ditemukan`, 404);
  }
}

/** 401 — Token tidak valid / tidak ada */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

/** 403 — Authenticated tapi tidak punya izin */
export class ForbiddenError extends AppError {
  constructor(message = "Akses ditolak") {
    super(message, 403);
  }
}

/** 400 — Validasi input gagal */
export class ValidationError extends AppError {
  constructor(message = "Data tidak valid") {
    super(message, 400);
  }
}

/** 409 — Konflik data (duplikat, dll) */
export class ConflictError extends AppError {
  constructor(message = "Data sudah ada") {
    super(message, 409);
  }
}

/** 429 — Rate limit terlampaui */
export class RateLimitError extends AppError {
  retryAfterSec: number;

  constructor(message = "Terlalu banyak permintaan", retryAfterSec = 60) {
    super(message, 429);
    this.retryAfterSec = retryAfterSec;
  }
}

/**
 * Tangani AppError dan kembalikan JSON response yang konsisten.
 * Dipanggil dari route handler via `catch (err) { return appError(c, err); }`
 * atau dari global error handler.
 */
export function appErrorResponse(c: Context, err: unknown) {
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      error: err.message,
    };

    if (err instanceof RateLimitError) {
      c.header("Retry-After", String(err.retryAfterSec));
    }

    // Di development, sertakan stack trace untuk debugging
    if (process.env.NODE_ENV !== "production") {
      body.stack = err.stack;
    }

    return c.json(body, err.statusCode as ContentfulStatusCode);
  }

  // Bukan AppError → 500 generic (jangan bocorkan detail)
  console.error("[unhandled] ", err);
  return c.json({ error: "Terjadi kesalahan server" }, 500);
}
