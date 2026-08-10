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

function fmtError(err: any): string {
  return err?.message
    ? `${err.message}${err?.details ? ` (details: ${err.details})` : ""}${err?.hint ? ` (hint: ${err.hint})` : ""}`
    : String(err);
}

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
    throw new Error(`lookup_profile: ${fmtError(lookupError)}`);
  }
  if (existing) {
    return { user: existing, created: false };
  }

  const name =
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    email.split("@")[0] ||
    "User";

  // Reuse company dengan nama sama bila sudah ada (hindari company orphan
  // saat provision diulang karena retry/fail-follows).
  let company: { id: string } | null = null;
  {
    const { data: existingCompany, error: companyLookupError } = await supabase
      .from("companies")
      .select("id")
      .eq("name", `Perusahaan ${name}`)
      .maybeSingle();
    if (companyLookupError) {
      throw new Error(`lookup_company: ${fmtError(companyLookupError)}`);
    }
    if (existingCompany) company = existingCompany;
  }

  if (!company) {
    const { data: inserted, error: companyError } = await supabase
      .from("companies")
      .insert({ name: `Perusahaan ${name}`, currency: "IDR" })
      .select("id")
      .single();
    if (companyError) {
      throw new Error(`create_company: ${fmtError(companyError)}`);
    }
    company = inserted;
  }

  // Trigger AFTER INSERT di users ikut membuat baris di tabel subscriptions
  // (user_id UNIQUE). Akun lama yang pernah diprovision sebelumnya sudah punya
  // baris subscription sisa -> insert users gagal "subscriptions_user_id_key".
  // Buang sisa itu dulu; trigger akan membuat baris fresh untuk profil ini.
  {
    const { data: staleSub, error: subLookupError } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", authUser.id)
      .maybeSingle();
    if (subLookupError) {
      throw new Error(`lookup_subscription: ${fmtError(subLookupError)}`);
    }
    if (staleSub) {
      const { error: subDeleteError } = await supabase
        .from("subscriptions")
        .delete()
        .eq("id", staleSub.id);
      if (subDeleteError) {
        throw new Error(`delete_stale_subscription: ${fmtError(subDeleteError)}`);
      }
      console.log(
        `ensureUserProfile: menghapus subscription stale ${staleSub.id} untuk user ${authUser.id} sebelum provision`,
      );
    }
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .insert({
      id: authUser.id,
      company_id: company.id,
      email,
      name,
      role: "owner",
      email_verified: true,
    })
    .select()
    .single();

  if (userError) {
    throw new Error(`create_user_profile: ${fmtError(userError)}`);
  }

  const { error: memberError } = await supabase.from("company_members").insert({
    user_id: user.id,
    company_id: company.id,
    role: "owner",
  });

  if (memberError) {
    // Kompensasi: batalkan profil & company agar tidak jadi sampah,
    // lalu bawa error ke pemanggil.
    await supabase.from("users").delete().eq("id", user.id);
    await supabase.from("companies").delete().eq("id", company.id);
    throw new Error(`create_company_member: ${fmtError(memberError)}`);
  }

  sendWelcomeEmail(user.email, user.name).catch(console.error);

  return { user, created: true };
}