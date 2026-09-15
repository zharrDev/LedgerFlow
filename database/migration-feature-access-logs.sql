-- Migration: Feature access & premium rate-limit logs (Week 2)
-- Wajib dijalankan manual di Supabase SQL editor sebelum wiring middleware
-- logging/rate-limit ke route live.
--
-- Catatan keamanan:
--   - RLS diaktifkan TANPA policy untuk anon/authenticated → klien tidak
--     bisa membaca log milik user lain lewat Supabase JS langsung.
--   - Seluruh akses lewat backend yang memakai service_role (bypass RLS)
--     dan selalu memfilter berdasarkan user_id dari JWT terverifikasi.
--   - Middleware logging bersifat best-effort: kegagalan tulis log tidak
--     boleh menggagalkan response utama.

-- ── feature_access_logs ───────────────────────────────────────────
-- Audit trail setiap pengecekan akses fitur premium di /check-access.
CREATE TABLE IF NOT EXISTS public.feature_access_logs (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id     UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  user_email     TEXT,
  feature        TEXT NOT NULL,
  plan_at_access TEXT NOT NULL,
  granted        BOOLEAN NOT NULL,
  ip_address     TEXT NOT NULL,
  user_agent     TEXT NOT NULL,
  request_path   TEXT NOT NULL,
  method         TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_access_logs_user_created
  ON public.feature_access_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_access_logs_feature_created
  ON public.feature_access_logs (feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_access_logs_created
  ON public.feature_access_logs (created_at DESC);

ALTER TABLE public.feature_access_logs ENABLE ROW LEVEL SECURITY;

GRANT ALL PRIVILEGES ON TABLE public.feature_access_logs TO service_role;

-- ── payment_feature_access_logs ───────────────────────────────────
-- Varian log yang sama untuk konteks pembayaran/premium bila dibutuhkan
-- terpisah dari log akses fitur umum.
CREATE TABLE IF NOT EXISTS public.payment_feature_access_logs (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id     UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  user_email     TEXT,
  feature        TEXT NOT NULL,
  plan_at_access TEXT NOT NULL,
  granted        BOOLEAN NOT NULL,
  ip_address     TEXT NOT NULL,
  user_agent     TEXT NOT NULL,
  request_path   TEXT NOT NULL,
  method         TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_feature_access_logs_user_created
  ON public.payment_feature_access_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_feature_access_logs_feature_created
  ON public.payment_feature_access_logs (feature, created_at DESC);

ALTER TABLE public.payment_feature_access_logs ENABLE ROW LEVEL SECURITY;

GRANT ALL PRIVILEGES ON TABLE public.payment_feature_access_logs TO service_role;

-- ── admin_access_logs ─────────────────────────────────────────────
-- Audit trail akses route admin.
CREATE TABLE IF NOT EXISTS public.admin_access_logs (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id     UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  user_email     TEXT,
  feature        TEXT NOT NULL,
  plan_at_access TEXT NOT NULL,
  granted        BOOLEAN NOT NULL,
  ip_address     TEXT NOT NULL,
  user_agent     TEXT NOT NULL,
  request_path   TEXT NOT NULL,
  method         TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_access_logs_user_created
  ON public.admin_access_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_access_logs_created
  ON public.admin_access_logs (created_at DESC);

ALTER TABLE public.admin_access_logs ENABLE ROW LEVEL SECURITY;

GRANT ALL PRIVILEGES ON TABLE public.admin_access_logs TO service_role;

-- ── rate_limit_logs ───────────────────────────────────────────────
-- Audit trail saat premium rate-limit memblokir request.
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL,
  ip_address   TEXT NOT NULL,
  user_agent   TEXT NOT NULL,
  request_path TEXT NOT NULL,
  method       TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  reset_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_user_created
  ON public.rate_limit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_created
  ON public.rate_limit_logs (created_at DESC);

ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

GRANT ALL PRIVILEGES ON TABLE public.rate_limit_logs TO service_role;
