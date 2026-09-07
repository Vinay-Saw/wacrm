-- Migration 044: Auth context RPC
-- Returns the caller's profile + account context in a single call.
-- Used by both the client-side AuthProvider and server-side getCurrentAccount().

CREATE OR REPLACE FUNCTION public.get_auth_context()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'profile', json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'email', p.email,
      'avatar_url', p.avatar_url,
      'role', p.role,
      'beta_features', COALESCE(p.beta_features, ARRAY[]::text[]),
      'account_id', p.account_id,
      'account_role', p.account_role
    ),
    'account', CASE WHEN a.id IS NOT NULL THEN json_build_object(
      'id', a.id,
      'name', a.name,
      'default_currency', COALESCE(a.default_currency, 'INR'),
      'is_active', COALESCE(a.is_active, true),
      'till_date', a.till_date,
      'logo_url', a.logo_url,
      'phone', a.phone,
      'email', a.email,
      'website', a.website,
      'address', COALESCE(a.address, '{}'::jsonb),
      'tax_id', a.tax_id,
      'tax_enabled', COALESCE(a.tax_enabled, true),
      'document_settings', COALESCE(a.document_settings, '{}'::jsonb)
    ) ELSE NULL END
  ) INTO v_result
  FROM profiles p
  LEFT JOIN accounts a ON a.id = p.account_id
  WHERE p.user_id = v_user_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_context() TO authenticated;
