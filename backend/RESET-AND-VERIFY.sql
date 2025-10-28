-- ============================================================
-- COMPLETE RESET SCRIPT FOR house@test.com
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Reset all payments to pending
UPDATE rent_payments 
SET 
  status = 'pending',
  transaction_hash = NULL,
  payment_date = NULL,
  on_chain = false,
  notes = 'Reset for testing'
WHERE tenant_id = (SELECT id FROM users WHERE email = 'house@test.com');

-- 2. Reset user role to prospective_tenant
UPDATE users 
SET 
  role = 'prospective_tenant',
  user_type = 'prospective_tenant'
WHERE email = 'house@test.com';

-- 3. Reset lease status
-- Note: lease_status can be 'fully_signed', but status column must be a valid enum value
UPDATE leases 
SET 
  lease_status = 'fully_signed',
  status = 'pending',
  activated_at = NULL
WHERE tenant_id = (SELECT id FROM users WHERE email = 'house@test.com');

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check Payments
SELECT 
  '📋 PAYMENTS' AS section,
  payment_type,
  status,
  amount_usdc,
  transaction_hash,
  created_at
FROM rent_payments 
WHERE tenant_id = (SELECT id FROM users WHERE email = 'house@test.com')
ORDER BY created_at;

-- Check User
SELECT 
  '👤 USER' AS section,
  email,
  full_name,
  role,
  user_type
FROM users 
WHERE email = 'house@test.com';

-- Check Lease
SELECT 
  '📄 LEASE' AS section,
  lease_status,
  status AS status_enum,
  activated_at,
  start_date,
  end_date,
  monthly_rent_usdc,
  security_deposit_usdc
FROM leases 
WHERE tenant_id = (SELECT id FROM users WHERE email = 'house@test.com');

-- Summary Count
SELECT 
  '📊 SUMMARY' AS info,
  (SELECT COUNT(*) FROM rent_payments 
   WHERE tenant_id = (SELECT id FROM users WHERE email = 'house@test.com') 
   AND status = 'pending') || ' pending payments' AS detail
UNION ALL
SELECT 
  '📊 SUMMARY' AS info,
  (SELECT role FROM users WHERE email = 'house@test.com') || ' role' AS detail
UNION ALL
SELECT 
  '📊 SUMMARY' AS info,
  (SELECT lease_status FROM leases 
   WHERE tenant_id = (SELECT id FROM users WHERE email = 'house@test.com') 
   LIMIT 1) || ' lease status' AS detail;
