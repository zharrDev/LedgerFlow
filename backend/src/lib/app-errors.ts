// Custom error classes — menggantikan manual throw new Error(...) di
// controller. Setiap kelas punya statusCode HTTP bawaan supaya error
// handler global bisa mengembalikan response yang konsisten tanpa bocor
// detail internal.

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
