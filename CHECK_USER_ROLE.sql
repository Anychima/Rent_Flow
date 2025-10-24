-- =========================================
-- FIX: Manager Dashboard Blank Screen
-- Issue: User role not set correctly in database
-- User: manager@rentflow.ai
-- =========================================

-- ============================================
-- STEP 1: Check Current User Role
-- ============================================
-- Run this FIRST to see what the current state is

SELECT 
    id,
    email,
    first_name,
    last_name,
    user_type,
    role,
    is_active,
    created_at,
    CASE 
        WHEN role = 'manager' THEN '✅ CORRECT - Should see Manager Dashboard'
        WHEN role = 'tenant' THEN '❌ WRONG - Will see Tenant Dashboard'
        WHEN role = 'prospective_tenant' THEN '❌ WRONG - Will see Public Listings'
        WHEN role IS NULL THEN '⛔ CRITICAL - Role is NULL!'
        ELSE '⚠️ UNKNOWN ROLE'
    END as diagnosis
FROM users 
WHERE email = 'manager@rentflow.ai';

-- ============================================
-- STEP 2: Fix Manager Role (Run if diagnosis shows problem)
-- ============================================

UPDATE users 
SET role = 'manager'
WHERE email = 'manager@rentflow.ai'
  AND (role IS NULL OR role != 'manager');

-- ============================================
-- STEP 3: Verify Fix Worked
-- ============================================

SELECT 
    email,
    user_type,
    role,
    CASE 
        WHEN role = 'manager' THEN '✅ SUCCESS - Manager can now access dashboard'
        ELSE '❌ STILL WRONG - Check Step 2'
    END as result
FROM users 
WHERE email = 'manager@rentflow.ai';

-- ============================================
-- OPTIONAL: Fix ALL Users in Database
-- ============================================
-- Run this to ensure ALL users have correct roles

-- First, check who needs fixing
SELECT 
    email,
    user_type,
    role,
    CASE 
        WHEN user_type = 'property_manager' AND role != 'manager' THEN '⚠️ NEEDS FIX'
        WHEN user_type = 'tenant' AND role != 'tenant' THEN '⚠️ NEEDS FIX'
        WHEN role IS NULL THEN '⚠️ NEEDS FIX'
        ELSE '✅ OK'
    END as status
FROM users
ORDER BY email;

-- Then fix them all
UPDATE users 
SET role = CASE 
    WHEN user_type = 'property_manager' THEN 'manager'
    WHEN user_type = 'tenant' THEN 'tenant'
    ELSE 'prospective_tenant'
END
WHERE role IS NULL 
   OR (user_type = 'property_manager' AND role != 'manager')
   OR (user_type = 'tenant' AND role != 'tenant');

-- Final verification of all users
SELECT 
    email,
    user_type,
    role,
    '✅ All users fixed!' as message
FROM users
ORDER BY email;

-- ============================================
-- Expected Results After Fix:
-- ============================================
-- manager@rentflow.ai should have:
--   user_type: 'property_manager'
--   role: 'manager'
--   
-- After this fix:
-- 1. Sign out of the app
-- 2. Clear browser cache (Ctrl + Shift + Delete)
-- 3. Sign back in as manager@rentflow.ai
-- 4. You should see the Manager Dashboard with stats
-- ============================================
