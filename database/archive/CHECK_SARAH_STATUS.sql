-- ============================================================
-- CHECK SARAH JOHNSON'S ACCOUNT STATUS
-- ============================================================

-- Check 1: User profile and role
SELECT 
  '👤 USER PROFILE' as section,
  '=' as separator;

SELECT 
  id,
  email,
  full_name,
  role,
  user_type,
  created_at,
  updated_at
FROM public.users
WHERE email = 'sarah.johnson@example.com';

SELECT '=' as separator;

-- Check 2: Lease status
SELECT 
  '📋 LEASE STATUS' as section,
  '=' as separator;

SELECT 
  l.id as lease_id,
  l.lease_status,
  l.status,
  l.tenant_signature,
  l.landlord_signature,
  l.tenant_signature_date,
  l.landlord_signature_date,
  l.activated_at,
  p.title as property_title
FROM public.leases l
LEFT JOIN public.properties p ON p.id = l.property_id
LEFT JOIN public.users u ON u.id = l.tenant_id
WHERE u.email = 'sarah.johnson@example.com';

SELECT '=' as separator;

-- Check 3: What should the status be?
SELECT 
  '🔍 DIAGNOSIS' as section,
  '=' as separator;

SELECT 
  u.email,
  u.role as current_role,
  u.user_type as current_user_type,
  l.lease_status,
  CASE 
    WHEN l.lease_status = 'active' AND u.role = 'prospective_tenant' 
      THEN '❌ PROBLEM: Has active lease but still prospective_tenant'
    WHEN l.lease_status = 'fully_signed' AND u.role = 'prospective_tenant'
      THEN '❌ PROBLEM: Has fully signed lease but still prospective_tenant'
    WHEN l.lease_status = 'active' AND u.role = 'tenant'
      THEN '✅ CORRECT: Has active lease and is tenant'
    ELSE '⚠️ CHECK: Status unclear'
  END as diagnosis,
  CASE 
    WHEN l.lease_status IN ('active', 'fully_signed') AND u.role = 'prospective_tenant'
      THEN 'UPDATE users SET role = ''tenant'', user_type = ''tenant'' WHERE email = ''sarah.johnson@example.com'';'
    ELSE NULL
  END as fix_sql
FROM public.users u
LEFT JOIN public.leases l ON l.tenant_id = u.id
WHERE u.email = 'sarah.johnson@example.com';
