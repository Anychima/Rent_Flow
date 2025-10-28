-- Migration: Add 'processing' status to rent_payments
-- Date: 2025-10-28
-- Purpose: Allow payments to be marked as 'processing' when transaction is pending on-chain

-- Drop the existing CHECK constraint
ALTER TABLE rent_payments 
DROP CONSTRAINT IF EXISTS rent_payments_status_check;

-- Add the new CHECK constraint with 'processing' status
ALTER TABLE rent_payments
ADD CONSTRAINT rent_payments_status_check 
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'late'));

-- Verify
SELECT 'Processing status added to rent_payments!' AS status;
