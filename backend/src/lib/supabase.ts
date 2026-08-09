import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./env.js";

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Pastikan env wajib tersedia sebelum client dibuat
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
}

// Client Supabase utama untuk semua route backend
export const supabase = createClient(supabaseUrl, supabaseKey);
