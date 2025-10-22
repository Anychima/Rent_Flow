-- Fix RLS Policies to Allow Anonymous Read Access for Development
-- Run this in Supabase SQL Editor to allow the frontend to read data

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Owners can manage properties" ON properties;
DROP POLICY IF EXISTS "Public can view active properties" ON properties;
DROP POLICY IF EXISTS "Users can view their leases" ON leases;
DROP POLICY IF EXISTS "Users can view payments" ON rent_payments;

-- Create permissive policies for development (allow anonymous read access)

-- Allow anyone to read users (for development)
CREATE POLICY "Allow public read access to users" ON users
    FOR SELECT USING (true);

-- Allow anyone to read properties
CREATE POLICY "Allow public read access to properties" ON properties
    FOR SELECT USING (true);

-- Allow property owners to manage their properties
CREATE POLICY "Property owners can manage" ON properties
    FOR ALL USING (auth.uid()::text = owner_id::text);

-- Allow anyone to read leases
CREATE POLICY "Allow public read access to leases" ON leases
    FOR SELECT USING (true);

-- Allow anyone to read rent payments
CREATE POLICY "Allow public read access to rent_payments" ON rent_payments
    FOR SELECT USING (true);

-- Allow anyone to read maintenance requests
CREATE POLICY "Allow public read access to maintenance_requests" ON maintenance_requests
    FOR SELECT USING (true);

-- Allow anyone to read messages
CREATE POLICY "Allow public read access to messages" ON messages
    FOR SELECT USING (true);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=================================';
    RAISE NOTICE '✅ RLS Policies Updated!';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Anonymous read access enabled for:';
    RAISE NOTICE '  ✓ users';
    RAISE NOTICE '  ✓ properties';
    RAISE NOTICE '  ✓ leases';
    RAISE NOTICE '  ✓ rent_payments';
    RAISE NOTICE '  ✓ maintenance_requests';
    RAISE NOTICE '  ✓ messages';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Frontend should now display data correctly!';
    RAISE NOTICE '=================================';
END $$;
