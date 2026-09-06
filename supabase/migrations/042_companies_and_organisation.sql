-- ============================================================
-- 042_companies_and_organisation.sql — B2B Companies & Organisation Setup
--
-- 1. Creates `companies` table for multi-contact B2B accounts.
-- 2. Links contacts to companies (company_id, job_title, department, is_primary).
-- 3. Links deals to companies (company_id).
-- 4. Extends `accounts` with organisation branding, GST tax settings,
--    and customizable document numbering templates.
-- ============================================================

-- 1. Create Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name                 TEXT NOT NULL,
  domain               TEXT,
  industry             TEXT,
  company_size         TEXT,
  phone                TEXT,
  email                TEXT,
  website              TEXT,
  billing_address      JSONB NOT NULL DEFAULT '{}'::jsonb,
  shipping_address     JSONB NOT NULL DEFAULT '{}'::jsonb,
  tax_number           TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_account ON public.companies(account_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies(name);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS companies_select ON public.companies;
CREATE POLICY companies_select ON public.companies FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS companies_insert ON public.companies;
CREATE POLICY companies_insert ON public.companies FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS companies_update ON public.companies;
CREATE POLICY companies_update ON public.companies FOR UPDATE
  USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS companies_delete ON public.companies;
CREATE POLICY companies_delete ON public.companies FOR DELETE
  USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_companies_updated_at ON public.companies;
CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. Link Contacts to Company
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS is_primary_company_contact BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON public.contacts(company_id);

-- 3. Link Deals to Company
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deals_company_id ON public.deals(company_id);

-- 4. Extend Accounts with Organisation Setup & Tax Settings
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS address JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS tax_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS document_settings JSONB NOT NULL DEFAULT '{
    "estimate_prefix": "EST",
    "estimate_next": 1,
    "order_prefix": "SO",
    "order_next": 1,
    "invoice_prefix": "INV",
    "invoice_next": 1,
    "state": "",
    "terms_conditions": "",
    "header_text": "",
    "footer_text": ""
  }'::jsonb;
