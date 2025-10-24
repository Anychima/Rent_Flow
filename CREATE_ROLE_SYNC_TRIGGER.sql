-- ============================================================
-- ENFORCE ROLE AND USER_TYPE SYNC WITH TRIGGER
-- ============================================================
-- This creates a trigger that AUTOMATICALLY keeps role and user_type
-- synchronized whenever either column is updated
-- ============================================================

-- Step 1: Create function to sync role and user_type
CREATE OR REPLACE FUNCTION public.sync_role_and_user_type()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is being updated, sync user_type to match
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.user_type := NEW.role;
  END IF;
  
  -- If user_type is being updated, sync role to match  
  IF NEW.user_type IS DISTINCT FROM OLD.user_type THEN
    NEW.role := NEW.user_type;
  END IF;
  
  -- Ensure they're always the same
  IF NEW.role != NEW.user_type THEN
    NEW.user_type := NEW.role;  -- role is source of truth
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger that fires BEFORE UPDATE
DROP TRIGGER IF EXISTS sync_role_user_type_trigger ON public.users;
CREATE TRIGGER sync_role_user_type_trigger
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_and_user_type();

-- Step 3: Verify trigger was created
SELECT 
  '✅ Trigger Created' as status,
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'sync_role_user_type_trigger'
  AND event_object_table = 'users';

-- Success message
SELECT '=' as separator;
SELECT '🎉 ROLE/USER_TYPE SYNC TRIGGER INSTALLED!' as status;
SELECT '=' as separator;
SELECT '✅ role and user_type will now ALWAYS stay synchronized' as benefit_1;
SELECT '✅ Any UPDATE to either field will automatically update the other' as benefit_2;
SELECT '✅ Manual mismatches are now impossible' as benefit_3;
SELECT '=' as separator;
