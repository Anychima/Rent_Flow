-- ============================================================
-- FIX ALL ROLE/USER_TYPE MISMATCHES
-- ============================================================
-- This script ensures role and user_type are ALWAYS the same
-- and fixes all existing inconsistencies
-- ============================================================

-- Step 1: Show current mismatches BEFORE fix
SELECT 
  '❌ BEFORE FIX - Mismatches Found' as status,
  email,
  role,
  user_type,
  CASE 
    WHEN role != user_type THEN '⚠️ MISMATCH'
    ELSE '✅ OK'
  END as consistency
FROM public.users
WHERE role != user_type OR role IS NULL OR user_type IS NULL
ORDER BY email;

-- Step 2: Make user_type always match role (role is the source of truth)
UPDATE public.users
SET user_type = role
WHERE user_type != role OR user_type IS NULL;

-- Step 3: Handle any NULL roles (shouldn't happen but just in case)
UPDATE public.users
SET role = user_type
WHERE role IS NULL AND user_type IS NOT NULL;

-- Step 4: Handle completely NULL entries (use prospective_tenant as default)
UPDATE public.users
SET role = 'prospective_tenant', user_type = 'prospective_tenant'
WHERE role IS NULL AND user_type IS NULL;

-- Step 5: Verify all users now have matching role and user_type
SELECT 
  '✅ AFTER FIX - Verification' as status,
  role,
  user_type,
  COUNT(*) as count,
  STRING_AGG(email, ', ' ORDER BY email) as emails
FROM public.users
GROUP BY role, user_type
ORDER BY role, user_type;

-- Step 6: Check for any remaining mismatches (should be ZERO)
SELECT 
  '🔍 Final Mismatch Check' as status,
  COUNT(*) as mismatched_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ ALL GOOD - No mismatches!'
    ELSE '❌ STILL HAS ISSUES - Check above'
  END as result
FROM public.users
WHERE role != user_type OR role IS NULL OR user_type IS NULL;

-- Step 7: Show the manager user specifically
SELECT 
  '👤 Manager User Status' as status,
  email,
  role,
  user_type,
  is_active,
  CASE 
    WHEN role = 'manager' AND user_type = 'manager' THEN '✅ PERFECT'
    ELSE '❌ STILL WRONG'
  END as status_check
FROM public.users
WHERE email = 'manager@rentflow.ai';

-- Success message
SELECT '=' as separator;
SELECT '🎉 ROLE/USER_TYPE SYNCHRONIZATION COMPLETE!' as final_status;
SELECT '=' as separator;
SELECT '✅ All users now have matching role and user_type' as change_1;
SELECT '✅ manager@rentflow.ai should be role=manager, user_type=manager' as change_2;
SELECT '=' as separator;
