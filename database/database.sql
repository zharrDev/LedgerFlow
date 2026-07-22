-- ============================================================================
-- LEDGERFLOW - SUBSCRIPTION & PAYMENT TABLES
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ─── 1. ENUM untuk Plan & Status ─────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'expired', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. PLANS TABLE (definisi pricing) ───────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,           -- 'free', 'pro', 'enterprise'
  display_name  TEXT NOT NULL,                  -- 'Free', 'Pro', 'Enterprise'
  price_monthly BIGINT NOT NULL DEFAULT 0,      -- dalam Rupiah (0 = gratis)
  price_yearly  BIGINT NOT NULL DEFAULT 0,      -- harga tahunan (diskon)
  max_companies INT NOT NULL DEFAULT 1,
  max_journals  INT DEFAULT NULL,               -- NULL = unlimited
  features      JSONB NOT NULL DEFAULT '[]',    -- list fitur
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Insert default plans
INSERT INTO plans (name, display_name, price_monthly, price_yearly, max_companies, max_journals, features) VALUES
  ('free', 'Free', 0, 0, 1, 50, '["Chart of Accounts", "Journal Entries (50/bulan)", "Dashboard", "Buku Besar"]'::jsonb),
  ('pro', 'Pro', 99000, 999000, 3, NULL, '["Semua fitur Free", "Unlimited Journal Entries", "Laporan Laba Rugi", "Neraca", "Arus Kas", "Export PDF", "3 Perusahaan", "Priority Support"]'::jsonb),
  ('enterprise', 'Enterprise', 299000, 2999000, -1, NULL, '["Semua fitur Pro", "Unlimited Perusahaan", "Multi-user & Roles", "API Access", "Export PDF & CSV", "Custom Reports", "Dedicated Support", "Audit Trail"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ─── 3. SUBSCRIPTIONS TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id        UUID REFERENCES companies(id) ON DELETE SET NULL,
  plan_id           UUID NOT NULL REFERENCES plans(id),
  status            subscription_status NOT NULL DEFAULT 'trialing',
  billing_cycle     TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  
  -- Trial period
  trial_start       TIMESTAMPTZ,
  trial_end         TIMESTAMPTZ,
  
  -- Subscription period
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  
  -- Midtrans specific
  midtrans_subscription_id TEXT,
  midtrans_saved_token_id  TEXT,
  
  -- Metadata
  canceled_at       TIMESTAMPTZ,
  cancel_reason     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)  -- 1 user = 1 active subscription
);

-- ─── 4. PAYMENTS TABLE (riwayat pembayaran) ─────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id   UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Midtrans transaction
  order_id          TEXT NOT NULL UNIQUE,        -- LF-{userId}-{timestamp}
  midtrans_transaction_id TEXT,
  
  -- Amount
  amount            BIGINT NOT NULL,             -- dalam Rupiah
  currency          TEXT NOT NULL DEFAULT 'IDR',
  
  -- Status
  status            payment_status NOT NULL DEFAULT 'pending',
  payment_type      TEXT,                        -- 'gopay', 'bank_transfer', 'credit_card', etc.
  
  -- Midtrans response data
  snap_token        TEXT,
  snap_redirect_url TEXT,
  midtrans_response JSONB,
  
  -- Timestamps
  paid_at           TIMESTAMPTZ,
  expired_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ─── 5. INDEXES ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);

-- ─── 6. RLS POLICIES ────────────────────────────────────────────────
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Plans: semua orang bisa lihat
CREATE POLICY "Plans viewable by everyone" ON plans
  FOR SELECT USING (true);

-- Subscriptions: user hanya lihat miliknya
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Payments: user hanya lihat miliknya
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── 7. AUTO-CREATE SUBSCRIPTION ON USER REGISTER ───────────────────
-- Trigger: saat user baru register, otomatis bikin subscription FREE trial 15 hari
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  SELECT id INTO free_plan_id FROM plans WHERE name = 'free' LIMIT 1;
  
  INSERT INTO subscriptions (user_id, plan_id, status, trial_start, trial_end, current_period_start, current_period_end)
  VALUES (
    NEW.id,
    free_plan_id,
    'trialing',
    now(),
    now() + interval '15 days',
    now(),
    now() + interval '15 days'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_user_created_subscription ON users;

CREATE TRIGGER on_user_created_subscription
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- ─── 8. HELPER FUNCTION: Check if user has active subscription ──────
CREATE OR REPLACE FUNCTION is_subscription_active(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sub RECORD;
BEGIN
  SELECT * INTO sub FROM subscriptions WHERE user_id = p_user_id LIMIT 1;
  
  IF NOT FOUND THEN RETURN false; END IF;
  
  -- Trialing and not expired
  IF sub.status = 'trialing' AND sub.trial_end > now() THEN
    RETURN true;
  END IF;
  
  -- Active subscription
  IF sub.status = 'active' AND sub.current_period_end > now() THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- Enable UUID
create extension if not exists "uuid-ossp";

-- Companies
create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text,
  currency text not null default 'IDR',
  created_at timestamptz default now()
);

-- Users
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null check (role in ('admin', 'akuntan', 'owner')),
  avatar_url text,
  created_at timestamptz default now()
);

-- Accounts (Chart of Accounts)
create table accounts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  code text not null,
  name text not null,
  type text not null check (type in ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
  normal_balance text not null check (normal_balance in ('DEBIT', 'CREDIT')),
  parent_id uuid references accounts(id),
  is_active boolean default true,
  unique(company_id, code)
);

select * from accounts;

-- Periods
create table periods (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_at timestamptz,
  unique(company_id, year, month)
);

-- Journal Entries
create table journal_entries (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  period_id uuid references periods(id),
  created_by uuid references users(id),
  entry_number text not null,
  entry_date date not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'posted')),
  created_at timestamptz default now(),
  unique(company_id, entry_number)
);

-- Journal Entry Lines
create table journal_entry_lines (
  id uuid primary key default uuid_generate_v4(),
  journal_entry_id uuid not null references journal_entries(id) on delete cascade,
  account_id uuid not null references accounts(id),
  debit numeric(18,2) not null default 0,
  credit numeric(18,2) not null default 0,
  memo text,
  check (debit >= 0 and credit >= 0),
  check (debit = 0 or credit = 0)
);

GRANT ALL PRIVILEGES
ON TABLE public.companies TO service_role;

GRANT ALL PRIVILEGES
ON TABLE public.users TO service_role;

GRANT ALL PRIVILEGES
ON TABLE public.accounts TO service_role;

GRANT ALL PRIVILEGES
ON TABLE public.periods TO service_role;

GRANT ALL PRIVILEGES
ON TABLE public.journal_entries TO service_role;

GRANT ALL PRIVILEGES
ON TABLE public.journal_entry_lines TO service_role;

GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.companies TO authenticated;
GRANT SELECT ON public.accounts TO authenticated;
GRANT SELECT ON public.periods TO authenticated;
GRANT SELECT ON public.journal_entries TO authenticated;
GRANT SELECT ON public.journal_entry_lines TO authenticated;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'accounts';

select *
from accounts
order by code;

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select for same company"
ON public.accounts
FOR SELECT
USING (
  company_id = (auth.jwt() ->> 'company_id')::uuid
);

CREATE POLICY "Allow insert for same company"
ON public.accounts
FOR INSERT
WITH CHECK (
  company_id = (auth.jwt() ->> 'company_id')::uuid
);

CREATE POLICY "Allow update for same company"
ON public.accounts
FOR UPDATE
USING (
  company_id = (auth.jwt() ->> 'company_id')::uuid
)
WITH CHECK (
  company_id = (auth.jwt() ->> 'company_id')::uuid
);

CREATE POLICY "Allow delete for same company"
ON public.accounts
FOR DELETE
USING (
  company_id = (auth.jwt() ->> 'company_id')::uuid
);

GRANT SELECT ON TABLE public.accounts TO authenticated;
GRANT INSERT ON TABLE public.accounts TO authenticated;
GRANT UPDATE ON TABLE public.accounts TO authenticated;
GRANT DELETE ON TABLE public.accounts TO authenticated;

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

select * from accounts
where id = '5b4d7135-7a90-4884-9a91-1a8b9559f5ae'
and company_id = '01692504-0d3f-4212-bd61-b2351150109a';

select code, name
from accounts
order by code;

create table journal_counters (
  company_id uuid,
  year_month text,
  last_number int default 0,
  primary key (company_id, year_month)
);

ALTER TABLE periods DISABLE ROW LEVEL SECURITY;

-- Jika ingin datanya bisa dibaca siapa saja yang punya anon key
CREATE POLICY "Allow select for all" ON "public"."periods"
AS PERMISSIVE FOR SELECT
TO anon
USING (true);

DROP POLICY "Allow select for all" ON periods;

-- ─── 9. PASSWORD RESETS TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  used       BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
