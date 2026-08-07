import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./env.js";

loadEnv();

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("SUPABASE_URL dan SUPABASE_ANON_KEY wajib ada di .env");
}

export const authClient = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
