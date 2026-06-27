import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Debug environment Supabase
console.log("SUPABASE URL:", process.env.SUPABASE_URL);
console.log("SERVICE ROLE EXISTS:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log(
  "KEY PREFIX:",
  process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20),
);

// Pastikan env wajib tersedia sebelum client dibuat
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
}

// Client Supabase utama untuk semua route backend
export const supabase = createClient(supabaseUrl, supabaseKey);
