-- ============================================
-- FIX: Users Role and User Type Check Constraints
-- ============================================
-- Both role and user_type columns have CHECK constraints
-- that don't allow 'prospective_tenant'
-- This script updates both constraints
-- ============================================

-- Step 1: Drop the old constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;

-- Step 2: Add the correct constraint for role column
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('prospective_tenant', 'tenant', 'manager', 'admin', 'ai_agent'));

-- Step 3: Add the correct constraint for user_type column
ALTER TABLE users 
ADD CONSTRAINT users_user_type_check 
CHECK (user_type IN ('prospective_tenant', 'tenant', 'manager', 'admin', 'ai_agent'));

-- Step 4: Verify constraints were added
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
  AND conname IN ('users_role_check', 'users_user_type_check')
ORDER BY conname;

-- Step 4: Now insert the demo users
INSERT INTO users (id, email, full_name, user_type, role, phone, wallet_address, is_active)
VALUES 
    ('3da5f183-68a8-459c-a3bb-50d2c99b8783', 'sarah.johnson@example.com', 'Sarah Johnson', 'prospective_tenant', 'prospective_tenant', '+1-555-0101', 'DEMO_3da5f183', true),
    ('90853b6f-0f00-4249-873b-34c805f8a07b', 'michael.chen@example.com', 'Michael Chen', 'prospective_tenant', 'prospective_tenant', '+1-555-0102', 'DEMO_90853b6f', true),
    ('4c11f625-993f-4675-b3d8-fd7f785b4c4f', 'emily.rodriguez@example.com', 'Emily Rodriguez', 'prospective_tenant', 'prospective_tenant', '+1-555-0103', 'DEMO_4c11f625', true),
    ('273cc439-cf94-4c99-b013-23345842d103', 'james.williams@example.com', 'James Williams', 'prospective_tenant', 'prospective_tenant', '+1-555-0104', 'DEMO_273cc439', true),
    ('9d1af697-53b5-464f-ae88-42de01150edf', 'lisa.park@example.com', 'Lisa Park', 'prospective_tenant', 'prospective_tenant', '+1-555-0105', 'DEMO_9d1af697', true)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    user_type = EXCLUDED.user_type,
    phone = EXCLUDED.phone;

-- Step 5: Verify users were inserted
SELECT 
    email,
    full_name,
    role,
    '✅ User created/updated' as status
FROM users
WHERE email IN (
    'sarah.johnson@example.com',
    'michael.chen@example.com',
    'emily.rodriguez@example.com',
    'james.williams@example.com',
    'lisa.park@example.com'
);

-- ============================================
-- ALL DONE!
-- Now run DEMO_DATA_MANUAL.sql to create applications
-- ============================================
