-- Migration: Fix auth trigger to match user_type CHECK constraint
-- Date: 2025-10-26
-- Purpose: Align trigger role mapping with actual CHECK constraint values

-- First, update the CHECK constraint to include all valid role values
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_user_type_check;

ALTER TABLE public.users
ADD CONSTRAINT users_user_type_check 
CHECK (user_type IN ('property_manager', 'manager', 'tenant', 'prospective_tenant', 'ai_agent'));

-- Also add role column CHECK constraint if it doesn't exist
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check 
CHECK (role IN ('property_manager', 'manager', 'tenant', 'prospective_tenant', 'ai_agent'));

-- Update the trigger function to properly map roles
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
  
  -- Normalize role values (keep original values that are already valid)
  user_role := CASE user_role
    WHEN 'property_manager' THEN 'property_manager'
    WHEN 'manager' THEN 'manager'
    WHEN 'prospective_tenant' THEN 'prospective_tenant'
    WHEN 'tenant' THEN 'tenant'
    WHEN 'ai_agent' THEN 'ai_agent'
    ELSE 'prospective_tenant' -- Default fallback
  END;

  -- Insert into public.users table
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    user_type,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'full_name')::TEXT, ''),
    user_role,
    user_role, -- Keep user_type in sync with role
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    role = EXCLUDED.role,
    user_type = EXCLUDED.user_type,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth signup
    RAISE WARNING 'Error syncing user to public.users: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists with correct name
DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

CREATE TRIGGER on_auth_user_created_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.on_auth_user_created();

-- Verify
SELECT 'Auth trigger fixed!' AS status;
SELECT 'Users can now sign up as property_manager, manager, tenant, prospective_tenant, or ai_agent' AS roles_supported;
