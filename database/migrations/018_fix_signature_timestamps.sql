-- ============================================
-- RentFlow: Fix Signature Timestamp Columns
-- Migrate data from old columns to new columns
-- ============================================

-- This script fixes the column naming mismatch between:
-- - OLD: tenant_signature_date / landlord_signature_date
-- - NEW: tenant_signed_at / landlord_signed_at

-- Step 1: Copy timestamps from old columns to new columns (if they exist)
UPDATE leases 
SET tenant_signed_at = tenant_signature_date
WHERE tenant_signature_date IS NOT NULL
  AND tenant_signed_at IS NULL;

UPDATE leases 
SET landlord_signed_at = landlord_signature_date
WHERE landlord_signature_date IS NOT NULL
  AND landlord_signed_at IS NULL;

-- Step 2: Verify the migration
SELECT 
  id,
  lease_status,
  tenant_signature IS NOT NULL as has_tenant_sig,
  tenant_signed_at IS NOT NULL as has_tenant_timestamp,
  landlord_signature IS NOT NULL as has_landlord_sig,
  landlord_signed_at IS NOT NULL as has_landlord_timestamp,
  CASE 
    WHEN tenant_signed_at IS NOT NULL AND landlord_signed_at IS NOT NULL THEN '✅ Fully Signed'
    WHEN tenant_signed_at IS NOT NULL OR landlord_signed_at IS NOT NULL THEN '⏳ Partially Signed'
    ELSE '❌ Not Signed'
  END as signature_status
FROM leases
WHERE tenant_signature IS NOT NULL OR landlord_signature IS NOT NULL
ORDER BY created_at DESC;

-- Step 3: Show results summary
SELECT 
  COUNT(*) as total_leases,
  SUM(CASE WHEN tenant_signed_at IS NOT NULL AND landlord_signed_at IS NOT NULL THEN 1 ELSE 0 END) as fully_signed,
  SUM(CASE WHEN tenant_signed_at IS NOT NULL OR landlord_signed_at IS NOT NULL THEN 1 ELSE 0 END) as partially_signed
FROM leases;

-- Success message
SELECT '✅ Signature timestamp migration completed!' as message;

-- OPTIONAL: Drop old columns after verifying migration
-- Uncomment these lines only after confirming new columns work correctly:
-- ALTER TABLE leases DROP COLUMN IF EXISTS tenant_signature_date;
-- ALTER TABLE leases DROP COLUMN IF EXISTS landlord_signature_date;
