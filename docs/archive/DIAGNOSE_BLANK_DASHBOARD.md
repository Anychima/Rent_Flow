# Diagnosing Blank Manager Dashboard

## Problem
Manager sees blank dashboard when logging in as `manager@rentflow.ai`

## Root Cause Analysis

The app uses **role-based routing**:
- If `userProfile.role === 'tenant'` → Show TenantDashboard
- If `userProfile.role === 'prospective_tenant'` → Show PublicPropertyListings  
- Otherwise (including `role === 'manager'`) → Show Manager Dashboard

**Critical**: The user MUST have `role = 'manager'` in the database users table.

## Step 1: Check User Role in Database

Run this in **Supabase SQL Editor**:

```sql
SELECT 
    id,
    email,
    first_name,
    last_name,
    user_type,
    role,
    created_at
FROM users 
WHERE email = 'manager@rentflow.ai';
```

### Expected Output:
```
email: manager@rentflow.ai
user_type: property_manager  (old field)
role: manager                (MUST BE SET!)
```

### If role is NULL or wrong:
The user won't see the manager dashboard!

## Step 2: Fix User Role

If the role is NOT 'manager', run this:

```sql
-- Update specific user
UPDATE users 
SET role = 'manager'
WHERE email = 'manager@rentflow.ai';

-- Verify it worked
SELECT email, user_type, role 
FROM users 
WHERE email = 'manager@rentflow.ai';
```

## Step 3: Fix ALL Users with Wrong Roles

To ensure all users have correct roles:

```sql
-- Update all users based on user_type
UPDATE users 
SET role = CASE 
    WHEN user_type = 'property_manager' THEN 'manager'
    WHEN user_type = 'tenant' THEN 'tenant'
    ELSE 'prospective_tenant'
END
WHERE role IS NULL 
   OR role NOT IN ('manager', 'tenant', 'prospective_tenant', 'admin', 'ai_agent');

-- Verify all users
SELECT email, user_type, role 
FROM users 
ORDER BY email;
```

## Step 4: Check Browser Console

After fixing the database:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for these messages after login:

```
🔍 [AuthContext] Fetching user profile for Auth ID: ...
✅ [AuthContext] User profile loaded directly!
   ID: ...
   Email: manager@rentflow.ai
   Role: manager
🔀 Routing decision: manager
✅ Showing Manager Dashboard
```

### If you see:
- `Role: tenant` → Wrong role, run Step 2
- `Role: prospective_tenant` → Wrong role, run Step 2
- `Role: null` → Missing role, run Step 2
- `❌ Error loading profile` → User doesn't exist in users table

## Step 5: Verify Dashboard Data is Loading

Once the role is correct, check that data is fetching:

Open browser console and look for:
```
📋 Fetching all applications...
✅ Found X applications
```

Also check in the backend terminal for logs when the dashboard loads.

## Step 6: Hard Refresh Browser

After database fixes:

1. **Clear browser cache**: Ctrl + Shift + Delete
2. **Hard refresh**: Ctrl + Shift + R
3. **Sign out and sign in again**

## Common Issues and Fixes

### Issue 1: "Role is NULL"
**Fix**: Run the UPDATE query in Step 2

### Issue 2: "User not in database"
**Symptom**: User can login but profile loading fails
**Fix**: The user exists in Supabase Auth but not in the `users` table. You need to create the user record:

```sql
INSERT INTO users (
    id,  -- Use the Auth ID from console logs
    email,
    first_name,
    last_name,
    user_type,
    role,
    is_active
) VALUES (
    'AUTH_USER_ID_FROM_CONSOLE',  -- Get from browser console logs
    'manager@rentflow.ai',
    'Property',
    'Manager',
    'property_manager',
    'manager',
    true
);
```

### Issue 3: "Role is correct but still blank"
**Symptom**: Role = 'manager' but dashboard is empty
**Fix**: Check if endpoints are returning data:

```powershell
# Test in PowerShell
(Invoke-WebRequest -Uri "http://localhost:3001/api/dashboard/stats" -UseBasicParsing).Content
(Invoke-WebRequest -Uri "http://localhost:3001/api/properties" -UseBasicParsing).Content
(Invoke-WebRequest -Uri "http://localhost:3001/api/applications" -UseBasicParsing).Content
```

All should return `{"success":true,"data":...}`

## Quick Fix Script (Run in Supabase)

```sql
-- Check current state
SELECT email, user_type, role, '⚠️  BEFORE FIX' as status
FROM users 
WHERE email = 'manager@rentflow.ai';

-- Fix the role
UPDATE users 
SET role = 'manager'
WHERE email = 'manager@rentflow.ai';

-- Verify fix
SELECT email, user_type, role, '✅ AFTER FIX' as status
FROM users 
WHERE email = 'manager@rentflow.ai';
```

## Expected Flow After Fix

1. ✅ User logs in with manager@rentflow.ai
2. ✅ AuthContext fetches user profile from database
3. ✅ Profile has `role: 'manager'`
4. ✅ App shows Manager Dashboard (not tenant or prospective)
5. ✅ Dashboard fetches stats, properties, applications
6. ✅ Data displays in cards and tables

## Next Steps

1. **Run Step 1** to check the current role
2. **Run Step 2** if role is wrong
3. **Run Step 6** to refresh the browser
4. **Check browser console** for routing logs
5. **Report back** with the console logs if still having issues
