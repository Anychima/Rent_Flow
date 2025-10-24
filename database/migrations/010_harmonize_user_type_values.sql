-- ============================================================
-- HARMONIZE DATABASE NAMING: property_manager → manager
-- ============================================================
-- This migration ensures consistency between role and user_type
-- All references to 'property_manager' are changed to 'manager'
-- ============================================================

-- Step 1: Drop the old CHECK constraint on user_type
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_user_type_check;

-- Step 2: Drop the old CHECK constraint on role (if it has property_manager)
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 3: Update existing data FIRST (before adding new constraints)
-- This prevents "check constraint is violated by some row" error
UPDATE public.users 
SET user_type = 'manager' 
WHERE user_type = 'property_manager';

UPDATE public.users 
SET role = 'manager' 
WHERE role = 'property_manager';

-- Step 4: NOW add new CHECK constraint for user_type (after data is clean)
ALTER TABLE public.users 
ADD CONSTRAINT users_user_type_check 
CHECK (user_type IN ('manager', 'tenant', 'prospective_tenant', 'ai_agent'));

-- Step 5: Add new CHECK constraint for role
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('manager', 'tenant', 'prospective_tenant', 'ai_agent'));

-- Step 6: Update the auth user sync function to ALWAYS keep role and user_type identical
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  normalized_role TEXT;
BEGIN
  -- Normalize the role value (convert property_manager → manager)
  normalized_role := CASE 
    WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'prospective_tenant') = 'property_manager' THEN 'manager'
    ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'prospective_tenant')
  END;

  -- Insert the new auth user into the public.users table
  -- CRITICAL: role and user_type MUST ALWAYS be the same
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    user_type,  -- ALWAYS same as role
    wallet_address,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    normalized_role,
    normalized_role,  -- ALWAYS same as role
    NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    role = EXCLUDED.role,
    user_type = EXCLUDED.role,  -- ALWAYS sync user_type with role
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Verify the changes
SELECT 
  'user_type values' as info,
  user_type,
  COUNT(*) as count
FROM public.users
GROUP BY user_type
ORDER BY user_type;

SELECT 
  'role values' as info,
  role,
  COUNT(*) as count
FROM public.users
GROUP BY role
ORDER BY role;

-- Step 8: Success message
SELECT '✅ Database naming harmonized!' AS status;
SELECT '✅ property_manager → manager in both role and user_type' AS change_1;
SELECT '✅ CHECK constraints updated' AS change_2;
SELECT '✅ Auth sync function updated' AS change_3;
SELECT '✅ All future users will use "manager" consistently' AS change_4;
