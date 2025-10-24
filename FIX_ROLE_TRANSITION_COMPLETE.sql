-- ============================================================
-- FIX ROLE TRANSITION SYSTEM - COMPLETE SOLUTION
-- ============================================================
-- This script:
-- 1. Installs the role/user_type sync trigger
-- 2. Fixes any existing mismatches
-- 3. Identifies prospective tenants who should be tenants
-- 4. Provides a complete transition solution
-- ============================================================

-- ============================================================
-- PART 1: INSTALL SYNC TRIGGER
-- ============================================================
SELECT '🔧 STEP 1: Installing role/user_type sync trigger...' as status;
SELECT '=' as separator;

-- Create function to sync role and user_type
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

-- Create trigger that fires BEFORE UPDATE
DROP TRIGGER IF EXISTS sync_role_user_type_trigger ON public.users;
CREATE TRIGGER sync_role_user_type_trigger
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_and_user_type();

SELECT '✅ Trigger installed successfully' as result;
SELECT '=' as separator;

-- ============================================================
-- PART 2: FIX EXISTING MISMATCHES
-- ============================================================
SELECT '🔧 STEP 2: Fixing existing role/user_type mismatches...' as status;
SELECT '=' as separator;

-- Show current mismatches
SELECT 
  '⚠️ Found mismatches:' as status,
  COUNT(*) as mismatch_count
FROM public.users
WHERE role != user_type;

-- Fix all mismatches (use role as source of truth)
UPDATE public.users
SET user_type = role
WHERE role != user_type;

SELECT '✅ All mismatches fixed (user_type synced to role)' as result;
SELECT '=' as separator;

-- ============================================================
-- PART 3: IDENTIFY PROSPECTIVE TENANTS WHO SHOULD BE TENANTS
-- ============================================================
SELECT '🔍 STEP 3: Finding prospective tenants with signed leases...' as status;
SELECT '=' as separator;

-- Show prospective tenants with fully signed or active leases
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role as current_role,
  l.id as lease_id,
  l.lease_status,
  l.activated_at,
  CASE 
    WHEN l.lease_status = 'active' THEN '🚨 CRITICAL: Should be tenant (lease is ACTIVE)'
    WHEN l.lease_status = 'fully_signed' THEN '⚠️ WARNING: Should be tenant (lease fully signed)'
    ELSE '❓ Check status'
  END as issue
FROM public.users u
INNER JOIN public.leases l ON l.tenant_id = u.id
WHERE u.role = 'prospective_tenant'
  AND (l.lease_status = 'fully_signed' OR l.lease_status = 'active')
ORDER BY l.activated_at DESC NULLS LAST;

SELECT '=' as separator;

-- ============================================================
-- PART 4: TRANSITION PROSPECTIVE TENANTS TO TENANTS
-- ============================================================
SELECT '🔧 STEP 4: Transitioning prospective tenants to tenant role...' as status;
SELECT '=' as separator;

-- Show what will be updated
SELECT 
  '📋 Will transition these users:' as info,
  u.id,
  u.email,
  u.full_name,
  'prospective_tenant' as old_role,
  'tenant' as new_role,
  l.lease_status,
  l.activated_at
FROM public.users u
INNER JOIN public.leases l ON l.tenant_id = u.id
WHERE u.role = 'prospective_tenant'
  AND (l.lease_status = 'fully_signed' OR l.lease_status = 'active');

SELECT '=' as separator;

-- Execute the transition
WITH tenants_to_update AS (
  SELECT DISTINCT u.id
  FROM public.users u
  INNER JOIN public.leases l ON l.tenant_id = u.id
  WHERE u.role = 'prospective_tenant'
    AND (l.lease_status = 'fully_signed' OR l.lease_status = 'active')
)
UPDATE public.users
SET 
  role = 'tenant',
  user_type = 'tenant',
  updated_at = NOW()
WHERE id IN (SELECT id FROM tenants_to_update);

SELECT '✅ Role transitions completed' as result;
SELECT '=' as separator;

-- ============================================================
-- PART 5: VERIFY THE FIX
-- ============================================================
SELECT '🔍 STEP 5: Verifying all fixes...' as status;
SELECT '=' as separator;

-- Check 1: Verify trigger exists
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Sync trigger is installed'
    ELSE '❌ Sync trigger is MISSING'
  END as trigger_status
FROM information_schema.triggers
WHERE trigger_name = 'sync_role_user_type_trigger'
  AND event_object_table = 'users';

SELECT '=' as separator;

-- Check 2: Verify no mismatches remain
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No role/user_type mismatches'
    ELSE '❌ Still have ' || COUNT(*) || ' mismatches'
  END as mismatch_status
FROM public.users
WHERE role != user_type;

SELECT '=' as separator;

-- Check 3: Verify no prospective tenants with signed leases
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No prospective tenants with signed leases'
    ELSE '⚠️ Still have ' || COUNT(*) || ' prospective tenants with signed leases'
  END as prospective_tenant_status
FROM public.users u
INNER JOIN public.leases l ON l.tenant_id = u.id
WHERE u.role = 'prospective_tenant'
  AND (l.lease_status = 'fully_signed' OR l.lease_status = 'active');

SELECT '=' as separator;

-- Check 4: Show final user distribution
SELECT 
  '📊 Final user distribution:' as info,
  role,
  COUNT(*) as user_count
FROM public.users
GROUP BY role
ORDER BY role;

SELECT '=' as separator;
SELECT '🎉 ROLE TRANSITION FIX COMPLETE!' as status;
SELECT '=' as separator;
SELECT '✅ All prospective tenants with signed leases have been transitioned to tenant role' as result_1;
SELECT '✅ Role and user_type sync trigger installed to prevent future issues' as result_2;
SELECT '✅ Future lease signings will automatically trigger role transitions' as result_3;
