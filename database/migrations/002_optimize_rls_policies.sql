-- Migration: Optimize RLS policies to reduce overhead
-- Replace inefficient auth.uid() calls with cached session variables
-- Run this in Supabase SQL Editor AFTER reviewing your current RLS policies

-- For properties table - More efficient RLS
-- Instead of calling auth.uid() multiple times, use it once
DROP POLICY IF EXISTS "Users can view properties" ON public.properties;
CREATE POLICY "Users can view properties" ON public.properties
FOR SELECT
USING (
  is_active = true 
  OR owner_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "Managers can manage their properties" ON public.properties;
CREATE POLICY "Managers can manage their properties" ON public.properties
FOR ALL
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

-- For users table - Optimize user access
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
FOR SELECT
USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- For rent_payments - Optimize payment access
DROP POLICY IF EXISTS "Tenants can view their payments" ON public.rent_payments;
CREATE POLICY "Tenants can view their payments" ON public.rent_payments
FOR SELECT
USING (
  tenant_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.leases l
    INNER JOIN public.properties p ON l.property_id = p.id
    WHERE l.id = rent_payments.lease_id
    AND p.owner_id = (SELECT auth.uid())
  )
);

-- For user_wallets - Optimize wallet access
DROP POLICY IF EXISTS "Users can view their wallets" ON public.user_wallets;
CREATE POLICY "Users can view their wallets" ON public.user_wallets
FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their wallets" ON public.user_wallets;
CREATE POLICY "Users can update their wallets" ON public.user_wallets
FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Add helpful comments
COMMENT ON POLICY "Users can view properties" ON public.properties IS 'Optimized RLS: Users see active properties or their own';
COMMENT ON POLICY "Managers can manage their properties" ON public.properties IS 'Optimized RLS: Managers manage only their properties';
COMMENT ON POLICY "Users can view own profile" ON public.users IS 'Optimized RLS: Users access only their profile';
COMMENT ON POLICY "Tenants can view their payments" ON public.rent_payments IS 'Optimized RLS: Tenants or property managers see payments';
