import { supabase } from "./supabase.js";
import { sendWelcomeEmail } from "./email.js";

type AuthUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
};

// Memastikan auth user memiliki profil di tabel users.
// Jika belum ada: buat company -> users (role owner) -> company_members,
// persis meniru alur register. Dipakai oleh login Google (exchange-token)
// dan login email/password untuk auto-heal akun tanpa profil.
export async function ensureUserProfile(authUser: AuthUserLike) {
  const email = authUser.email ?? "";

  const { data: existing, error: lookupError } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`lookup_profile: ${lookupError.message}`);
  }
  if (existing) {
    return { user: existing, created: false };
  }

  const name =
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    email.split("@")[0] ||
    "User";

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({ name: `Perusahaan ${name}`, currency: "IDR" })
    .select()
    .single();

  if (companyError) {
    throw new Error(`create_company: ${companyError.message}`);
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .insert({
      id: authUser.id,
      company_id: company.id,
      email,
      name,
      role: "owner",
    })
    .select()
    .single();

  if (userError) {
    throw new Error(`create_user_profile: ${userError.message}`);
  }

  await supabase.from("company_members").insert({
    user_id: user.id,
    company_id: company.id,
    role: "owner",
  });

  sendWelcomeEmail(user.email, user.name).catch(console.error);

  return { user, created: true };
}
