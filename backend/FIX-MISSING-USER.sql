-- ============================================================
-- FIX MISSING USER IN PUBLIC.USERS TABLE
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Manually insert the missing user (land@test.com)
-- This bypasses RLS by using a direct INSERT as admin
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
SELECT 
  a.id,
  a.email,
  COALESCE((a.raw_user_meta_data->>'full_name')::TEXT, a.email),
  COALESCE((a.raw_user_meta_data->>'role')::TEXT, 'property_manager'),
  COALESCE((a.raw_user_meta_data->>'role')::TEXT, 'property_manager'),
  NULL,
  TRUE,
  a.created_at,
  NOW()
FROM auth.users a
WHERE a.email = 'land@test.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.email = 'land@test.com'
  );

-- Step 2: Verify the user was inserted
SELECT 
  '✅ User Created' AS status,
  id,
  email,
  role,
  user_type,
  created_at
FROM public.users
WHERE email = 'land@test.com';

-- Step 3: Fix the trigger to use SECURITY DEFINER properly
-- This ensures it runs with admin privileges and bypasses RLS
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER 
SECURITY DEFINER -- Run as the function owner (admin)
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Extract role from metadata
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::TEXT,
    'prospective_tenant'
  );
  
  -- Normalize role values
  user_role := CASE user_role
    WHEN 'property_manager' THEN 'property_manager'
    WHEN 'manager' THEN 'property_manager'
    WHEN 'prospective_tenant' THEN 'prospective_tenant'
    WHEN 'tenant' THEN 'tenant'
    WHEN 'ai_agent' THEN 'ai_agent'
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
    -- Insert into error log table if it exists
    BEGIN
      INSERT INTO public.sync_errors (entity_type, entity_id, error_message, created_at)
      VALUES ('auth_user_sync', NEW.id, SQLERRM, NOW());
    EXCEPTION WHEN OTHERS THEN
      -- If error log table doesn't exist, just ignore
      NULL;
    END;
    RETURN NEW;
END;
$$;

-- Step 4: Ensure RLS is properly configured for the users table
-- Allow authenticated users to read their own data
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow service_role to do everything (for triggers and backend)
DROP POLICY IF EXISTS "Service role has full access" ON public.users;
CREATE POLICY "Service role has full access"
ON public.users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 5: Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.on_auth_user_created();

-- Step 6: Create error logging table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.sync_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Final verification
SELECT '✅ Trigger fixed with SECURITY DEFINER!' AS status;
SELECT '✅ RLS policies updated!' AS rls_status;
SELECT '✅ Error logging enabled!' AS logging_status;

-- Show the created user
SELECT 
  '👤 Created User:' AS info,
  email,
  role,
  user_type,
  created_at
FROM public.users
WHERE email = 'land@test.com';
