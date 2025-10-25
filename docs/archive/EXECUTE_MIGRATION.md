# ✅ Execute Database Migration - Quick Guide

## The migration SQL is ready to run! Here's how:

### Option 1: 🚀 One-Click Web Interface (RECOMMENDED - 30 seconds)

1. **Click this link** to open Supabase SQL Editor:
   👉 https://supabase.com/dashboard/project/saiceqyaootvkdenxbqx/sql/new

2. **Copy the SQL below** and paste it into the editor

3. **Click the green "Run" button**

4. **Done!** You'll see a success message confirming the migration

---

## 📋 SQL to Execute

```sql
-- Migration: Add 'role' column to users table for simplified role management
-- This provides backwards compatibility while maintaining the original user_type column

-- Add role column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role TEXT;
    END IF;
END $$;

-- Add check constraint for role values
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
        ALTER TABLE users ADD CONSTRAINT users_role_check 
            CHECK (role IN ('manager', 'tenant', 'admin', 'ai_agent'));
    END IF;
END $$;

-- Sync existing user_type values to role column
UPDATE users
SET role = CASE 
    WHEN user_type = 'property_manager' THEN 'manager'
    WHEN user_type = 'tenant' THEN 'tenant'
    WHEN user_type = 'ai_agent' THEN 'ai_agent'
    ELSE 'tenant'
END
WHERE role IS NULL;

-- Create trigger to keep role and user_type in sync
CREATE OR REPLACE FUNCTION sync_user_role_type()
RETURNS TRIGGER AS $$
BEGIN
    -- When role is set, update user_type
    IF NEW.role IS NOT NULL AND NEW.role != OLD.role THEN
        NEW.user_type = CASE 
            WHEN NEW.role = 'manager' OR NEW.role = 'admin' THEN 'property_manager'
            WHEN NEW.role = 'tenant' THEN 'tenant'
            WHEN NEW.role = 'ai_agent' THEN 'ai_agent'
            ELSE 'tenant'
        END;
    END IF;
    
    -- When user_type is set, update role
    IF NEW.user_type IS NOT NULL AND NEW.user_type != OLD.user_type THEN
        NEW.role = CASE 
            WHEN NEW.user_type = 'property_manager' THEN 'manager'
            WHEN NEW.user_type = 'tenant' THEN 'tenant'
            WHEN NEW.user_type = 'ai_agent' THEN 'ai_agent'
            ELSE 'tenant'
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sync_role_type_trigger ON users;
CREATE TRIGGER sync_role_type_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_role_type();

-- Add index on role column for better query performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Update RLS policy to work with both role and user_type
DROP POLICY IF EXISTS "Managers can view all users" ON users;
CREATE POLICY "Managers can view all users" ON users
    FOR SELECT
    USING (
        (role = 'manager' OR role = 'admin' OR user_type = 'property_manager')
        OR auth.uid()::text = id::text
    );

-- Comments
COMMENT ON COLUMN users.role IS 'Simplified role field: manager, tenant, admin, ai_agent (synced with user_type)';

-- Display migration complete message
DO $$
BEGIN
    RAISE NOTICE 'Migration complete: role column added and synced with user_type';
END $$;
```

---

## ✅ What This Migration Does

1. **Adds `role` column** to the users table
2. **Syncs values** with existing `user_type` column:
   - `property_manager` → `manager`
   - `tenant` → `tenant`
   - `ai_agent` → `ai_agent`
3. **Creates auto-sync trigger** so both columns stay in sync
4. **Updates RLS policies** to work with both columns
5. **Adds performance index** on the role column

---

## 🔍 Verify Migration Success

After running the migration, you should see:

```
✅ SUCCESS
Migration complete: role column added and synced with user_type
```

---

## 🆘 Need Help?

If you see any errors:
1. Check that you're logged into Supabase
2. Make sure you're on the correct project (saiceqyaootvkdenxbqx)
3. Copy the error message and let me know

---

## 🔐 Alternative: Add Service Role Key (Optional)

If you want to run migrations automatically in the future:

1. Go to: https://supabase.com/dashboard/project/saiceqyaootvkdenxbqx/settings/api
2. Copy the "service_role" key (NOT the anon key)
3. Add to `.env` file:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
4. Then you can run: `npm run migrate:db`

---

**This migration is safe to run** - it has safety checks to prevent duplicate columns or errors if already executed.
