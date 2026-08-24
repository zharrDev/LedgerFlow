// Unit test pemetaan error -> pesan ramah user (lib/errorMessage.ts).
import { describe, it, expect } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import {
  getErrorMessage,
  errorToastTitle,
  SERVER_ERROR_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  UNEXPECTED_ERROR_MESSAGE,
} from "../lib/errorMessage";

// Helper: bikin AxiosError "asli" agar lolos instanceof check.
function axiosError(
  status?: number,
  data?: unknown,
): AxiosError {
  const response =
    status === undefined
      ? undefined
      : {
          data,
          status,
          statusText: String(status),
          headers: new AxiosHeaders(),
          config: {} as never,
        };
  return new AxiosError(
    "Request failed",
    status === undefined ? "ERR_NETWORK" : "ERR_BAD_REQUEST",
    {} as never,
    undefined,
    response as never,
  );
}

describe("getErrorMessage", () => {
  it("5xx -> pesan generik (detail teknis tidak bocor)", () => {
    expect(getErrorMessage(axiosError(500))).toBe(SERVER_ERROR_MESSAGE);
    expect(getErrorMessage(axiosError(503, { error: "db down" }))).toBe(
      SERVER_ERROR_MESSAGE,
    );
  });

  it("4xx -> pakai pesan dari backend", () => {
    expect(getErrorMessage(axiosError(400, { error: "Kode OTP salah." }))).toBe(
      "Kode OTP salah.",
    );
  });

  it("429 -> pesan rate limit dari backend diteruskan", () => {
    expect(
      getErrorMessage(axiosError(429, { error: "Terlalu banyak permintaan." })),
    ).toBe("Terlalu banyak permintaan.");
  });

  it("4xx tanpa pesan backend -> fallback permintaan gagal", () => {
    expect(getErrorMessage(axiosError(400, null))).toBe(
      "Permintaan gagal. Coba lagi.",
    );
  });

  it("network error (tanpa response) -> pesan koneksi", () => {
    expect(getErrorMessage(axiosError())).toBe(NETWORK_ERROR_MESSAGE);
  });

  it("Error biasa -> memakai message-nya", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("nilai tak dikenal -> pesan fallback", () => {
    expect(getErrorMessage(42)).toBe(UNEXPECTED_ERROR_MESSAGE);
    expect(getErrorMessage(undefined)).toBe(UNEXPECTED_ERROR_MESSAGE);
  });
});

describe("errorToastTitle", () => {
  it("tanpa response -> Koneksi Terputus", () => {
    expect(errorToastTitle(axiosError())).toBe("Koneksi Terputus");
  });

  it("429 -> Terlalu Sering", () => {
    expect(errorToastTitle(axiosError(429))).toBe("Terlalu Sering");
  });

  it("5xx -> Server Bermasalah", () => {
    expect(errorToastTitle(axiosError(500))).toBe("Server Bermasalah");
  });

  it("lainnya -> Gagal", () => {
    expect(errorToastTitle(axiosError(400))).toBe("Gagal");
    expect(errorToastTitle(new Error("x"))).toBe("Gagal");
  });
});
