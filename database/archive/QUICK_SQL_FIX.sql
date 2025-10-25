-- ============================================
-- QUICK FIX: Update manager role immediately
-- Copy and paste this ENTIRE block into Supabase SQL Editor
-- ============================================

-- Step 1: Check what we have now
SELECT 
    'BEFORE FIX' as step,
    email,
    user_type,
    role
FROM users 
WHERE email = 'manager@rentflow.ai';

-- Step 2: Update the role to manager
UPDATE users 
SET role = 'manager'
WHERE email = 'manager@rentflow.ai';

-- Step 3: Verify it worked
SELECT 
    'AFTER FIX' as step,
    email,
    user_type,
    role,
    CASE 
        WHEN role = 'manager' THEN '✅ SUCCESS - Dashboard should work now!'
        ELSE '❌ STILL WRONG - Contact support'
    END as status
FROM users 
WHERE email = 'manager@rentflow.ai';

-- ============================================
-- EXPECTED OUTPUT:
-- ============================================
-- BEFORE FIX: role might be NULL, tenant, or prospective_tenant
-- AFTER FIX: role should be 'manager' with ✅ SUCCESS message
-- ============================================

-- After running this:
-- 1. Sign out of the app
-- 2. Clear browser cache (Ctrl+Shift+Delete)
-- 3. Sign in again
-- 4. Check browser console for "Profile Role: manager"
-- ============================================
