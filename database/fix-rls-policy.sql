-- ============================================================================
-- FIX: Profile Load Failed - RLS Policy Update
-- ============================================================================
-- Run this in Supabase SQL Editor to fix the profile fetch issue
--
-- Problem: Users can't read their own profile due to ID mismatch
-- Solution: Update RLS policy to allow email-based lookup
-- ============================================================================

-- Step 1: Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view own data" ON users;

-- Step 2: Create a more permissive policy for development
CREATE POLICY "Users can read own profile"
ON users FOR SELECT
USING (
  -- Allow if Auth ID matches Database ID
  auth.uid()::text = id::text
  OR
  -- Allow if email matches (for email fallback lookup)
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Step 3: Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users';

-- ============================================================================
-- Alternative: Temporarily disable RLS for testing
-- ============================================================================
-- Uncomment below to disable RLS (NOT RECOMMENDED FOR PRODUCTION!)
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Alternative: Sync Auth ID with Database ID
-- ============================================================================
-- Uncomment below to make Database ID match Auth ID
-- This eliminates the need for email fallback

/*
-- Update user ID to match Auth ID
UPDATE users 
SET id = 'd296410e-35db-498c-8949-93c5332d3034'
WHERE email = 'john.doe@email.com';

-- Update related lease records
UPDATE leases 
SET tenant_id = 'd296410e-35db-498c-8949-93c5332d3034'
WHERE tenant_id = 'a0000000-0000-0000-0000-000000000003';

-- Update related maintenance records
UPDATE maintenance_requests
SET requested_by = 'd296410e-35db-498c-8949-93c5332d3034'
WHERE requested_by = 'a0000000-0000-0000-0000-000000000003';

-- Verify the update
SELECT id, email, full_name, role 
FROM users 
WHERE email = 'john.doe@email.com';
*/

-- ============================================================================
-- Expected Result After Running This Script
-- ============================================================================
-- 1. Policy created successfully
-- 2. Users can now query their own profile by email
-- 3. App should load after login without "Profile Load Failed" error
-- ============================================================================
