-- Migration: Admin Gate (dashboard admin khusus)
-- Wajib dijalankan manual di Supabase SQL editor sebelum deploy fitur gerbang
-- admin. Tabel ini dipakai untuk audit log SETIAP percobaan password pada
-- POST /api/admin-gate/verify (berhasil / gagal / diblokir rate-limit).
-- Catatan: endpoint tetap berfungsi walau tabel ini belum dibuat — audit log
-- akan jatuh ke log server (console) sampai migrasi dijalankan.

CREATE TABLE IF NOT EXISTS public.admin_gate_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip         TEXT NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('success', 'failed', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_gate_logs_created
  ON public.admin_gate_logs (created_at DESC);

GRANT ALL PRIVILEGES ON TABLE public.admin_gate_logs TO service_role;
