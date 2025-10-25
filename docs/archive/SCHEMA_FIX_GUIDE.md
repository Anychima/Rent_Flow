# 🔧 Database Schema Fix Guide

## Issue Identified

The database schema uses `user_type` instead of `role` for user classification.

### Current Schema (schema.sql)
```sql
user_type TEXT NOT NULL CHECK (user_type IN ('property_manager', 'tenant', 'ai_agent'))
```

### What Application Expected
```typescript
role: 'manager' | 'tenant' | 'admin'
```

---

## ✅ Solution Options

### **Option 1: Run Migration (Recommended)**

This adds a `role` column while keeping `user_type` for backward compatibility.

#### **Step 1: Run the Migration**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New query**
3. Copy and paste the contents of: `database/migrations/005_add_role_column.sql`
4. Click **Run**

#### **What the Migration Does:**
- ✅ Adds `role` column to `users` table
- ✅ Syncs existing `user_type` values to `role`
- ✅ Creates trigger to keep both columns in sync
- ✅ Adds proper indexes and constraints
- ✅ Updates RLS policies

#### **Mapping:**
```
user_type              →  role
property_manager       →  manager
tenant                 →  tenant
ai_agent               →  ai_agent
```

---

### **Option 2: Update Schema Manually**

If you prefer manual approach:

```sql
-- Add role column
ALTER TABLE users ADD COLUMN role TEXT
    CHECK (role IN ('manager', 'tenant', 'admin', 'ai_agent'));

-- Populate role from user_type
UPDATE users
SET role = CASE 
    WHEN user_type = 'property_manager' THEN 'manager'
    WHEN user_type = 'tenant' THEN 'tenant'
    WHEN user_type = 'ai_agent' THEN 'ai_agent'
END;

-- Create index
CREATE INDEX idx_users_role ON users(role);
```

---

### **Option 3: Update Application to Use user_type**

Alternatively, update the application code to use `user_type`:

**Files to Update:**
1. `frontend/src/components/TenantPortal.tsx`
2. `backend/src/index.ts` (tenant portal endpoints)
3. All documentation files

**Changes:**
- Replace `role: 'manager'` with `user_type: 'property_manager'`
- Replace `role: 'tenant'` with `user_type: 'tenant'`

---

## 🎯 Recommended Approach

**Use Option 1** (Run Migration) because:
- ✅ Maintains backward compatibility
- ✅ Supports both `role` and `user_type`
- ✅ Auto-syncs values between columns
- ✅ No need to change application code
- ✅ Future-proof solution

---

## 📝 Updated Field Reference

After running the migration, the `users` table will have:

### **Core Fields**
```sql
id UUID PRIMARY KEY
wallet_address TEXT UNIQUE NOT NULL
email TEXT UNIQUE
full_name TEXT
phone TEXT
```

### **Role/Type Fields (Auto-Synced)**
```sql
user_type TEXT  -- Original: 'property_manager', 'tenant', 'ai_agent'
role TEXT       -- New: 'manager', 'tenant', 'admin', 'ai_agent'
```

### **Status Fields**
```sql
is_active BOOLEAN DEFAULT TRUE
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

## 🔐 Creating Users (Updated)

### **Manager Account**

**Via Supabase Dashboard:**
```
1. Authentication → Users → Add user
   Email: manager@rentflow.ai
   Password: RentFlow2024!
   ✅ Auto Confirm User

2. Table Editor → users → Insert row
   id: [UUID from auth]
   email: manager@rentflow.ai
   full_name: Demo Manager
   user_type: property_manager  ← Use this
   role: manager                ← Or this (both work!)
   is_active: true
```

**Via SQL:**
```sql
INSERT INTO users (id, email, full_name, user_type, wallet_address, is_active)
VALUES (
  'YOUR-UUID-HERE',
  'manager@rentflow.ai',
  'Demo Manager',
  'property_manager',  -- Will auto-sync to role='manager'
  '8kr6b3uuYx4MgvY8BW9ETogd3cc5ibTj3g8oVZCkKyiz',
  true
);
```

### **Tenant Account**

**Via Supabase Dashboard:**
```
1. Authentication → Users → Add user
   Email: tenant1@example.com
   Password: Tenant123!
   ✅ Auto Confirm User

2. Table Editor → users → Insert row
   id: [UUID from auth]
   email: tenant1@example.com
   full_name: John Doe
   user_type: tenant  ← Use this
   role: tenant       ← Or this (both work!)
   is_active: true
```

**Via SQL:**
```sql
INSERT INTO users (id, email, full_name, user_type, is_active)
VALUES (
  'YOUR-UUID-HERE',
  'tenant1@example.com',
  'John Doe',
  'tenant',  -- Will auto-sync to role='tenant'
  true
);
```

---

## 🧪 Testing the Fix

### **Step 1: Verify Migration**
```sql
-- Check if role column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'role';

-- Check sync trigger exists
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_name = 'sync_role_type_trigger';
```

### **Step 2: Test Auto-Sync**
```sql
-- Insert with user_type only
INSERT INTO users (id, email, full_name, user_type, wallet_address, is_active)
VALUES (
  uuid_generate_v4(),
  'test@example.com',
  'Test User',
  'property_manager',
  'test-wallet',
  true
);

-- Verify role was auto-populated
SELECT id, email, user_type, role FROM users WHERE email = 'test@example.com';
-- Expected: user_type='property_manager', role='manager'

-- Cleanup
DELETE FROM users WHERE email = 'test@example.com';
```

### **Step 3: Test Login**
1. Create manager account using either `user_type` or `role`
2. Login at http://localhost:3000
3. Access tenant portal
4. Verify authentication works

---

## 🆘 Troubleshooting

### **"Column 'role' does not exist"**
✅ Run the migration script in Supabase SQL Editor

### **"role values not syncing"**
✅ Check that the trigger `sync_role_type_trigger` exists:
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'sync_role_type_trigger';
```

### **"user_type constraint violation"**
✅ Make sure you're using valid values:
- `property_manager`, `tenant`, or `ai_agent`
- NOT `manager` for user_type (use `role` instead)

### **"Authentication failed"**
✅ Verify:
1. User exists in both `auth.users` and `public.users`
2. `is_active = true`
3. Email matches in both tables
4. RLS policies allow access

---

## 📊 Field Value Reference

| user_type (original) | role (new) | Description |
|---------------------|------------|-------------|
| property_manager    | manager    | Property manager/landlord |
| tenant              | tenant     | Tenant/renter |
| ai_agent            | ai_agent   | AI automation agent |
| -                   | admin      | System administrator |

---

## ✅ Quick Checklist

After applying the fix:

- [ ] Migration script executed successfully
- [ ] `role` column exists in `users` table
- [ ] Trigger `sync_role_type_trigger` is active
- [ ] Test user created with auto-sync working
- [ ] Manager account login works
- [ ] Tenant portal accessible
- [ ] Documentation updated

---

## 📞 Support

If issues persist:
1. Check Supabase logs for errors
2. Verify RLS policies are correct
3. Ensure both auth.users and public.users entries exist
4. Review browser console for frontend errors

---

**Migration file**: `database/migrations/005_add_role_column.sql`  
**Status**: Ready to apply  
**Risk**: Low (non-breaking change)
