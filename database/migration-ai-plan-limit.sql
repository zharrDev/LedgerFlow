-- ============================================================================
-- MIGRASI: LIMIT AI CFO PER PLAN (max_ai_chats)
-- Jalankan manual di Supabase SQL Editor (blok semua → Run). Idempoten.
-- ============================================================================
-- Konteks hak akses AI per plan:
--   Plan Free       : AI TERKUNCI (fitur 'ai_cfo' tidak ada di features)
--   Plan Pro        : AI bisa dipakai dengan LIMIT bulanan (max_ai_chats)
--   Plan Enterprise : AI TANPA BATAS (max_ai_chats = NULL)
--
-- Kolom baru: plans.max_ai_chats INT NULL
--   NULL atau <= 0  → tanpa batas (konvensi sama dengan max_companies)
--   > 0             → batas pesan AI per user per bulan kalender
--
-- Hitungan pemakaian dicatat di tabel ai_usage_logs (1 baris per chat sukses):
--   COUNT(*) bulan berjalan per user = pemakaian bulan ini.
-- ============================================================================

-- ─── 1. Kolom limit AI di plans ─────────────────────────────────────────────
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS max_ai_chats INT DEFAULT NULL;

-- ─── 2. Seed nilai per plan ─────────────────────────────────────────────────
-- Free    : AI terkunci — limit 0 (fitur juga tidak ada di features)
-- Pro     : limit 30 pesan/bulan (sesuaikan kebijakan produk bila perlu)
-- Enterprise : NULL = tanpa batas
UPDATE public.plans SET max_ai_chats = 0    WHERE name = 'free';
UPDATE public.plans SET max_ai_chats = 30   WHERE name = 'pro';
UPDATE public.plans SET max_ai_chats = NULL WHERE name = 'enterprise';

-- ─── 3. Tabel pencatat pemakaian AI ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hitungan kuota selalu filter user + rentang tanggal → index komposit.
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created
  ON public.ai_usage_logs (user_id, created_at);

-- Backend memakai service role (bypass RLS); client anon/user tidak boleh
-- membaca atau menulis log pemakaian langsung.
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
GRANT ALL PRIVILEGES ON TABLE public.ai_usage_logs TO service_role;

-- ─── VERIFIKASI SETELAH MIGRASI (jalankan manual di SQL Editor) ────────────
--   SELECT name, max_ai_chats FROM plans ORDER BY price_monthly;
--   → free: 0, pro: 30, enterprise: NULL
--   SELECT to_regclass('public.ai_usage_logs');  → public.ai_usage_logs
