import { supabase } from "./supabase.js";

interface ParsedDataUrl {
  buffer: Buffer;
  ext: string;
  mime: string;
}

function parseDataUrl(dataUrl: string): ParsedDataUrl {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
  if (!match) throw new Error("Format dataUrl tidak valid");
  const mime = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const ext = (mime.split("/")[1] || "png").replace("jpeg", "jpg");
  return { buffer, ext, mime };
}

// Upload file base64 ke Supabase Storage, return public URL
export async function uploadBase64(
  bucket: string,
  folder: string,
  dataUrl: string,
): Promise<string> {
  const { buffer, ext, mime } = parseDataUrl(dataUrl);
  const path = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: mime,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}