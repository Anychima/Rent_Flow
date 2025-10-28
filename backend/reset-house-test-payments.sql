-- ============================================================
-- RESET PAYMENTS FOR house@test.com
-- This script resets all payments to pending status so you can test again
-- ============================================================

-- Step 1: Find the user ID for house@test.com
-- Run this first to see the user ID
SELECT id, email, role, full_name 
FROM users 
WHERE email = 'house@test.com';

-- Step 2: Reset all payments for this user back to pending
UPDATE rent_payments 
SET 
  status = 'pending',
  transaction_hash = NULL,
  payment_date = NULL,
  on_chain = false,
  notes = 'Reset for testing'
WHERE tenant_id = (SELECT id FROM users WHERE email = 'house@test.com');

-- Step 3: Also reset the user's role back to prospective_tenant if needed
UPDATE users 
SET 
  role = 'prospective_tenant',
  user_type = 'prospective_tenant'
WHERE email = 'house@test.com';

-- Step 4: Reset any lease status from 'active' to 'fully_signed'
-- Note: lease_status can be 'fully_signed', but status column must be a valid enum value
UPDATE leases 
SET 
  lease_status = 'fully_signed',
  status = 'pending',
  activated_at = NULL
WHERE tenant_id = (SELECT id FROM users WHERE email = 'house@test.com')
  AND lease_status = 'active';

-- Step 5: Verify the changes
SELECT 
  rp.id,
  rp.payment_type,
  rp.amount_usdc,
  rp.status,
  rp.transaction_hash,
  rp.payment_date,
  u.email
FROM rent_payments rp
JOIN users u ON rp.tenant_id = u.id
WHERE u.email = 'house@test.com'
ORDER BY rp.created_at;

-- Step 6: Check lease status
SELECT 
  l.id,
  l.lease_status,
  l.activated_at,
  u.email AS tenant_email,
  u.role AS tenant_role
FROM leases l
JOIN users u ON l.tenant_id = u.id
WHERE u.email = 'house@test.com';
