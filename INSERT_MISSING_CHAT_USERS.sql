-- Check if the specific sender user exists
-- This is the user trying to send the chat message

-- Step 1: Check in public.users
SELECT 
  'Sender in public.users?' as check_type,
  id,
  email,
  role,
  user_type,
  is_active
FROM public.users
WHERE id = '1d2c1a5d-1622-4f60-a6e2-ececa793233b';

-- Step 2: Check in auth.users
SELECT 
  'Sender in auth.users?' as check_type,
  id,
  email,
  raw_user_meta_data->>'role' as auth_role
FROM auth.users
WHERE id = '1d2c1a5d-1622-4f60-a6e2-ececa793233b';

-- Step 3: Check recipient too
SELECT 
  'Recipient in public.users?' as check_type,
  id,
  email,
  role,
  user_type
FROM public.users
WHERE id = '3da5f183-68a8-459c-a3bb-50d2c99b8783';

-- Step 4: If sender is in auth but not public, insert them
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
WHERE a.id = '1d2c1a5d-1622-4f60-a6e2-ececa793233b'
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = a.id);

-- Step 5: Verify insertion
SELECT 
  '✅ Verification After Insert' as status,
  id,
  email,
  role,
  user_type
FROM public.users
WHERE id IN ('1d2c1a5d-1622-4f60-a6e2-ececa793233b', '3da5f183-68a8-459c-a3bb-50d2c99b8783')
ORDER BY email;

-- Success message
SELECT CASE 
  WHEN EXISTS (SELECT 1 FROM public.users WHERE id = '1d2c1a5d-1622-4f60-a6e2-ececa793233b')
    AND EXISTS (SELECT 1 FROM public.users WHERE id = '3da5f183-68a8-459c-a3bb-50d2c99b8783')
  THEN '✅ Both users now exist - Chat should work!'
  ELSE '❌ Still missing users - Check results above'
END as final_status;
