-- ============================================================
-- ASSIGN PROPERTIES TO TWO MANAGERS
-- ============================================================
-- Divides 12 existing properties between:
-- - fakile@test.com (6 properties)
-- - manager@rentflow.ai (6 properties)
-- ============================================================

-- Step 1: Get manager IDs
SELECT '📋 STEP 1: Getting Manager IDs' as section;
SELECT '=' as separator;

SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM users
WHERE email IN ('fakile@test.com', 'manager@rentflow.ai')
ORDER BY email;

SELECT '=' as separator;

-- Step 2: Check current property ownership
SELECT '📊 STEP 2: Current Property Distribution' as section;
SELECT '=' as separator;

SELECT 
  COALESCE(u.email, '⚠️ NO OWNER') as current_owner,
  COUNT(p.id) as property_count,
  array_agg(p.id ORDER BY p.created_at) as property_ids
FROM properties p
LEFT JOIN users u ON u.id = p.owner_id
GROUP BY u.email
ORDER BY property_count DESC;

SELECT '=' as separator;

-- Step 3: Show all properties that will be reassigned
SELECT '🏠 STEP 3: All Properties (Current State)' as section;
SELECT '=' as separator;

SELECT 
  ROW_NUMBER() OVER (ORDER BY p.created_at) as property_number,
  p.id,
  p.title,
  p.address,
  p.city,
  p.monthly_rent_usdc,
  COALESCE(u.email, 'NO OWNER') as current_owner,
  p.created_at
FROM properties p
LEFT JOIN users u ON u.id = p.owner_id
ORDER BY p.created_at;

SELECT '=' as separator;

-- Step 4: Assign first 6 properties to fakile@test.com
SELECT '🔧 STEP 4: Assigning First 6 Properties to fakile@test.com' as section;
SELECT '=' as separator;

WITH ranked_properties AS (
  SELECT 
    p.id,
    ROW_NUMBER() OVER (ORDER BY p.created_at) as rn
  FROM properties p
),
fakile_user AS (
  SELECT id FROM users WHERE email = 'fakile@test.com'
)
UPDATE properties
SET owner_id = (SELECT id FROM fakile_user)
WHERE id IN (
  SELECT rp.id FROM ranked_properties rp WHERE rp.rn <= 6
);

SELECT 
  COUNT(*) as properties_assigned,
  '✅ Assigned to fakile@test.com' as status
FROM properties p
JOIN users u ON u.id = p.owner_id
WHERE u.email = 'fakile@test.com';

SELECT '=' as separator;

-- Step 5: Assign next 6 properties to manager@rentflow.ai
SELECT '🔧 STEP 5: Assigning Next 6 Properties to manager@rentflow.ai' as section;
SELECT '=' as separator;

WITH ranked_properties AS (
  SELECT 
    p.id,
    ROW_NUMBER() OVER (ORDER BY p.created_at) as rn
  FROM properties p
),
manager_user AS (
  SELECT id FROM users WHERE email = 'manager@rentflow.ai'
)
UPDATE properties
SET owner_id = (SELECT id FROM manager_user)
WHERE id IN (
  SELECT rp.id FROM ranked_properties rp WHERE rp.rn BETWEEN 7 AND 12
);

SELECT 
  COUNT(*) as properties_assigned,
  '✅ Assigned to manager@rentflow.ai' as status
FROM properties p
JOIN users u ON u.id = p.owner_id
WHERE u.email = 'manager@rentflow.ai';

SELECT '=' as separator;

-- Step 6: Verify the assignment
SELECT '✅ STEP 6: Verification - Final Property Distribution' as section;
SELECT '=' as separator;

SELECT 
  u.email as manager_email,
  COUNT(p.id) as total_properties,
  array_agg(p.title ORDER BY p.created_at) as property_titles,
  CASE 
    WHEN COUNT(p.id) = 6 THEN '✅ CORRECT (6 properties)'
    ELSE '⚠️ INCORRECT (Expected 6, got ' || COUNT(p.id) || ')'
  END as verification_status
FROM users u
LEFT JOIN properties p ON p.owner_id = u.id
WHERE u.email IN ('fakile@test.com', 'manager@rentflow.ai')
GROUP BY u.email
ORDER BY u.email;

SELECT '=' as separator;

-- Step 7: Show detailed assignment
SELECT '📋 STEP 7: Detailed Property Assignment' as section;
SELECT '=' as separator;

SELECT 
  u.email as owner_email,
  p.id as property_id,
  p.title,
  p.address,
  p.city,
  p.monthly_rent_usdc,
  p.created_at
FROM properties p
JOIN users u ON u.id = p.owner_id
WHERE u.email IN ('fakile@test.com', 'manager@rentflow.ai')
ORDER BY u.email, p.created_at;

SELECT '=' as separator;

-- Step 8: Summary
SELECT '📊 FINAL SUMMARY' as section;
SELECT '=' as separator;

WITH assignment_summary AS (
  SELECT 
    u.email,
    COUNT(p.id) as property_count,
    SUM(p.monthly_rent_usdc) as total_monthly_revenue
  FROM users u
  LEFT JOIN properties p ON p.owner_id = u.id
  WHERE u.email IN ('fakile@test.com', 'manager@rentflow.ai')
  GROUP BY u.email
)
SELECT 
  email as "Manager Email",
  property_count as "Properties Assigned",
  total_monthly_revenue as "Total Monthly Revenue (USDC)",
  CASE 
    WHEN property_count = 6 THEN '✅ SUCCESS'
    ELSE '⚠️ CHECK NEEDED'
  END as "Status"
FROM assignment_summary
ORDER BY email;

SELECT '=' as separator;
SELECT '🎉 PROPERTY ASSIGNMENT COMPLETE!' as result;
SELECT '=' as separator;
SELECT '📝 Next Steps:' as info;
SELECT '  1. Have fakile@test.com logout and login - should see 6 properties' as step_1;
SELECT '  2. Have manager@rentflow.ai logout and login - should see 6 properties' as step_2;
SELECT '  3. Verify each manager can only see/edit their own properties' as step_3;
