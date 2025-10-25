-- Quick verification query to check if harmonization worked
-- Run this separately to verify the migration was successful

-- 1. Check if CHECK constraints allow 'manager'
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
  AND conname IN ('users_role_check', 'users_user_type_check')
ORDER BY conname;

-- 2. Check user_type values (should NOT have 'property_manager')
SELECT 
  user_type,
  COUNT(*) as count
FROM public.users
GROUP BY user_type
ORDER BY user_type;

-- 3. Check role values
SELECT 
  role,
  COUNT(*) as count
FROM public.users
GROUP BY role
ORDER BY role;

-- 4. Check for the two specific users we needed
SELECT 
  email,
  role,
  user_type,
  id
FROM public.users
WHERE email IN ('manager@rentflow.ai', 'sarah.johnson@example.com')
ORDER BY email;

-- 5. Final status
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.users WHERE user_type = 'property_manager') 
    THEN '❌ FAILED: Still has property_manager values'
    WHEN NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'manager@rentflow.ai')
    THEN '❌ FAILED: manager@rentflow.ai not found'
    WHEN NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'sarah.johnson@example.com')
    THEN '⚠️ WARNING: sarah.johnson@example.com not found (may be OK if not needed)'
    ELSE '✅ SUCCESS: Harmonization complete!'
  END as migration_status;
