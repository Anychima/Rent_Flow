-- Migration: Fix RLS Policy for Rent Payments
-- Date: 2025-10-22
-- Issue: Row-level security policy blocking payment creation by tenants

-- 1. Drop existing RLS policies for rent_payments
DROP POLICY IF EXISTS "Users can view their own payments" ON rent_payments;
DROP POLICY IF EXISTS "Users can create their own payments" ON rent_payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON rent_payments;
DROP POLICY IF EXISTS "Property managers can manage all payments" ON rent_payments;

-- 2. Create new permissive RLS policies

-- Allow tenants to view their own payments
CREATE POLICY "Tenants can view their own payments"
ON rent_payments FOR SELECT
USING (
  auth.uid()::text = tenant_id::text
  OR 
  EXISTS (
    SELECT 1 FROM leases 
    WHERE leases.id = rent_payments.lease_id 
    AND leases.tenant_id::text = auth.uid()::text
  )
);

-- Allow tenants to create payments for their leases
CREATE POLICY "Tenants can create payments for their leases"
ON rent_payments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leases 
    WHERE leases.id = lease_id 
    AND leases.tenant_id = tenant_id
    AND leases.status = 'active'
  )
);

-- Allow property managers/landlords to view all payments
CREATE POLICY "Landlords can view all payments"
ON rent_payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leases 
    JOIN properties ON properties.id = leases.property_id
    WHERE leases.id = rent_payments.lease_id 
    AND properties.owner_id::text = auth.uid()::text
  )
);

-- Allow property managers to create payments for any lease
CREATE POLICY "Landlords can create any payment"
ON rent_payments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leases 
    JOIN properties ON properties.id = leases.property_id
    WHERE leases.id = lease_id
    AND properties.owner_id::text = auth.uid()::text
  )
);

-- Allow payment updates by tenant or landlord
CREATE POLICY "Users can update their payments"
ON rent_payments FOR UPDATE
USING (
  tenant_id::text = auth.uid()::text
  OR
  EXISTS (
    SELECT 1 FROM leases 
    JOIN properties ON properties.id = leases.property_id
    WHERE leases.id = rent_payments.lease_id 
    AND properties.owner_id::text = auth.uid()::text
  )
);

-- 3. TEMPORARY: Allow service role to bypass RLS (for backend operations)
-- This allows the backend to create payments on behalf of users
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;

-- 4. Create policy for service role (backend)
CREATE POLICY "Service role can manage all payments"
ON rent_payments
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 5. Verify RLS is enabled
DO $$
BEGIN
    IF (SELECT relrowsecurity FROM pg_class WHERE relname = 'rent_payments') THEN
        RAISE NOTICE '✅ RLS is enabled for rent_payments';
    ELSE
        RAISE NOTICE '⚠️ RLS is NOT enabled for rent_payments';
    END IF;
END $$;

-- 6. List all policies
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'rent_payments';
    
    RAISE NOTICE '✅ Created % RLS policies for rent_payments', policy_count;
END $$;
