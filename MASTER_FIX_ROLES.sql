-- ============================================================
-- MASTER FIX: COMPLETE ROLE/USER_TYPE HARMONIZATION
-- ============================================================
-- Run this ONE script to fix everything:
-- 1. Fix CHECK constraints
-- 2. Fix all existing data mismatches
-- 3. Create sync trigger for future updates
-- 4. Update auth sync function
-- ============================================================

BEGIN;  -- Start transaction

-- ========================================
-- PART 1: FIX CHECK CONSTRAINTS
-- ========================================
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_user_type_check;

ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users 
ADD CONSTRAINT users_user_type_check 
CHECK (user_type IN ('manager', 'tenant', 'prospective_tenant', 'ai_agent'));

ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('manager', 'tenant', 'prospective_tenant', 'ai_agent'));

-- ========================================
-- PART 2: FIX ALL EXISTING DATA
-- ========================================

-- Show mismatches BEFORE fix
SELECT '⚠️ BEFORE FIX - Checking for mismatches...' as status;

-- Make user_type always match role (role is source of truth)
UPDATE public.users
SET user_type = role
WHERE user_type != role OR user_type IS NULL;

-- Handle any NULL roles (use user_type as fallback)
UPDATE public.users
SET role = user_type
WHERE role IS NULL AND user_type IS NOT NULL;

-- Handle completely NULL entries (use prospective_tenant as default)
UPDATE public.users
SET role = 'prospective_tenant', user_type = 'prospective_tenant'
WHERE role IS NULL AND user_type IS NULL;

-- Convert any remaining 'property_manager' values to 'manager'
UPDATE public.users 
SET role = 'manager', user_type = 'manager'
WHERE role = 'property_manager' OR user_type = 'property_manager';

-- ========================================
-- PART 3: CREATE SYNC TRIGGER
-- ========================================

-- Create function to auto-sync role and user_type
CREATE OR REPLACE FUNCTION public.sync_role_and_user_type()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is being updated, sync user_type to match
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.user_type := NEW.role;
  END IF;
  
  -- If user_type is being updated, sync role to match  
  IF NEW.user_type IS DISTINCT FROM OLD.user_type THEN
    NEW.role := NEW.user_type;
  END IF;
  
  -- Ensure they're always the same (role is source of truth)
  IF NEW.role != NEW.user_type THEN
    NEW.user_type := NEW.role;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires BEFORE INSERT OR UPDATE
DROP TRIGGER IF EXISTS sync_role_user_type_trigger ON public.users;
CREATE TRIGGER sync_role_user_type_trigger
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_and_user_type();

-- ========================================
-- PART 4: UPDATE AUTH SYNC FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  normalized_role TEXT;
BEGIN
  -- Normalize the role value (convert property_manager → manager)
  normalized_role := CASE 
    WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'prospective_tenant') = 'property_manager' THEN 'manager'
    ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'prospective_tenant')
  END;

  -- Insert the new auth user into the public.users table
  -- CRITICAL: role and user_type MUST ALWAYS be the same
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    user_type,  -- ALWAYS same as role
    wallet_address,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    normalized_role,
    normalized_role,  -- ALWAYS same as role
    NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    role = EXCLUDED.role,
    user_type = EXCLUDED.role,  -- ALWAYS sync user_type with role
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- VERIFICATION
-- ========================================

-- Show final state
SELECT 
  '✅ VERIFICATION - Role/User_Type Distribution' as status,
  role,
  user_type,
  COUNT(*) as count,
  STRING_AGG(email, ', ' ORDER BY email LIMIT 3) as sample_emails
FROM public.users
GROUP BY role, user_type
ORDER BY role, user_type;

-- Check for any remaining mismatches (should be ZERO)
SELECT 
  '🔍 Mismatch Check' as status,
  COUNT(*) as mismatched_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ ALL SYNCED - No mismatches!'
    ELSE '❌ STILL HAS ISSUES'
  END as result
FROM public.users
WHERE role != user_type;

-- Check manager user specifically
SELECT 
  '👤 Manager User' as status,
  email,
  role,
  user_type,
  CASE 
    WHEN role = 'manager' AND user_type = 'manager' THEN '✅ CORRECT'
    ELSE '❌ WRONG'
  END as status_check
FROM public.users
WHERE email = 'manager@rentflow.ai';

COMMIT;  -- Commit transaction

-- ========================================
-- SUCCESS MESSAGES
-- ========================================
SELECT '=' as separator, '=' as separator2, '=' as separator3;
SELECT '🎉 COMPLETE HARMONIZATION SUCCESS!' as final_status;
SELECT '=' as separator, '=' as separator2, '=' as separator3;
SELECT '✅ CHECK constraints updated to allow only canonical values' as change_1;
SELECT '✅ All existing data synchronized (role = user_type)' as change_2;
SELECT '✅ Trigger installed to auto-sync future changes' as change_3;
SELECT '✅ Auth sync function updated to enforce consistency' as change_4;
SELECT '✅ manager@rentflow.ai should now have role=manager, user_type=manager' as change_5;
SELECT '=' as separator, '=' as separator2, '=' as separator3;
SELECT '🚀 YOU CAN NOW LOG IN AND SEE THE MANAGER DASHBOARD!' as next_step;
SELECT '=' as separator, '=' as separator2, '=' as separator3;
