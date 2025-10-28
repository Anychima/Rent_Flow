-- ============================================
-- RentFlow Database Migration Script
-- Add Blockchain Signature Support to Leases
-- ============================================

-- Step 1: Add blockchain and signature fields to leases table
ALTER TABLE leases 
ADD COLUMN IF NOT EXISTS blockchain_transaction_hash TEXT,
ADD COLUMN IF NOT EXISTS tenant_signature TEXT,
ADD COLUMN IF NOT EXISTS landlord_signature TEXT,
ADD COLUMN IF NOT EXISTS tenant_signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS landlord_signed_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Create indexes for blockchain lookups
CREATE INDEX IF NOT EXISTS idx_leases_blockchain_tx ON leases(blockchain_transaction_hash);
CREATE INDEX IF NOT EXISTS idx_leases_blockchain_id ON leases(blockchain_lease_id);

-- Step 3: Remove ALL mock/generated transaction hashes
-- These were mistakenly added as random hex values, not real blockchain transactions
-- Only keep transaction hashes that came from actual Circle API responses

-- Remove the mock Arc hashes (randomly generated, not real)
UPDATE rent_payments 
SET transaction_hash = NULL,
    blockchain_network = 'solana'  -- Reset to default
WHERE id IN (
    '04d389b5-69f5-477c-a4f5-0491519e1ffe',  -- Mock hash (randomly generated)
    'f0074d86-fc58-462f-be0b-c288891f6961'   -- Mock hash (randomly generated)
);

-- Remove DEV_SIMULATED hashes (these are test hashes)
UPDATE rent_payments 
SET transaction_hash = NULL
WHERE transaction_hash LIKE 'DEV_SIMULATED%';

-- After this, transaction_hash should ONLY be set when we have a REAL
-- blockchain transaction from Circle API's createTransfer response

-- Step 4: Verify the results
SELECT 
  'Lease Columns Added' as status,
  COUNT(*) as total_leases
FROM leases;

SELECT 
  'Real Arc Payments' as status,
  COUNT(*) as count
FROM rent_payments 
WHERE blockchain_network = 'arc' 
  AND transaction_hash IS NOT NULL;

-- Step 5: Show current lease blockchain status
SELECT 
  id,
  lease_status,
  blockchain_lease_id,
  blockchain_transaction_hash,
  tenant_signed_at,
  landlord_signed_at,
  CASE 
    WHEN tenant_signed_at IS NOT NULL AND landlord_signed_at IS NOT NULL THEN 'Fully Signed'
    WHEN tenant_signed_at IS NOT NULL OR landlord_signed_at IS NOT NULL THEN 'Partially Signed'
    ELSE 'Not Signed'
  END as signature_status
FROM leases
WHERE lease_status IN ('active', 'fully_signed')
ORDER BY created_at DESC
LIMIT 5;

-- Step 6: Show only REAL Arc transaction hashes
SELECT 
  id,
  payment_type,
  amount_usdc,
  status,
  blockchain_network,
  LEFT(transaction_hash, 20) || '...' as tx_hash_preview,
  created_at
FROM rent_payments
WHERE blockchain_network = 'arc'
  AND transaction_hash IS NOT NULL
ORDER BY created_at DESC;

-- Success message
SELECT '✅ Migration completed successfully!' as message;
