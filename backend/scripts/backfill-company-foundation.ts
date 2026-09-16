/**
 * Backfill fondasi company yang sudah terlanjur kosong (mis. company yang
 * dibuat sebelum provision otomatis ada).
 *
 * Jalankan: npm run backfill -- <company_id>
 * Contoh  : npm run backfill -- 11111111-2222-3333-4444-555555555555
 *
 * Idempoten: memakai upsert (onConflict company_id,code / company_id,year,
 * month) sehingga aman dijalankan berulang — data existing tidak tertimpa.
 */
import { loadEnv } from "../src/lib/env.js";
loadEnv();
import { supabase } from "../src/lib/supabase.js";
import { provisionCompanyFoundation } from "../src/lib/companyProvision.js";

const companyId = process.argv[2];

if (!companyId) {
  console.error("Pakai: npm run backfill -- <company_id>");
  process.exit(1);
}

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRe.test(companyId)) {
  console.error("company_id harus UUID yang valid.");
  process.exit(1);
}

const { data: company, error: companyError } = await supabase
  .from("companies")
  .select("id, name")
  .eq("id", companyId)
  .maybeSingle();

if (companyError || !company) {
  console.error("Company tidak ditemukan:", companyError?.message ?? companyId);
  process.exit(1);
}

console.log(`Backfill fondasi untuk "${company.name}" (${company.id})...`);
try {
  await provisionCompanyFoundation(company.id);
  console.log("Selesai: 26 akun standar + 12 periode tahun berjalan siap.");
} catch (err: any) {
  console.error("Gagal:", err?.message ?? err);
  process.exit(1);
}
