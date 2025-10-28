# 🚀 Complete Blockchain Migration Guide

## Overview
This migration adds blockchain signature support to the `leases` table and cleans up mock/test transaction hashes from the `rent_payments` table.

## What This Migration Does

### ✅ Adds to `leases` table:
- `blockchain_transaction_hash` TEXT - Hash of the on-chain lease transaction
- `tenant_signature` TEXT - Tenant's signature data
- `landlord_signature` TEXT - Landlord's signature data
- `tenant_signed_at` TIMESTAMP - When tenant signed
- `landlord_signed_at` TIMESTAMP - When landlord signed
- Indexes for blockchain lookups

### ✅ Cleans `rent_payments` table:
- Removes mock/randomly-generated transaction hashes
- Removes DEV_SIMULATED test hashes
- Ensures only REAL Circle API transaction hashes remain

## Why Clean Transaction Hashes?

Earlier, I mistakenly added **randomly generated** transaction hashes to completed payments. These look like real Arc transactions (0x...) but they are NOT actual blockchain transactions. This migration removes them so that:

1. **Only REAL blockchain transactions** are shown
2. **Links to Arc Explorer** only appear for actual on-chain payments
3. **Data integrity** is maintained - no fake hashes

## How to Run

### Step 1: Open Supabase SQL Editor

Visit: https://supabase.com/dashboard/project/saiceqyaootvkdenxbqx/sql

### Step 2: Copy the SQL Script

Open the file: `COMPLETE_BLOCKCHAIN_MIGRATION.sql`

Or copy this:

```sql
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
```

### Step 3: Execute

1. Paste the SQL into the Supabase SQL Editor
2. Click **"Run"** or press Ctrl+Enter
3. Wait for completion (should take < 5 seconds)

### Step 4: Verify Results

You should see output showing:
- ✅ Lease Columns Added: X total_leases
- ✅ Real Arc Payments: 0 (after cleanup)
- ✅ Current lease blockchain status (all NULL - ready for real signatures)
- ✅ Migration completed successfully!

### Step 5: Update Backend

Follow instructions in `POST_MIGRATION_BACKEND_UPDATE.md` to update the backend query to include the new columns.

### Step 6: Restart Servers

```bash
# Stop backend and frontend
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

# Start servers
cd c:\Users\olumbach\Documents\Rent_Flow
npm run dev
```

### Step 7: Verify in Browser

1. Refresh tenant dashboard (Ctrl+F5)
2. Check that:
   - Dashboard loads without errors
   - Lease information is visible
   - "Blockchain Integration Pending" message shows (until first real lease signature)
   - No transaction hashes show in payment history (until real payments are made)

## Expected Behavior After Migration

### Payments Tab
- ✅ Transaction Hash column exists
- ⚠️ Shows "-" or empty for payments (no mock hashes)
- ✅ Will show REAL hashes when payments are made via Circle API going forward

### Lease Section
- ✅ Lease Agreement card shows
- ✅ "Blockchain Integration Pending" message displays
- ✅ Shows lease terms (rent, deposit, dates)
- ✅ Will show signatures once landlord signs on-chain

## What Happens Next?

From now on, when:

1. **Tenant makes payment via Circle API** → Real Arc transaction hash is saved
2. **Landlord signs lease on-chain** → blockchain_transaction_hash, landlord_signed_at, landlord_signature are saved
3. **Tenant signs lease on-chain** → tenant_signed_at, tenant_signature are saved

All transaction hashes will be **REAL** blockchain transactions, not mock/test data.

## Troubleshooting

### If you see errors:
1. Check that you're connected to the correct Supabase project
2. Ensure you have database modification permissions
3. Copy error message and check for syntax issues

### If backend still shows errors:
1. Make sure you updated the backend query (Step 5)
2. Restart both servers
3. Clear browser cache (Ctrl+Shift+Delete)

## Files Reference

- `COMPLETE_BLOCKCHAIN_MIGRATION.sql` - The migration script
- `POST_MIGRATION_BACKEND_UPDATE.md` - Backend update instructions
- `README_RUN_MIGRATION.md` - This file

---

**Ready to proceed?** Run the SQL script in Supabase SQL Editor!
