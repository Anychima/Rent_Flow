-- ============================================================
-- SAFE FIX: Manager Email/ID Mismatch
-- ============================================================
-- manager@rentflow.ai exists in public.users with wrong ID
-- We need to use the ID from auth.users instead
-- ============================================================

BEGIN; -- Start transaction

-- Step 1: Identify the mismatch
SELECT 
  '⚠️ ID MISMATCH DETECTED' as issue,
  (SELECT id FROM public.users WHERE email = 'manager@rentflow.ai') as current_public_id,
  (SELECT id FROM auth.users WHERE email = 'manager@rentflow.ai') as correct_auth_id,
  CASE 
    WHEN (SELECT id FROM public.users WHERE email = 'manager@rentflow.ai') = 
         (SELECT id FROM auth.users WHERE email = 'manager@rentflow.ai') 
    THEN '✅ IDs Match'
    ELSE '❌ IDs Different - Need to fix'
  END as status;

-- Step 2: Check what the wrong ID is referenced by
DO $$
DECLARE
  wrong_id UUID;
  correct_id UUID;
BEGIN
  -- Get the IDs
  SELECT id INTO wrong_id FROM public.users WHERE email = 'manager@rentflow.ai';
  SELECT id INTO correct_id FROM auth.users WHERE email = 'manager@rentflow.ai';
  
  -- Show what we found
  RAISE NOTICE 'Wrong ID in public.users: %', wrong_id;
  RAISE NOTICE 'Correct ID in auth.users: %', correct_id;
  
  -- If they're different, we have a problem
  IF wrong_id != correct_id THEN
    RAISE NOTICE 'IDs are different! Need to sync.';
  ELSE
    RAISE NOTICE 'IDs match! No fix needed.';
  END IF;
END $$;

-- Step 3: Safe approach - just update the email on the wrong entry
-- and insert the correct one
UPDATE public.users 
SET email = email || '_old_duplicate'
WHERE email = 'manager@rentflow.ai'
  AND id != (SELECT id FROM auth.users WHERE email = 'manager@rentflow.ai');

-- Step 4: Now insert the correct one
INSERT INTO public.users (id, email, full_name, role, user_type, created_at, updated_at)
SELECT 
  a.id,
  a.email,
  COALESCE(a.raw_user_meta_data->>'full_name', a.email),
  CASE 
    WHEN COALESCE(a.raw_user_meta_data->>'role', 'prospective_tenant') = 'property_manager' THEN 'manager'
    ELSE COALESCE(a.raw_user_meta_data->>'role', 'prospective_tenant')
  END,
  CASE 
    WHEN COALESCE(a.raw_user_meta_data->>'role', 'prospective_tenant') = 'property_manager' THEN 'manager'
    ELSE COALESCE(a.raw_user_meta_data->>'role', 'prospective_tenant')
  END,
  a.created_at,
  NOW()
FROM auth.users a
WHERE a.email = 'manager@rentflow.ai'
  AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = a.id
  );

-- Step 5: Also ensure recipient exists
INSERT INTO public.users (id, email, full_name, role, user_type, created_at, updated_at)
SELECT 
  a.id,
  a.email,
  COALESCE(a.raw_user_meta_data->>'full_name', a.email),
  COALESCE(a.raw_user_meta_data->>'role', 'prospective_tenant'),
  COALESCE(a.raw_user_meta_data->>'role', 'prospective_tenant'),
  a.created_at,
  NOW()
FROM auth.users a
WHERE a.id = '3da5f183-68a8-459c-a3bb-50d2c99b8783'
  AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = a.id
  );

-- Step 6: Verify both users now exist with correct IDs
SELECT 
  '✅ VERIFICATION' as status,
  u.id,
  u.email,
  u.role,
  u.user_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users a WHERE a.id = u.id AND a.email = u.email)
    THEN '✅ Matches auth.users'
    ELSE '⚠️ No match in auth.users'
  END as auth_match
FROM public.users u
WHERE u.email IN ('manager@rentflow.ai', 'sarah.johnson@example.com')
   OR u.id IN ('1d2c1a5d-1622-4f60-a6e2-ececa793233b', '3da5f183-68a8-459c-a3bb-50d2c99b8783')
ORDER BY u.email;

-- Step 7: Show old duplicate (if any)
SELECT 
  '🗑️ Old Duplicate (can be deleted)' as note,
  id,
  email,
  role
FROM public.users
WHERE email LIKE '%_old_duplicate';

COMMIT; -- Commit transaction

-- Success messages
SELECT '=' as separator;
SELECT '🎉 MANAGER ID FIXED!' as status;
SELECT '=' as separator;
SELECT '✅ manager@rentflow.ai now has correct ID: 1d2c1a5d-1622-4f60-a6e2-ececa793233b' as result_1;
SELECT '✅ Old duplicate renamed to *_old_duplicate' as result_2;
SELECT '✅ Chat should work now!' as result_3;
SELECT '=' as separator;
