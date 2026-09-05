-- ============================================================
-- 040_account_activation_and_expiry.sql
--
-- Adds gatekeeping columns to accounts:
--   - is_active: boolean flag (default false for new signups)
--   - till_date: optional timestamp until which access is granted
--
-- Backfills all existing accounts to is_active = true so existing
-- accounts/owners are not locked out.
--
-- Updates handle_new_user() so new accounts default to is_active = false.
-- Adds protect_account_activation_columns() trigger to prevent
-- client-side tampering of is_active and till_date.
-- ============================================================

-- 1. Add columns to accounts table
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS till_date TIMESTAMPTZ;

-- 2. Backfill existing accounts as active
UPDATE public.accounts
SET is_active = true
WHERE is_active IS FALSE;

-- 3. Trigger to prevent authenticated users from tampering with is_active or till_date
CREATE OR REPLACE FUNCTION public.protect_account_activation_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Disallow regular authenticated users from elevating their account status
  IF auth.role() = 'authenticated' THEN
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Cannot modify is_active directly. Contact an administrator.';
    END IF;
    IF NEW.till_date IS DISTINCT FROM OLD.till_date THEN
      RAISE EXCEPTION 'Cannot modify till_date directly. Contact an administrator.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_account_activation_columns ON public.accounts;
CREATE TRIGGER tr_protect_account_activation_columns
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_account_activation_columns();

-- 4. Update handle_new_user() so new accounts default to is_active = false
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_account_id UUID;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  INSERT INTO public.accounts (name, owner_user_id, is_active, till_date)
  VALUES (COALESCE(NULLIF(v_full_name, ''), NEW.email, 'My account'), NEW.id, false, NULL)
  RETURNING id INTO v_account_id;

  INSERT INTO public.profiles (user_id, full_name, email, account_id, account_role)
  VALUES (NEW.id, v_full_name, NEW.email, v_account_id, 'owner');

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to bootstrap account/profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
