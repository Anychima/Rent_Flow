-- ============================================================
-- FIX CHAT FK ERRORS - AUTO-SYNC MISSING USERS
-- ============================================================
-- This script finds users in auth.users that are NOT in public.users
-- and inserts them to prevent FK constraint violations in chat
-- ============================================================

BEGIN;  -- Start transaction

-- Step 1: Show current mismatch
SELECT 
  '⚠️ BEFORE FIX - Auth users NOT in public.users' as status,
  a.id,
  a.email,
  COALESCE(a.raw_user_meta_data->>'role', 'prospective_tenant') as intended_role
FROM auth.users a
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = a.id
)
ORDER BY a.created_at;

-- Step 2: Insert all missing auth users into public.users
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  user_type,
  wallet_address,
  created_at,
  updated_at
)
SELECT 
  a.id,
  a.email,
  COALESCE(a.raw_user_meta_data->>'full_name', a.email) as full_name,
  -- Normalize role (property_manager → manager)
  CASE 
    WHEN COALESCE(a.raw_user_meta_data->>'role', 'prospective_tenant') = 'property_manager' THEN 'manager'
    ELSE COALESCE(a.raw_user_meta_data->>'role', 'prospective_tenant')
  END as role,
  -- user_type always matches role
  CASE 
    WHEN COALESCE(a.raw_user_meta_data->>'role', 'prospective_tenant') = 'property_manager' THEN 'manager'
    ELSE COALESCE(a.raw_user_meta_data->>'role', 'prospective_tenant')
  END as user_type,
  NULL as wallet_address,
  a.created_at,
  NOW() as updated_at
FROM auth.users a
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = a.id OR u.email = a.email
);

-- Step 3: Verify all auth users now exist in public.users
SELECT 
  '✅ AFTER FIX - Verification' as status,
  COUNT(DISTINCT a.id) as auth_users_count,
  COUNT(DISTINCT u.id) as public_users_count,
  CASE 
    WHEN COUNT(DISTINCT a.id) = COUNT(DISTINCT u.id) THEN '✅ ALL SYNCED!'
    ELSE '❌ STILL MISSING SOME'
  END as sync_status
FROM auth.users a
LEFT JOIN public.users u ON a.id = u.id;

-- Step 4: Show any auth users still missing (should be ZERO)
SELECT 
  '🔍 Still Missing' as status,
  a.id,
  a.email
FROM auth.users a
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = a.id
);

COMMIT;  -- Commit transaction

-- Step 5: Success message
SELECT '=' as separator, '=' as separator2, '=' as separator3;
SELECT '🎉 AUTH USER SYNC COMPLETE!' as status;
SELECT '=' as separator, '=' as separator2, '=' as separator3;
SELECT '✅ All auth.users now exist in public.users' as result_1;
SELECT '✅ Chat messages should work now (no more FK errors)' as result_2;
SELECT '=' as separator, '=' as separator2, '=' as separator3;
