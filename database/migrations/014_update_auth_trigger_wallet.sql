-- Migration: Update auth trigger to handle wallet_address from metadata
-- Date: 2025-10-24
-- Purpose: Ensure wallet_address is stored from signup

-- Update the trigger function to handle wallet_address from auth metadata
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Extract role from metadata, default to 'prospective_tenant'
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::TEXT,
    'prospective_tenant'
  );
  
  -- Normalize role to match CHECK constraint
  user_role := CASE user_role
    WHEN 'property_manager' THEN 'manager'
    WHEN 'prospective_tenant' THEN 'prospective_tenant'
    WHEN 'tenant' THEN 'tenant'
    WHEN 'manager' THEN 'manager'
    ELSE 'prospective_tenant'
  END;

  -- Insert into public.users table
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    user_type,
    wallet_address,
    is_active,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'full_name')::TEXT, ''),
    user_role,
    user_role, -- Keep user_type in sync with role
    COALESCE((NEW.raw_user_meta_data->>'wallet_address')::TEXT, NULL),
    TRUE,
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = COALESCE((NEW.raw_user_meta_data->>'full_name')::TEXT, users.full_name),
    role = user_role,
    user_type = user_role,
    wallet_address = COALESCE((NEW.raw_user_meta_data->>'wallet_address')::TEXT, users.wallet_address),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists (recreate if needed)
DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
CREATE TRIGGER on_auth_user_created_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.on_auth_user_created();

COMMENT ON FUNCTION public.on_auth_user_created() IS 'Automatically syncs auth.users to public.users with wallet_address support';
