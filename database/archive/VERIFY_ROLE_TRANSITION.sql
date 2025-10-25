-- ============================================================
-- VERIFY ROLE TRANSITION SYSTEM
-- ============================================================
-- This script checks:
-- 1. If the sync trigger is installed
-- 2. Current state of users with their roles
-- 3. Any prospective tenants who should have been transitioned
-- ============================================================

-- Check 1: Verify trigger exists
SELECT 
  '🔍 CHECKING TRIGGER STATUS' as step,
  '=' as separator;

SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Trigger INSTALLED'
    ELSE '❌ Trigger NOT FOUND'
  END as trigger_status,
  COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE trigger_name = 'sync_role_user_type_trigger'
  AND event_object_table = 'users';

SELECT '=' as separator;

-- Check 2: Show all users with their roles and lease status
SELECT 
  '📊 USER ROLES AND LEASE STATUS' as step,
  '=' as separator;

SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.user_type,
  CASE 
    WHEN u.role = u.user_type THEN '✅ Synced'
    ELSE '❌ MISMATCH'
  END as sync_status,
  COUNT(DISTINCT l.id) FILTER (WHERE l.lease_status = 'active') as active_leases,
  COUNT(DISTINCT l.id) FILTER (WHERE l.lease_status = 'fully_signed') as fully_signed_leases,
  MAX(l.activated_at) as last_lease_activation
FROM public.users u
LEFT JOIN public.leases l ON l.tenant_id = u.id
GROUP BY u.id, u.email, u.full_name, u.role, u.user_type
ORDER BY u.created_at DESC;

SELECT '=' as separator;

-- Check 3: Find prospective tenants with fully signed or active leases
SELECT 
  '🚨 PROSPECTIVE TENANTS WITH SIGNED LEASES (NEEDS TRANSITION)' as step,
  '=' as separator;

SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.user_type,
  l.id as lease_id,
  l.lease_status,
  l.tenant_signature_date,
  l.landlord_signature_date,
  l.activated_at,
  '⚠️ SHOULD BE TENANT' as action_needed
FROM public.users u
INNER JOIN public.leases l ON l.tenant_id = u.id
WHERE u.role = 'prospective_tenant'
  AND (l.lease_status = 'fully_signed' OR l.lease_status = 'active')
ORDER BY l.activated_at DESC NULLS LAST;

SELECT '=' as separator;

-- Check 4: Show recent lease signings
SELECT 
  '📋 RECENT LEASE SIGNINGS (Last 10)' as step,
  '=' as separator;

SELECT 
  l.id as lease_id,
  l.lease_status,
  l.status,
  u.email as tenant_email,
  u.role as tenant_role,
  u.user_type as tenant_user_type,
  l.tenant_signature_date,
  l.landlord_signature_date,
  l.activated_at,
  CASE 
    WHEN l.tenant_signature IS NOT NULL AND l.landlord_signature IS NOT NULL THEN '✅ Both Signed'
    WHEN l.tenant_signature IS NOT NULL THEN '✅ Tenant Signed'
    WHEN l.landlord_signature IS NOT NULL THEN '✅ Landlord Signed'
    ELSE '⏳ No Signatures'
  END as signature_status
FROM public.leases l
LEFT JOIN public.users u ON u.id = l.tenant_id
ORDER BY GREATEST(
  COALESCE(l.tenant_signature_date, '1970-01-01'::timestamp),
  COALESCE(l.landlord_signature_date, '1970-01-01'::timestamp)
) DESC
LIMIT 10;

SELECT '=' as separator;
SELECT '✅ VERIFICATION COMPLETE' as status;
