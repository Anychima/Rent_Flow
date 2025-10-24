# 🔧 Database Harmonization Guide

## Problem
The database had inconsistent naming between `property_manager` and `manager` across different parts of the schema, causing foreign key constraint violations and user sync issues.

## Solution
A comprehensive migration that harmonizes all naming to use `manager` consistently.

---

## ✅ What This Migration Does

### 1. **Updates CHECK Constraints**
- Changes `user_type` constraint from accepting `'property_manager'` to `'manager'`
- Ensures `role` constraint also uses `'manager'` consistently
- Both columns now accept: `'manager'`, `'tenant'`, `'prospective_tenant'`, `'ai_agent'`

### 2. **Updates Existing Data**
```sql
UPDATE public.users 
SET user_type = 'manager' 
WHERE user_type = 'property_manager';

UPDATE public.users 
SET role = 'manager' 
WHERE role = 'property_manager';
```

### 3. **Updates Auth Sync Function**
- The `handle_new_user()` trigger function now automatically converts `'property_manager'` → `'manager'`
- All future user signups will use `'manager'` consistently

---

## 📋 How to Run This Migration

### **Step 1: Open Supabase SQL Editor**
1. Go to your Supabase dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### **Step 2: Run the Harmonization Migration**
Copy and paste the contents of:
```
database/migrations/010_harmonize_user_type_values.sql
```

Or run it directly from this file (see below).

### **Step 3: Verify Success**
After running, you should see:
- ✅ Database naming harmonized!
- ✅ property_manager → manager in both role and user_type
- ✅ CHECK constraints updated
- ✅ Auth sync function updated
- ✅ All future users will use "manager" consistently

Plus two tables showing the current distribution of `user_type` and `role` values.

---

## 🎯 Expected Results

### Before Migration:
```
user_type values:
- property_manager: 1
- tenant: 2
- prospective_tenant: 3

role values:
- manager: 1
- tenant: 2
- prospective_tenant: 3
```

### After Migration:
```
user_type values:
- manager: 1          ← Changed from property_manager
- tenant: 2
- prospective_tenant: 3

role values:
- manager: 1
- tenant: 2
- prospective_tenant: 3
```

---

## 🔍 What Changed in Each File

### 1. **`010_harmonize_user_type_values.sql`** (MAIN MIGRATION)
- Comprehensive migration that fixes everything
- Updates both CHECK constraints
- Updates existing data
- Updates auth sync function
- Includes verification queries

### 2. **`FIX_ROLE_CONSTRAINT.sql`**
- Updated to use `'manager'` instead of `'property_manager'`
- Now consistent with the harmonized naming

### 3. **Auth Sync Function** (`handle_new_user()`)
- Now includes case statement to convert `property_manager` → `manager`
- Applies to both `role` and `user_type` columns
- Ensures future consistency

---

## 🧪 How to Test After Migration

### Test 1: Check Existing Users
```sql
SELECT 
  email,
  role,
  user_type,
  CASE 
    WHEN role = user_type THEN '✅ Consistent'
    ELSE '⚠️ Mismatch'
  END as status
FROM public.users
ORDER BY email;
```

**Expected**: All users should show ✅ Consistent

### Test 2: Insert New Manager User
```sql
INSERT INTO public.users (
  id, email, full_name, role, user_type, created_at, updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000999',
  'test.manager@example.com',
  'Test Manager',
  'manager',
  'manager',
  NOW(),
  NOW()
);
```

**Expected**: Should insert successfully without errors

### Test 3: Try the Chat Feature
1. Log in as manager@rentflow.ai
2. Approve an application
3. Click the 💬 Chat button
4. Send a message

**Expected**: Message should send successfully without FK constraint errors

---

## 🚨 Troubleshooting

### Error: "duplicate key value violates unique constraint"
**Solution**: The user already exists. Use `ON CONFLICT` or check existing users first.

### Error: "violates check constraint"
**Solution**: Make sure you've run the migration that updates the CHECK constraints first.

### Error: "foreign key constraint violation"
**Solution**: This means the auth user doesn't exist in `public.users`. Run migration `009_auto_sync_auth_users.sql` first.

---

## 📝 Summary of Changes

| Component | Before | After |
|-----------|--------|-------|
| user_type CHECK | `'property_manager'` | `'manager'` |
| role CHECK | `'manager'` | `'manager'` ✅ |
| Existing user_type data | `'property_manager'` | `'manager'` |
| Existing role data | `'manager'` | `'manager'` ✅ |
| Auth sync function | Didn't convert | Converts `property_manager` → `manager` |

---

## ✨ Benefits

1. **Consistency**: Same naming across all tables and columns
2. **No More FK Errors**: Auth users will sync properly
3. **Future-Proof**: All new users will use harmonized naming
4. **Chat Works**: Messages table FK constraints will be satisfied
5. **Cleaner Code**: Frontend and backend can use one term: `'manager'`

---

## 🎬 Ready to Run?

Copy the SQL below and paste it into your Supabase SQL Editor:

\`\`\`sql
-- Run this entire block in Supabase SQL Editor
```

