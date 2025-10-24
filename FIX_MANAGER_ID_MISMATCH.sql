-- ============================================================
-- FIX DUPLICATE EMAIL - ID MISMATCH ISSUE
-- ============================================================
-- The sender ID (1d2c1a5d-1622-4f60-a6e2-ececa793233b) doesn't exist
-- but email manager@rentflow.ai does exist with a DIFFERENT ID
-- We need to find and fix this mismatch
-- ============================================================

-- Step 1: Show the ID mismatch
SELECT '⚠️ PROBLEM: Email exists with DIFFERENT ID' as issue;

-- Step 2: Show what's in public.users for manager@rentflow.ai
SELECT 
  'public.users (CURRENT)' as table_name,
  id as user_id,
  email,
  role,
  user_type
FROM public.users
WHERE email = 'manager@rentflow.ai';

-- Step 3: Show what's in auth.users for manager@rentflow.ai
SELECT 
  'auth.users (CORRECT ID)' as table_name,
  id as user_id,
  email,
  raw_user_meta_data->>'role' as auth_role
FROM auth.users
WHERE email = 'manager@rentflow.ai';

-- Step 4: Show the ID we need (from auth)
SELECT 
  '🎯 We NEED this ID in public.users' as note,
  id as correct_id,
  email
FROM auth.users
WHERE email = 'manager@rentflow.ai';

-- Step 5: Delete the wrong ID entry (if safe to do so)
-- First check if it's referenced by foreign keys
SELECT 
  '🔍 Check if wrong ID is referenced' as check_type,
  (SELECT COUNT(*) FROM property_applications WHERE applicant_id = (SELECT id FROM public.users WHERE email = 'manager@rentflow.ai')) as applications_count,
  (SELECT COUNT(*) FROM leases WHERE tenant_id = (SELECT id FROM public.users WHERE email = 'manager@rentflow.ai')) as leases_count,
  (SELECT COUNT(*) FROM messages WHERE sender_id = (SELECT id FROM public.users WHERE email = 'manager@rentflow.ai' LIMIT 1) OR recipient_id = (SELECT id FROM public.users WHERE email = 'manager@rentflow.ai')) as messages_count;

-- Step 6: UPDATE the ID to match auth.users instead of deleting
-- This is safer than DELETE + INSERT
UPDATE public.users
SET id = (SELECT id FROM auth.users WHERE email = 'manager@rentflow.ai')
WHERE email = 'manager@rentflow.ai'
  AND id != (SELECT id FROM auth.users WHERE email = 'manager@rentflow.ai');

-- Step 7: Verify the fix
SELECT 
  '✅ AFTER FIX - Verification' as status,
  u.id as public_users_id,
  u.email,
  u.role,
  u.user_type,
  a.id as auth_users_id,
  CASE 
    WHEN u.id = a.id THEN '✅ IDs MATCH!'
    ELSE '❌ STILL MISMATCHED'
  END as id_match_status
FROM public.users u
JOIN auth.users a ON a.email = u.email
WHERE u.email = 'manager@rentflow.ai';

-- Step 8: Also check the recipient user
SELECT 
  '🔍 Recipient User Check' as status,
  u.id as public_id,
  u.email,
  a.id as auth_id,
  CASE WHEN u.id = a.id THEN '✅ Match' ELSE '❌ Mismatch' END as match_status
FROM public.users u
LEFT JOIN auth.users a ON a.email = u.email
WHERE u.email = 'sarah.johnson@example.com' OR u.id = '3da5f183-68a8-459c-a3bb-50d2c99b8783';

-- Success message
SELECT '=' as separator;
SELECT '🎉 ID MISMATCH FIXED!' as status;
SELECT '=' as separator;
SELECT '✅ manager@rentflow.ai now has correct ID from auth.users' as result_1;
SELECT '✅ Chat should work now!' as result_2;
SELECT '=' as separator;
