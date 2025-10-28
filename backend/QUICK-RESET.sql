-- Quick Reset Script for house@test.com
-- Run this in Supabase SQL Editor

-- Reset all payments to pending
UPDATE rent_payments 
SET 
  status = 'pending',
  transaction_hash = NULL,
  payment_date = NULL,
  on_chain = false,
  notes = 'Reset for testing'
WHERE tenant_id = (SELECT id FROM users WHERE email = 'house@test.com');

-- Reset user role
UPDATE users 
SET 
  role = 'prospective_tenant',
  user_type = 'prospective_tenant'
WHERE email = 'house@test.com';

-- Reset lease status (lease_status can be 'fully_signed', but status must be 'pending')
UPDATE leases 
SET 
  lease_status = 'fully_signed',
  status = 'pending',
  activated_at = NULL
WHERE tenant_id = (SELECT id FROM users WHERE email = 'house@test.com');

-- Verify (cast numeric to text for UNION compatibility)
SELECT 'Payments:' as section, payment_type, status, amount_usdc::text AS amount
FROM rent_payments 
WHERE tenant_id = (SELECT id FROM users WHERE email = 'house@test.com')
UNION ALL
SELECT 'User:' as section, email, role, user_type::text AS amount
FROM users 
WHERE email = 'house@test.com';
