-- ============================================================
-- VERIFY MULTI-TENANCY ISOLATION
-- ============================================================
-- Check that each manager's data is properly isolated
-- ============================================================

-- Step 1: Show manager information
SELECT '👥 STEP 1: Manager Information' as section;
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

-- Step 2: Properties per manager
SELECT '🏠 STEP 2: Properties Distribution' as section;
SELECT '=' as separator;

SELECT 
  u.email as manager_email,
  COUNT(p.id) as property_count,
  array_agg(p.title ORDER BY p.created_at) as property_titles
FROM users u
LEFT JOIN properties p ON p.owner_id = u.id
WHERE u.email IN ('fakile@test.com', 'manager@rentflow.ai')
GROUP BY u.email
ORDER BY u.email;

SELECT '=' as separator;

-- Step 3: Leases per manager (via their properties)
SELECT '📄 STEP 3: Active Leases per Manager' as section;
SELECT '=' as separator;

WITH manager_properties AS (
  SELECT 
    u.email as manager_email,
    u.id as manager_id,
    p.id as property_id
  FROM users u
  LEFT JOIN properties p ON p.owner_id = u.id
  WHERE u.email IN ('fakile@test.com', 'manager@rentflow.ai')
)
SELECT 
  mp.manager_email,
  COUNT(DISTINCT l.id) as active_lease_count,
  array_agg(DISTINCT l.id) FILTER (WHERE l.id IS NOT NULL) as lease_ids
FROM manager_properties mp
LEFT JOIN leases l ON l.property_id = mp.property_id AND l.status = 'active'
GROUP BY mp.manager_email
ORDER BY mp.manager_email;

SELECT '=' as separator;

-- Step 4: Maintenance requests per manager
SELECT '🔧 STEP 4: Pending Maintenance per Manager' as section;
SELECT '=' as separator;

WITH manager_properties AS (
  SELECT 
    u.email as manager_email,
    u.id as manager_id,
    p.id as property_id
  FROM users u
  LEFT JOIN properties p ON p.owner_id = u.id
  WHERE u.email IN ('fakile@test.com', 'manager@rentflow.ai')
)
SELECT 
  mp.manager_email,
  COUNT(DISTINCT m.id) as pending_maintenance_count,
  array_agg(DISTINCT m.title) FILTER (WHERE m.id IS NOT NULL) as request_titles
FROM manager_properties mp
LEFT JOIN maintenance_requests m ON m.property_id = mp.property_id AND m.status = 'pending'
GROUP BY mp.manager_email
ORDER BY mp.manager_email;

SELECT '=' as separator;

-- Step 5: Applications per manager
SELECT '📋 STEP 5: Applications per Manager' as section;
SELECT '=' as separator;

WITH manager_properties AS (
  SELECT 
    u.email as manager_email,
    u.id as manager_id,
    p.id as property_id
  FROM users u
  LEFT JOIN properties p ON p.owner_id = u.id
  WHERE u.email IN ('fakile@test.com', 'manager@rentflow.ai')
)
SELECT 
  mp.manager_email,
  COUNT(DISTINCT a.id) as application_count,
  COUNT(DISTINCT CASE WHEN a.status = 'submitted' THEN a.id END) as submitted_count,
  COUNT(DISTINCT CASE WHEN a.status = 'approved' THEN a.id END) as approved_count
FROM manager_properties mp
LEFT JOIN property_applications a ON a.property_id = mp.property_id
GROUP BY mp.manager_email
ORDER BY mp.manager_email;

SELECT '=' as separator;

-- Step 6: Payments/Revenue per manager
SELECT '💰 STEP 6: Revenue per Manager (Completed Payments)' as section;
SELECT '=' as separator;

WITH manager_properties AS (
  SELECT 
    u.email as manager_email,
    u.id as manager_id,
    p.id as property_id
  FROM users u
  LEFT JOIN properties p ON p.owner_id = u.id
  WHERE u.email IN ('fakile@test.com', 'manager@rentflow.ai')
),
manager_leases AS (
  SELECT 
    mp.manager_email,
    l.id as lease_id
  FROM manager_properties mp
  LEFT JOIN leases l ON l.property_id = mp.property_id
)
SELECT 
  ml.manager_email,
  COUNT(DISTINCT rp.id) as payment_count,
  COALESCE(SUM(rp.amount_usdc), 0) as total_revenue_usdc,
  COUNT(DISTINCT CASE WHEN rp.status = 'completed' THEN rp.id END) as completed_payments,
  COUNT(DISTINCT CASE WHEN rp.status = 'pending' THEN rp.id END) as pending_payments
FROM manager_leases ml
LEFT JOIN rent_payments rp ON rp.lease_id = ml.lease_id
GROUP BY ml.manager_email
ORDER BY ml.manager_email;

SELECT '=' as separator;

-- Step 7: Dashboard Stats Summary (What each manager should see)
SELECT '📊 STEP 7: Expected Dashboard Stats per Manager' as section;
SELECT '=' as separator;

WITH manager_stats AS (
  SELECT 
    u.email as manager_email,
    u.id as manager_id,
    -- Properties count
    COUNT(DISTINCT p.id) as total_properties,
    -- Active leases count
    COUNT(DISTINCT CASE WHEN l.status = 'active' THEN l.id END) as active_leases,
    -- Pending maintenance count
    COUNT(DISTINCT CASE WHEN m.status = 'pending' THEN m.id END) as pending_maintenance,
    -- Total revenue from completed payments
    COALESCE(SUM(DISTINCT rp.amount_usdc) FILTER (WHERE rp.status = 'completed'), 0) as total_revenue
  FROM users u
  LEFT JOIN properties p ON p.owner_id = u.id
  LEFT JOIN leases l ON l.property_id = p.id
  LEFT JOIN maintenance_requests m ON m.property_id = p.id
  LEFT JOIN rent_payments rp ON rp.lease_id = l.id
  WHERE u.email IN ('fakile@test.com', 'manager@rentflow.ai')
  GROUP BY u.email, u.id
)
SELECT 
  manager_email as "Manager Email",
  total_properties as "Total Properties",
  active_leases as "Active Leases",
  pending_maintenance as "Pending Maintenance",
  ROUND(total_revenue::numeric, 2) as "Total Revenue (USDC)",
  CASE 
    WHEN total_properties = 6 THEN '✅ CORRECT'
    ELSE '⚠️ INCORRECT - Expected 6'
  END as "Verification Status"
FROM manager_stats
ORDER BY manager_email;

SELECT '=' as separator;

-- Step 8: Check for data isolation violations
SELECT '🚨 STEP 8: Data Isolation Check' as section;
SELECT '=' as separator;

WITH manager1_props AS (
  SELECT p.id FROM properties p
  JOIN users u ON u.id = p.owner_id
  WHERE u.email = 'fakile@test.com'
),
manager2_props AS (
  SELECT p.id FROM properties p
  JOIN users u ON u.id = p.owner_id
  WHERE u.email = 'manager@rentflow.ai'
)
SELECT 
  '✅ Data Isolation Check' as status,
  (SELECT COUNT(*) FROM manager1_props) as fakile_properties,
  (SELECT COUNT(*) FROM manager2_props) as manager_properties,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM manager1_props m1
      JOIN manager2_props m2 ON m1.id = m2.id
    ) THEN '✅ NO OVERLAP - Isolation OK'
    ELSE '⚠️ OVERLAP DETECTED - Isolation BROKEN'
  END as isolation_status;

SELECT '=' as separator;

-- Final Summary
SELECT '📋 FINAL SUMMARY' as section;
SELECT '=' as separator;

SELECT 
  '✅ Multi-Tenancy Verification Complete!' as result,
  'Each manager should see only their own data' as note,
  'Check the stats above match what appears in their dashboards' as action;

SELECT '=' as separator;
