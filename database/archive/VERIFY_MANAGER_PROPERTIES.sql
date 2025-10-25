-- ============================================================
-- VERIFY MANAGER PROPERTY ISOLATION
-- ============================================================

-- Step 1: Check how properties are distributed among managers
SELECT '📊 PROPERTY DISTRIBUTION BY MANAGER' as section;
SELECT '=' as separator;

SELECT 
  COALESCE(u.email, '⚠️ NO OWNER ASSIGNED') as manager_email,
  u.role,
  COUNT(p.id) as total_properties,
  COUNT(CASE WHEN p.is_active = true THEN 1 END) as active_properties,
  array_agg(p.title ORDER BY p.created_at DESC) as property_titles
FROM properties p
LEFT JOIN users u ON u.id = p.owner_id
GROUP BY u.id, u.email, u.role
ORDER BY total_properties DESC;

SELECT '=' as separator;

-- Step 2: Find properties without owners (needs fixing)
SELECT '🚨 ORPHANED PROPERTIES (NO OWNER)' as section;
SELECT '=' as separator;

SELECT 
  id,
  title,
  address,
  city,
  monthly_rent_usdc,
  created_at,
  '⚠️ NEEDS OWNER ASSIGNMENT' as action_needed
FROM properties
WHERE owner_id IS NULL;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No orphaned properties found'
    ELSE '⚠️ Found ' || COUNT(*) || ' properties without owners'
  END as status
FROM properties
WHERE owner_id IS NULL;

SELECT '=' as separator;

-- Step 3: Check all managers and their property counts
SELECT '👥 ALL MANAGERS AND THEIR PROPERTIES' as section;
SELECT '=' as separator;

SELECT 
  u.id as manager_id,
  u.email,
  u.full_name,
  u.created_at as joined_date,
  COUNT(p.id) as property_count,
  CASE 
    WHEN COUNT(p.id) = 0 THEN '✅ CORRECT - New manager with no properties yet'
    WHEN COUNT(p.id) > 0 THEN '✅ Has ' || COUNT(p.id) || ' properties'
  END as status
FROM users u
LEFT JOIN properties p ON p.owner_id = u.id
WHERE u.role = 'manager'
GROUP BY u.id, u.email, u.full_name, u.created_at
ORDER BY u.created_at DESC;

SELECT '=' as separator;

-- Step 4: Verify latest property creations have correct ownership
SELECT '🏠 RECENT PROPERTY CREATIONS (Last 10)' as section;
SELECT '=' as separator;

SELECT 
  p.id,
  p.title,
  p.address,
  u.email as owner_email,
  u.full_name as owner_name,
  p.created_at,
  CASE 
    WHEN p.owner_id IS NULL THEN '❌ NO OWNER'
    WHEN u.role = 'manager' THEN '✅ Correct ownership'
    ELSE '⚠️ Owner is not a manager'
  END as ownership_status
FROM properties p
LEFT JOIN users u ON u.id = p.owner_id
ORDER BY p.created_at DESC
LIMIT 10;

SELECT '=' as separator;

-- Step 5: Check for properties shared across managers (shouldn't exist)
SELECT '🔍 CHECKING FOR DUPLICATE OWNERSHIP ISSUES' as section;
SELECT '=' as separator;

WITH property_counts AS (
  SELECT 
    owner_id,
    COUNT(*) as property_count
  FROM properties
  WHERE owner_id IS NOT NULL
  GROUP BY owner_id
  HAVING COUNT(*) > 10  -- Flag managers with suspiciously high property counts
)
SELECT 
  u.email,
  u.full_name,
  pc.property_count,
  '⚠️ Review: High property count' as note
FROM property_counts pc
JOIN users u ON u.id = pc.owner_id;

SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM properties 
      WHERE owner_id IS NOT NULL 
      GROUP BY owner_id 
      HAVING COUNT(*) > 10
    )
    THEN '✅ No suspicious property distributions found'
    ELSE '⚠️ Some managers have high property counts - review above'
  END as distribution_check;

SELECT '=' as separator;

-- Step 6: Verify owner_id consistency
SELECT '🔧 DATA INTEGRITY CHECK' as section;
SELECT '=' as separator;

-- Check if all owner_ids reference valid users
SELECT 
  COUNT(*) FILTER (WHERE p.owner_id IS NULL) as null_owner_count,
  COUNT(*) FILTER (WHERE p.owner_id IS NOT NULL AND u.id IS NULL) as invalid_owner_count,
  COUNT(*) FILTER (WHERE u.role != 'manager') as non_manager_owner_count,
  COUNT(*) FILTER (WHERE u.role = 'manager') as valid_owner_count,
  COUNT(*) as total_properties
FROM properties p
LEFT JOIN users u ON u.id = p.owner_id;

SELECT '=' as separator;

-- Step 7: Generate fix commands if needed
SELECT '🛠️ FIX COMMANDS (if needed)' as section;
SELECT '=' as separator;

SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN 
      '-- Found ' || COUNT(*) || ' properties without owners. Run these commands to fix:' || E'\n' ||
      E'\n-- Option 1: Assign to oldest manager' ||
      E'\nUPDATE properties SET owner_id = (' ||
      E'\n  SELECT id FROM users WHERE role = ''manager'' ORDER BY created_at LIMIT 1' ||
      E'\n) WHERE owner_id IS NULL;' ||
      E'\n' ||
      E'\n-- Option 2: Delete orphaned properties (if they are test data)' ||
      E'\n-- DELETE FROM properties WHERE owner_id IS NULL;'
    ELSE
      '✅ No fix needed - all properties have valid owners'
  END as fix_commands
FROM properties
WHERE owner_id IS NULL;

SELECT '=' as separator;

-- Step 8: Final summary
SELECT '📋 SUMMARY' as section;
SELECT '=' as separator;

WITH summary AS (
  SELECT 
    COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'manager') as total_managers,
    COUNT(p.id) as total_properties,
    COUNT(p.id) FILTER (WHERE p.owner_id IS NULL) as orphaned_properties,
    COUNT(DISTINCT p.owner_id) as managers_with_properties
  FROM properties p
  FULL OUTER JOIN users u ON u.id = p.owner_id OR u.role = 'manager'
)
SELECT 
  total_managers as "Total Managers",
  managers_with_properties as "Managers with Properties",
  (total_managers - managers_with_properties) as "Managers without Properties (New/Empty)",
  total_properties as "Total Properties",
  orphaned_properties as "Properties Needing Owner",
  CASE 
    WHEN orphaned_properties = 0 THEN '✅ ALL GOOD'
    ELSE '⚠️ NEEDS ATTENTION'
  END as "Overall Status"
FROM summary;

SELECT '=' as separator;
SELECT '✅ VERIFICATION COMPLETE' as result;
SELECT '=' as separator;

-- Helpful queries for fixing issues:

-- List all managers for reference
SELECT '📌 MANAGER REFERENCE LIST' as info;
SELECT id, email, full_name, created_at 
FROM users 
WHERE role = 'manager' 
ORDER BY created_at;
