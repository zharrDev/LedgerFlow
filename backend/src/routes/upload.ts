import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.js";
import { uploadBase64 } from "../lib/storage.js";

const upload = new Hono();

upload.use("*", authMiddleware);

// POST /api/upload/avatar — { dataUrl } → upload ke bucket "avatars", return URL
upload.post("/avatar", async (c) => {
  try {
    const user = c.get("user");
    const { dataUrl } = await c.req.json();
    if (!dataUrl || typeof dataUrl !== "string") {
      return c.json({ error: "dataUrl wajib dikirim." }, 400);
    }

    const url = await uploadBase64("avatars", user.sub, dataUrl);

    // Simpan URL ke profil user
    await supabase.from("users").update({ avatar_url: url }).eq("id", user.sub);

    return c.json({ url });
  } catch (err) {
    console.error("UPLOAD AVATAR ERROR:", err);
    return c.json({ error: "Gagal mengupload avatar." }, 400);
  }
});

// POST /api/upload/proof — { dataUrl, order_id? } → bukti pembayaran
upload.post("/proof", async (c) => {
  try {
    const user = c.get("user");
    const { dataUrl, order_id } = await c.req.json();
    if (!dataUrl || typeof dataUrl !== "string") {
      return c.json({ error: "dataUrl wajib dikirim." }, 400);
    }

    const folder = order_id ? `orders/${order_id}` : `users/${user.sub}`;
    const url = await uploadBase64("payment-proofs", folder, dataUrl);

    return c.json({ url });
  } catch (err) {
    console.error("UPLOAD PROOF ERROR:", err);
    return c.json({ error: "Gagal mengupload bukti pembayaran." }, 400);
  }
});

export default upload;