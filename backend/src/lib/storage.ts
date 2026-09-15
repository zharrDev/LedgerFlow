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

// Verifikasi magic bytes asli di buffer file (mencegah spoofing header dataUrl)
function verifyMagicBytes(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 4) return false;
  
  if (mime === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  
  if (mime === "image/jpeg" || mime === "image/jpg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  
  if (mime === "image/gif") {
    return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
  }
  
  if (mime === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer[0] === 0x52 && // R
      buffer[1] === 0x49 && // I
      buffer[2] === 0x46 && // F
      buffer[3] === 0x46 && // F
      buffer[8] === 0x57 && // W
      buffer[9] === 0x45 && // E
      buffer[10] === 0x42 && // B
      buffer[11] === 0x50   // P
    );
  }
  
  return false;
}

function parseDataUrl(dataUrl: string): ParsedDataUrl {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
  if (!match) throw new Error("Format dataUrl tidak valid");
  const mime = match[1].toLowerCase().trim();
  const buffer = Buffer.from(match[2], "base64");
  const ext = ALLOWED_IMAGE_MIME[mime] || "";
  
  if (ext && !verifyMagicBytes(buffer, mime)) {
    throw new Error("Isi file tidak sesuai dengan format gambar yang diklaim.");
  }
  
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
