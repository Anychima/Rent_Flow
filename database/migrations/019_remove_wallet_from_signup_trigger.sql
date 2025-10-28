-- ============================================
-- RentFlow: Remove Wallet Address from Signup Trigger
-- Date: 2025-10-28
-- Purpose: Fix signup issue by removing wallet address requirement
--          Arc wallets are created automatically AFTER user signup
-- ============================================

-- Update the trigger function to NOT require wallet_address during signup
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Extract role from metadata, default to 'prospective_tenant'
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::TEXT,
    'prospective_tenant'
  );
  
  -- Normalize role values (keep original values that are already valid)
  user_role := CASE user_role
    WHEN 'property_manager' THEN 'property_manager'
    WHEN 'manager' THEN 'manager'
    WHEN 'prospective_tenant' THEN 'prospective_tenant'
    WHEN 'tenant' THEN 'tenant'
    WHEN 'ai_agent' THEN 'ai_agent'
    ELSE 'prospective_tenant' -- Default fallback
  END;

  -- Insert into public.users table WITHOUT wallet_address
  -- Arc wallet will be created separately by backend after signup
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    user_type,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'full_name')::TEXT, ''),
    user_role,
    user_role, -- Keep user_type in sync with role
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    role = EXCLUDED.role,
    user_type = EXCLUDED.user_type,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth signup
    RAISE WARNING 'Error syncing user to public.users: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify
SELECT 'Signup trigger updated - wallet address no longer required!' AS status;
SELECT 'Arc wallets will be created automatically by backend after signup' AS note;
