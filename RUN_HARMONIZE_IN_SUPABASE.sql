-- ============================================================
-- RUN THIS IN SUPABASE: HARMONIZE property_manager → manager
-- ============================================================
-- This fixes all inconsistencies between property_manager and manager
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- Step 1: Drop old CHECK constraints FIRST
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_user_type_check;

ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Update existing data BEFORE adding new constraints
-- This prevents the "check constraint is violated by some row" error
UPDATE public.users 
SET user_type = 'manager' 
WHERE user_type = 'property_manager';

UPDATE public.users 
SET role = 'manager' 
WHERE role = 'property_manager';

-- Step 3: NOW add new CHECK constraints (after data is cleaned)
ALTER TABLE public.users 
ADD CONSTRAINT users_user_type_check 
CHECK (user_type IN ('manager', 'tenant', 'prospective_tenant', 'ai_agent'));

ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('manager', 'tenant', 'prospective_tenant', 'ai_agent'));

-- Step 4: Update the auth user sync function to use 'manager' consistently
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the new auth user into the public.users table
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    user_type,
    wallet_address,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    -- Use 'manager' instead of 'property_manager'
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'prospective_tenant') = 'property_manager' THEN 'manager'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'prospective_tenant')
    END,
    -- Same mapping for user_type
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'prospective_tenant') = 'property_manager' THEN 'manager'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'prospective_tenant')
    END,
    NULL, -- wallet_address can be added later
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    role = EXCLUDED.role,
    user_type = EXCLUDED.user_type,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Insert missing auth users (skip if they already exist by email or id)
INSERT INTO public.users (id, email, full_name, role, user_type, created_at, updated_at)
SELECT 
  '1d2c1a5d-1622-4f60-a6e2-ececa793233b'::uuid,
  'manager@rentflow.ai',
  'Manager',
  'manager',
  'manager',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.users 
  WHERE id = '1d2c1a5d-1622-4f60-a6e2-ececa793233b' 
     OR email = 'manager@rentflow.ai'
);

INSERT INTO public.users (id, email, full_name, role, user_type, created_at, updated_at)
SELECT 
  '3da5f183-68a8-459c-a3bb-50d2c99b8783'::uuid,
  'sarah.johnson@example.com',
  'Sarah Johnson',
  'prospective_tenant',
  'prospective_tenant',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.users 
  WHERE id = '3da5f183-68a8-459c-a3bb-50d2c99b8783' 
     OR email = 'sarah.johnson@example.com'
);

-- Step 6: Verify the changes
SELECT '=' as separator, '=' as separator2, '=' as separator3;
SELECT '📊 VERIFICATION RESULTS' as status;
SELECT '=' as separator, '=' as separator2, '=' as separator3;

-- Show user_type distribution
SELECT 
  'user_type values' as info,
  user_type,
  COUNT(*) as count
FROM public.users
GROUP BY user_type
ORDER BY user_type;

-- Show role distribution
SELECT 
  'role values' as info,
  role,
  COUNT(*) as count
FROM public.users
GROUP BY role
ORDER BY role;

-- Check for any mismatches
SELECT 
  'Consistency Check' as info,
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = user_type THEN 1 END) as consistent_users,
  COUNT(CASE WHEN role != user_type THEN 1 END) as mismatched_users
FROM public.users;

-- Show the target users (whether they existed or were just inserted)
SELECT 
  'Target Users Status' as info,
  email,
  role,
  user_type,
  CASE 
    WHEN created_at > NOW() - INTERVAL '10 seconds' THEN '✅ Just Inserted'
    ELSE '✅ Already Existed'
  END as status
FROM public.users
WHERE id IN ('1d2c1a5d-1622-4f60-a6e2-ececa793233b', '3da5f183-68a8-459c-a3bb-50d2c99b8783')
ORDER BY email;

-- Step 7: Success messages
SELECT '=' as separator, '=' as separator2, '=' as separator3;
SELECT '✅ Database naming harmonized!' AS status;
SELECT '✅ property_manager → manager in both role and user_type' AS change_1;
SELECT '✅ CHECK constraints updated' AS change_2;
SELECT '✅ Auth sync function updated' AS change_3;
SELECT '✅ Missing users inserted' AS change_4;
SELECT '✅ All future users will use "manager" consistently' AS change_5;
SELECT '=' as separator, '=' as separator2, '=' as separator3;
SELECT '🎉 CHAT SHOULD NOW WORK WITHOUT FK ERRORS!' as final_message;
SELECT '=' as separator, '=' as separator2, '=' as separator3;
