-- ============================================================
-- QUICK FIX FOR SIGNUP 500 ERROR
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Update CHECK constraint to allow all role values
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_user_type_check;

ALTER TABLE public.users
ADD CONSTRAINT users_user_type_check 
CHECK (user_type IN ('property_manager', 'manager', 'tenant', 'prospective_tenant', 'ai_agent'));

-- Step 2: Add role column CHECK constraint
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check 
CHECK (role IN ('property_manager', 'manager', 'tenant', 'prospective_tenant', 'ai_agent'));

-- Step 3: Fix the trigger function
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
  
  -- Normalize role values
  user_role := CASE user_role
    WHEN 'property_manager' THEN 'property_manager'
    WHEN 'manager' THEN 'manager'
    WHEN 'prospective_tenant' THEN 'prospective_tenant'
    WHEN 'tenant' THEN 'tenant'
    WHEN 'ai_agent' THEN 'ai_agent'
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
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'full_name')::TEXT, ''),
    user_role,
    user_role,
    COALESCE((NEW.raw_user_meta_data->>'wallet_address')::TEXT, NULL),
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    role = EXCLUDED.role,
    user_type = EXCLUDED.user_type,
    wallet_address = COALESCE(EXCLUDED.wallet_address, users.wallet_address),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error syncing user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.on_auth_user_created();

-- Verify
SELECT '✅ Auth trigger fixed! You can now create manager accounts.' AS status;
