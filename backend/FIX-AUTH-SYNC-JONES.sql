-- ============================================================
-- COMPREHENSIVE FIX: Auth Trigger + Manual Sync for jones@test.com
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- Step 1: Manually insert missing user (jones@test.com)
INSERT INTO public.users (
  id, email, full_name, role, user_type, wallet_address, is_active, created_at, updated_at
)
SELECT 
  a.id,
  a.email,
  COALESCE((a.raw_user_meta_data->>'full_name')::TEXT, a.email),
  COALESCE((a.raw_user_meta_data->>'role')::TEXT, 'manager'),
  COALESCE((a.raw_user_meta_data->>'role')::TEXT, 'manager'),
  NULL,
  TRUE,
  a.created_at,
  NOW()
FROM auth.users a
WHERE a.email = 'jones@test.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.email = 'jones@test.com'
  );

-- Step 2: Verify jones@test.com was inserted
SELECT 
  '✅ jones@test.com manually inserted' AS status,
  id,
  email,
  role,
  user_type,
  created_at
FROM public.users
WHERE email = 'jones@test.com';

-- Step 3: Update CHECK constraints to allow all role values
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_user_type_check;

ALTER TABLE public.users
ADD CONSTRAINT users_user_type_check 
CHECK (user_type IN ('property_manager', 'manager', 'tenant', 'prospective_tenant', 'ai_agent'));

ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check 
CHECK (role IN ('property_manager', 'manager', 'tenant', 'prospective_tenant', 'ai_agent', 'admin'));

-- Step 4: Fix the trigger function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER 
SECURITY DEFINER -- Run as function owner (bypasses RLS)
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Extract role from metadata, default to 'prospective_tenant'
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::TEXT,
    'prospective_tenant'
  );
  
  -- Normalize role values to match CHECK constraint
  user_role := CASE user_role
    WHEN 'property_manager' THEN 'manager'
    WHEN 'manager' THEN 'manager'
    WHEN 'prospective_tenant' THEN 'prospective_tenant'
    WHEN 'tenant' THEN 'tenant'
    WHEN 'ai_agent' THEN 'ai_agent'
    WHEN 'admin' THEN 'admin'
    ELSE 'prospective_tenant'
  END;

  -- Insert into public.users table (SECURITY DEFINER bypasses RLS)
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
    COALESCE((NEW.raw_user_meta_data->>'full_name')::TEXT, NEW.email),
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
    -- Log error but don't fail auth signup
    RAISE WARNING '[AUTH TRIGGER ERROR] User: %, Error: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 5: Ensure RLS policies allow service_role full access
DROP POLICY IF EXISTS "Service role has full access" ON public.users;
CREATE POLICY "Service role has full access"
ON public.users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 6: Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.on_auth_user_created();

-- Step 7: Final verification
SELECT '✅ Trigger fixed with SECURITY DEFINER!' AS status;

-- Step 8: Show all users to confirm
SELECT 
  '📊 All users in public.users:' AS info,
  email,
  role,
  user_type,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;
