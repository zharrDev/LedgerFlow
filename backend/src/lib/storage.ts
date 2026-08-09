import { supabase } from "./supabase.js";

interface ParsedDataUrl {
  buffer: Buffer;
  ext: string;
  mime: string;
}

// Allowlist MIME → ekstensi. Hanya gambar yang diizinkan (avatar & bukti bayar).
const ALLOWED_IMAGE_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Batas ukuran default 5 MB
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

function parseDataUrl(dataUrl: string): ParsedDataUrl {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
  if (!match) throw new Error("Format dataUrl tidak valid");
  const mime = match[1].toLowerCase().trim();
  const buffer = Buffer.from(match[2], "base64");
  const ext = ALLOWED_IMAGE_MIME[mime] || "";
  return { buffer, ext, mime };
}

// Buang karakter berbahaya dari segmen folder agar tidak bisa path traversal
// (mis. "../../other"). Hanya izinkan huruf, angka, dash, underscore per segmen.
function sanitizeFolder(folder: string): string {
  return folder
    .split("/")
    .map((seg) => seg.replace(/[^a-zA-Z0-9_-]/g, ""))
    .filter(Boolean)
    .join("/");
}

interface UploadOptions {
  // Jika true, timpa file dengan path sama. Default false (aman untuk bukti bayar).
  upsert?: boolean;
  maxBytes?: number;
}

// Upload gambar base64 ke Supabase Storage, return public URL.
export async function uploadBase64(
  bucket: string,
  folder: string,
  dataUrl: string,
  options: UploadOptions = {},
): Promise<string> {
  const { buffer, ext, mime } = parseDataUrl(dataUrl);

  // Validasi tipe file: hanya gambar dalam allowlist
  if (!ext) {
    throw new Error("Tipe file tidak didukung. Hanya gambar (PNG/JPG/WebP/GIF).");
  }

  // Validasi ukuran
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  if (buffer.length === 0) {
    throw new Error("File kosong.");
  }
  if (buffer.length > maxBytes) {
    throw new Error(
      `Ukuran file melebihi batas ${Math.round(maxBytes / 1024 / 1024)}MB.`,
    );
  }

  const safeFolder = sanitizeFolder(folder) || "misc";
  const filename = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}.${ext}`;
  const path = `${safeFolder}/${filename}`;

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: mime,
    upsert: options.upsert ?? false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
