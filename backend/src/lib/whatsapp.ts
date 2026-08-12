// WhatsApp delivery via Fonnte (https://docs.fonnte.com/api-send-message/)
// Aturan: SEMUA kegagalan harus THROW (anti-silent-fail). Endpoint auth WA
// bergantung pada fakta bahwa OTP benar-benar terkirim sebelum row tersimpan.
const FONNTE_BASE = "https://api.fonnte.com/send";

export class FonnteError extends Error {}

// Normalisasi nomor HP Indonesia ke bentuk E.164 tanpa tanda "+":
//   "08123456789" | "+628123456789" | "628123456789" -> "628123456789"
// Nomor tidak valid / bukan format ID -> throw FonnteError.
export function normalizePhoneNumber(input: string): string {
  const raw = (input ?? "").replace(/[\s\-().]/g, "").trim();
  let num = raw.startsWith("+") ? raw.slice(1) : raw;
  if (num.startsWith("0")) num = `62${num.slice(1)}`;
  if (!/^62\d{8,13}$/.test(num)) {
    throw new FonnteError(
      "Nomor WhatsApp tidak valid. Gunakan format 08xxxxxxxxxx atau +628xxxxxxxxxx.",
    );
  }
  return num;
}

async function sendFonnte(params: URLSearchParams, timeoutMs = 15000): Promise<any> {
  const token = process.env.FONNTE_TOKEN;
  if (!token?.trim()) {
    throw new FonnteError(
      "FONNTE_TOKEN belum diset — pengiriman WhatsApp nonaktif. Set FONNTE_TOKEN di backend/.env.",
    );
  }

  let res: Response;
  try {
    res = await fetch(FONNTE_BASE, {
      method: "POST",
      headers: {
        Authorization: token.trim(), // Fonnte tidak butuh prefix "Bearer"
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err: any) {
    throw new FonnteError(
      `Tidak dapat terhubung ke Fonnte: ${err?.name === "TimeoutError" ? "waktu habis" : err?.message ?? String(err)}`,
    );
  }

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new FonnteError(`Fonnte HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  if (json?.status !== true) {
    throw new FonnteError(`Fonnte menolak pengiriman: ${text.slice(0, 300)}`);
  }
  return json;
}

const appBase = process.env.APP_NAME || "LedgerFlow";

export async function sendWhatsAppOTP(phone: string, code: string): Promise<void> {
  const message = [
    `*${appBase}* — Kode OTP Anda: ${code}`,
    "",
    "Kode berlaku 5 menit. Jangan bagikan kode ini ke siapa pun, termasuk yang mengaku dari kami.",
  ].join("\n");
  const params = new URLSearchParams({
    target: phone,
    message,
    countryCode: "62",
  });
  const json = await sendFonnte(params);
  console.log("[whatsapp] OTP terkirim ke", phone, "| id:", json?.id ?? "?");
}

export async function sendWhatsAppLoginAlert(
  phone: string,
  device: string,
  ip: string,
): Promise<void> {
  const message = [
    `*${appBase}* — Akun Anda baru saja masuk.`,
    "",
    `Perangkat: ${device}`,
    `IP: ${ip}`,
    "",
    "Bukan Anda? Segera hubungi dukungan dan lindungi akun Anda.",
  ].join("\n");
  const params = new URLSearchParams({
    target: phone,
    message,
    countryCode: "62",
  });
  const json = await sendFonnte(params);
  console.log("[whatsapp] alert login terkirim ke", phone, "| id:", json?.id ?? "?");
}
