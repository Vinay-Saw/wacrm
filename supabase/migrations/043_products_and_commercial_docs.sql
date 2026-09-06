-- Migration 043: Products catalog and Commercial Documents (Estimates, Sales Orders, Invoices)

-- 1. Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name                 TEXT NOT NULL,
  sku                  TEXT,
  description          TEXT,
  category             TEXT,
  unit                 TEXT NOT NULL DEFAULT 'Unit',
  unit_price           NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  tax_rate             NUMERIC(5,2) NOT NULL DEFAULT 18.00,
  hsn_sac              TEXT,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_account_id ON public.products(account_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);

-- 2. Commercial Documents Table (Estimates, Sales Orders, Invoices)
CREATE TABLE IF NOT EXISTS public.commercial_documents (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  document_type        TEXT NOT NULL CHECK (document_type IN ('estimate', 'sales_order', 'invoice')),
  document_number      TEXT NOT NULL,
  company_id           UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id           UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id              UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  parent_document_id   UUID REFERENCES public.commercial_documents(id) ON DELETE SET NULL,
  issue_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date             DATE,
  status               TEXT NOT NULL DEFAULT 'draft',
  currency             TEXT NOT NULL DEFAULT 'INR',
  subtotal             NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  tax_enabled          BOOLEAN NOT NULL DEFAULT true,
  cgst_amount          NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  sgst_amount          NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  igst_amount          NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  total_tax            NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  discount_amount      NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  total_amount         NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  amount_paid          NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  client_name          TEXT,
  client_email         TEXT,
  client_phone         TEXT,
  client_gstin         TEXT,
  billing_address      JSONB DEFAULT '{}'::jsonb,
  shipping_address     JSONB DEFAULT '{}'::jsonb,
  supply_state         TEXT,
  notes                TEXT,
  terms_conditions     TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_docs_account_id ON public.commercial_documents(account_id);
CREATE INDEX IF NOT EXISTS idx_comm_docs_type ON public.commercial_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_comm_docs_number ON public.commercial_documents(document_number);
CREATE INDEX IF NOT EXISTS idx_comm_docs_company_id ON public.commercial_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_comm_docs_contact_id ON public.commercial_documents(contact_id);
CREATE INDEX IF NOT EXISTS idx_comm_docs_deal_id ON public.commercial_documents(deal_id);

-- 3. Commercial Document Items Table
CREATE TABLE IF NOT EXISTS public.commercial_document_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id          UUID NOT NULL REFERENCES public.commercial_documents(id) ON DELETE CASCADE,
  product_id           UUID REFERENCES public.products(id) ON DELETE SET NULL,
  item_name            TEXT NOT NULL,
  description          TEXT,
  hsn_sac              TEXT,
  unit                 TEXT NOT NULL DEFAULT 'Unit',
  quantity             NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit_price           NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  discount_percent     NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  tax_rate             NUMERIC(5,2) NOT NULL DEFAULT 18.00,
  tax_amount           NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  total_amount         NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_doc_items_document_id ON public.commercial_document_items(document_id);

-- 4. Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_document_items ENABLE ROW LEVEL SECURITY;

-- Products RLS Policies
DROP POLICY IF EXISTS products_select ON public.products;
CREATE POLICY products_select ON public.products FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS products_insert ON public.products;
CREATE POLICY products_insert ON public.products FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS products_update ON public.products;
CREATE POLICY products_update ON public.products FOR UPDATE
  USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS products_delete ON public.products;
CREATE POLICY products_delete ON public.products FOR DELETE
  USING (is_account_member(account_id, 'admin'));

-- Commercial Documents RLS Policies
DROP POLICY IF EXISTS commercial_documents_select ON public.commercial_documents;
CREATE POLICY commercial_documents_select ON public.commercial_documents FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS commercial_documents_insert ON public.commercial_documents;
CREATE POLICY commercial_documents_insert ON public.commercial_documents FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));

-- Edit rules:
-- Admin can always edit.
-- Agent can edit as long as status is draft/sent/confirmed/in_progress (not issued invoice).
DROP POLICY IF EXISTS commercial_documents_update ON public.commercial_documents;
CREATE POLICY commercial_documents_update ON public.commercial_documents FOR UPDATE
  USING (
    is_account_member(account_id, 'admin')
    OR (
      is_account_member(account_id, 'agent')
      AND (
        document_type IN ('estimate', 'sales_order')
        OR status = 'draft'
      )
    )
  );

DROP POLICY IF EXISTS commercial_documents_delete ON public.commercial_documents;
CREATE POLICY commercial_documents_delete ON public.commercial_documents FOR DELETE
  USING (is_account_member(account_id, 'admin'));

-- Commercial Document Items RLS Policies (scoped via parent document)
DROP POLICY IF EXISTS comm_doc_items_select ON public.commercial_document_items;
CREATE POLICY comm_doc_items_select ON public.commercial_document_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.commercial_documents d
      WHERE d.id = commercial_document_items.document_id
        AND is_account_member(d.account_id)
    )
  );

DROP POLICY IF EXISTS comm_doc_items_insert ON public.commercial_document_items;
CREATE POLICY comm_doc_items_insert ON public.commercial_document_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.commercial_documents d
      WHERE d.id = commercial_document_items.document_id
        AND is_account_member(d.account_id, 'agent')
    )
  );

DROP POLICY IF EXISTS comm_doc_items_update ON public.commercial_document_items;
CREATE POLICY comm_doc_items_update ON public.commercial_document_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.commercial_documents d
      WHERE d.id = commercial_document_items.document_id
        AND (
          is_account_member(d.account_id, 'admin')
          OR (
            is_account_member(d.account_id, 'agent')
            AND (d.document_type IN ('estimate', 'sales_order') OR d.status = 'draft')
          )
        )
    )
  );

DROP POLICY IF EXISTS comm_doc_items_delete ON public.commercial_document_items;
CREATE POLICY comm_doc_items_delete ON public.commercial_document_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.commercial_documents d
      WHERE d.id = commercial_document_items.document_id
        AND (
          is_account_member(d.account_id, 'admin')
          OR (
            is_account_member(d.account_id, 'agent')
            AND (d.document_type IN ('estimate', 'sales_order') OR d.status = 'draft')
          )
        )
    )
  );

-- 5. Updated_at Triggers
DROP TRIGGER IF EXISTS update_products_modtime ON public.products;
CREATE TRIGGER update_products_modtime
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_commercial_documents_modtime ON public.commercial_documents;
CREATE TRIGGER update_commercial_documents_modtime
  BEFORE UPDATE ON public.commercial_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
