-- Migration: Notifikasi backend-driven
-- Wajib dijalankan manual di Supabase SQL editor (dashboard) sebelum deploy
-- fitur notifikasi. Menggantikan sistem notifikasi localStorage di frontend.
--
-- Catatan keamanan:
--   - RLS diaktifkan TANPA policy untuk anon/authenticated → klien tidak
--     bisa membaca notifikasi user lain lewat Supabase JS langsung.
--   - Seluruh akses lewat backend yang memakai service_role (bypass RLS)
--     dan selalu memfilter berdasarkan user_id dari JWT terverifikasi.

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN (
    'journal_posted', 'journal_created', 'journal_deleted',
    'period_opened', 'period_closed', 'account_toggled',
    'profile_updated', 'member_invited', 'payment_success', 'payment_failed'
  )),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  link       TEXT,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Query utama: daftar notifikasi terbaru per user + hitung unread.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id) WHERE read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

GRANT ALL PRIVILEGES ON TABLE public.notifications TO service_role;
