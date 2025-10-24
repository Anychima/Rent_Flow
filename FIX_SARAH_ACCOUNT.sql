-- ============================================================
-- FIX SARAH JOHNSON'S ACCOUNT AND FORCE ROLE TRANSITION
-- ============================================================

-- Step 1: Show current status
SELECT '🔍 CURRENT STATUS' as step;
SELECT 
  email,
  role,
  user_type,
  (SELECT lease_status FROM leases WHERE tenant_id = users.id LIMIT 1) as lease_status
FROM public.users
WHERE email = 'sarah.johnson@example.com';

SELECT '=' as separator;

-- Step 2: Force update to tenant role
SELECT '🔧 FORCING ROLE TRANSITION' as step;

UPDATE public.users
SET 
  role = 'tenant',
  user_type = 'tenant',
  updated_at = NOW()
WHERE email = 'sarah.johnson@example.com'
  AND role = 'prospective_tenant';

SELECT '=' as separator;

-- Step 3: Verify the update
SELECT '✅ VERIFICATION' as step;

SELECT 
  email,
  role,
  user_type,
  updated_at,
  CASE 
    WHEN role = 'tenant' AND user_type = 'tenant' 
      THEN '✅ Successfully transitioned to tenant'
    ELSE '❌ Still not fixed'
  END as status
FROM public.users
WHERE email = 'sarah.johnson@example.com';

SELECT '=' as separator;

-- Step 4: Check lease activation
SELECT '📋 LEASE ACTIVATION' as step;

UPDATE public.leases
SET 
  lease_status = 'active',
  status = 'active',
  activated_at = COALESCE(activated_at, NOW())
WHERE tenant_id IN (SELECT id FROM users WHERE email = 'sarah.johnson@example.com')
  AND lease_status = 'fully_signed';

SELECT 
  l.id,
  l.lease_status,
  l.activated_at,
  u.email,
  u.role
FROM public.leases l
JOIN public.users u ON u.id = l.tenant_id
WHERE u.email = 'sarah.johnson@example.com';

SELECT '=' as separator;
SELECT '🎉 SARAH JOHNSON SHOULD NOW SEE TENANT DASHBOARD!' as result;
SELECT '📝 Next step: Sarah needs to LOGOUT and LOGIN again to refresh the session' as important_note;
