-- Quick diagnostic: Check what role the manager user has
-- Run this in Supabase SQL Editor to verify the manager's role

SELECT 
  'Manager User Status' as check_type,
  id,
  email,
  role,
  user_type,
  is_active,
  CASE 
    WHEN role = 'manager' AND user_type = 'manager' THEN '✅ CORRECT - Both are "manager"'
    WHEN role = 'manager' AND user_type != 'manager' THEN '⚠️ MISMATCH - role is manager but user_type is ' || user_type
    WHEN role != 'manager' AND user_type = 'manager' THEN '⚠️ MISMATCH - user_type is manager but role is ' || role
    ELSE '❌ WRONG - Neither field is "manager"'
  END as status
FROM public.users
WHERE email = 'manager@rentflow.ai';

-- Also check all users to see the role distribution
SELECT 
  'All Users Role Distribution' as check_type,
  role,
  user_type,
  COUNT(*) as count,
  STRING_AGG(email, ', ') as emails
FROM public.users
GROUP BY role, user_type
ORDER BY role, user_type;
