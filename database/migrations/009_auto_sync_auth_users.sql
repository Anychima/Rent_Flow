-- Auto-Sync Auth Users to Users Table
-- This creates a trigger that automatically inserts users into the users table when they sign up

-- Step 1: Make wallet_address nullable (since auth users may not have wallets initially)
ALTER TABLE public.users 
ALTER COLUMN wallet_address DROP NOT NULL;

-- Step 2: Make user_type nullable or provide default (legacy column)
ALTER TABLE public.users 
ALTER COLUMN user_type DROP NOT NULL;

-- Step 3: Add role column if it doesn't exist (new role system)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'prospective_tenant' 
CHECK (role IN ('manager', 'tenant', 'prospective_tenant', 'ai_agent'));

-- Step 4: Create function to handle new user creation
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
    COALESCE(NEW.raw_user_meta_data->>'role', 'prospective_tenant'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'prospective_tenant'), -- Map role to user_type
    NULL, -- wallet_address can be added later
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    role = COALESCE(EXCLUDED.role, users.role),
    user_type = COALESCE(EXCLUDED.user_type, users.user_type),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Backfill existing auth users into users table
-- Only insert new users that don't already exist (check by both ID and email to avoid all conflicts)
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
SELECT 
  a.id,
  a.email,
  COALESCE(a.raw_user_meta_data->>'full_name', a.email) as full_name,
  COALESCE(a.raw_user_meta_data->>'role', 'prospective_tenant') as role,
  COALESCE(a.raw_user_meta_data->>'role', 'prospective_tenant') as user_type,
  NULL as wallet_address,
  a.created_at,
  a.updated_at
FROM auth.users AS a
WHERE NOT EXISTS (
  SELECT 1 FROM public.users AS u 
  WHERE u.id = a.id OR u.email = a.email
);

-- Step 6: Verify the sync worked
SELECT 
  'Auth Users' as source,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'Public Users' as source,
  COUNT(*) as count
FROM public.users;

-- Success message
SELECT '✅ Auth users are now automatically synced to users table!' AS status;
SELECT '✅ Existing auth users have been backfilled!' AS backfill_status;
SELECT '✅ All future signups will automatically create user records!' AS future_status;
