-- ============================================================
-- 041_lead_forms.sql — Multi-tenant Lead Capture Forms & Webhooks
--
-- Enables accounts to create custom lead capture endpoints (forms)
-- that accept inbound website inquiry submissions (via HTML form POST
-- or AJAX fetch) and automatically create contacts, custom field values,
-- pipeline deals, and fire automations.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lead_forms (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name                 TEXT NOT NULL,
  form_key             TEXT NOT NULL UNIQUE,
  is_active            BOOLEAN NOT NULL DEFAULT true,

  -- Optional pipeline & deal mapping
  pipeline_id          UUID REFERENCES public.pipelines(id) ON DELETE SET NULL,
  stage_id             UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  default_deal_title   TEXT DEFAULT '{name} - Website Lead',
  default_deal_value   NUMERIC(12,2) DEFAULT 0,

  -- Tags & assignment
  tags                 TEXT[] NOT NULL DEFAULT '{}',
  assigned_agent_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Submission options
  success_redirect_url TEXT,
  allowed_origins      TEXT[] NOT NULL DEFAULT ARRAY['*'],

  -- Metrics
  submissions_count    INTEGER NOT NULL DEFAULT 0,
  last_submitted_at    TIMESTAMPTZ,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_forms_account ON public.lead_forms(account_id);
CREATE INDEX IF NOT EXISTS idx_lead_forms_key ON public.lead_forms(form_key);

ALTER TABLE public.lead_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_forms_select ON public.lead_forms;
CREATE POLICY lead_forms_select ON public.lead_forms FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS lead_forms_insert ON public.lead_forms;
CREATE POLICY lead_forms_insert ON public.lead_forms FOR INSERT
  WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS lead_forms_update ON public.lead_forms;
CREATE POLICY lead_forms_update ON public.lead_forms FOR UPDATE
  USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS lead_forms_delete ON public.lead_forms;
CREATE POLICY lead_forms_delete ON public.lead_forms FOR DELETE
  USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_lead_forms_updated_at ON public.lead_forms;
CREATE TRIGGER set_lead_forms_updated_at
  BEFORE UPDATE ON public.lead_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
