# Post-Migration Backend Update

After running the `COMPLETE_BLOCKCHAIN_MIGRATION.sql` script, you need to update the backend to query the new blockchain columns.

## File to Update
`backend/src/index.ts` (around line 2256)

## Change Required

**Find this code:**
```typescript
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        id,
        property_id,
        tenant_id,
        start_date,
        end_date,
        monthly_rent_usdc,
        security_deposit_usdc,
        rent_due_day,
        status,
        lease_status,
        blockchain_lease_id,
        created_at,
        updated_at,
        property:properties(*)
      `)
```

**Replace with:**
```typescript
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        id,
        property_id,
        tenant_id,
        start_date,
        end_date,
        monthly_rent_usdc,
        security_deposit_usdc,
        rent_due_day,
        status,
        lease_status,
        blockchain_lease_id,
        blockchain_transaction_hash,
        tenant_signature,
        landlord_signature,
        tenant_signed_at,
        landlord_signed_at,
        created_at,
        updated_at,
        property:properties(*)
      `)
```

## What This Does

This adds back the blockchain signature columns to the SELECT query so that:
1. Frontend can display lease signing status
2. Frontend can show blockchain transaction hash for signed leases
3. Frontend can display "On-Chain" badge when lease is on blockchain

## When to Apply

**AFTER** you successfully run the `COMPLETE_BLOCKCHAIN_MIGRATION.sql` script in Supabase.

## Verification

After updating, restart the backend and check that:
1. Tenant dashboard loads without errors
2. Lease card shows "Blockchain Integration Pending" message
3. No console errors about missing columns
