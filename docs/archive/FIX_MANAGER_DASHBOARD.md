# 🔧 Fix Manager Dashboard Blank Screen

## Issue
When logging in as `manager@rentflow.ai`, the dashboard appears blank.

## Root Cause
The user's `role` field in the database is not set to `'manager'`, causing the app to either:
- Show the wrong dashboard (tenant or prospective tenant)
- Not load the manager dashboard properly

## ✅ Solution (3 Steps)

### **Step 1: Run SQL Fix in Supabase**

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Copy and paste the content from **`CHECK_USER_ROLE.sql`**
4. Run **STEP 1** first to check current state
5. If role is wrong, run **STEP 2** to fix it
6. Run **STEP 3** to verify

**Quick Fix (copy this)**:
```sql
-- Check current role
SELECT email, user_type, role 
FROM users 
WHERE email = 'manager@rentflow.ai';

-- Fix role if needed
UPDATE users 
SET role = 'manager'
WHERE email = 'manager@rentflow.ai';

-- Verify
SELECT email, user_type, role 
FROM users 
WHERE email = 'manager@rentflow.ai';
```

Expected result after fix:
```
email: manager@rentflow.ai
user_type: property_manager
role: manager  ✅
```

---

### **Step 2: Clear Browser Cache**

After running the SQL fix:

1. **Sign out** of the app
2. **Clear browser cache**: Press `Ctrl + Shift + Delete`
   - Select "Cached images and files"
   - Select "Cookies and other site data"
   - Click "Clear data"
3. **Close all browser tabs** for the app
4. **Reopen** the app in a new tab

---

### **Step 3: Verify Fix in Browser Console**

1. Open the app: `http://localhost:3000`
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Login as `manager@rentflow.ai`
5. Look for these logs:

**✅ SUCCESS - You should see:**
```
🔍 [AuthContext] Fetching user profile for Auth ID: ...
✅ [AuthContext] User profile loaded directly!
   Email: manager@rentflow.ai
   Role: manager
==================================================
🔀 [App.tsx] Routing Decision for User:
   Email: manager@rentflow.ai
   Profile Role: manager
==================================================
✅ [App.tsx] Role is MANAGER - Showing Manager Dashboard
```

**❌ PROBLEM - If you see:**
```
Profile Role: tenant
✅ [App.tsx] Role is TENANT - Showing TenantDashboard
```
→ Role is still wrong, go back to Step 1

```
Profile Role: prospective_tenant
✅ [App.tsx] Role is PROSPECTIVE_TENANT
```
→ Role is still wrong, go back to Step 1

```
Profile Role: null
```
→ Role is NULL, run Step 1 again

---

## 📊 Verify Dashboard is Working

After seeing the manager dashboard:

1. **Check the stats cards** at the top (should show numbers)
2. **Click different tabs** (Properties, Applications, Leases, etc.)
3. **Check browser console** for any errors
4. **Check backend terminal** for API request logs

**Expected backend logs when dashboard loads:**
```
📋 Fetching all applications...
✅ Found 0 applications
```

---

## 🐛 Troubleshooting

### Problem: "Still see blank screen after role fix"

**Check Network Tab:**
1. Press F12 → Go to "Network" tab
2. Refresh the page
3. Look for failed requests (red color)
4. Click on failed requests to see error details

**Common failed endpoints:**
- `/api/dashboard/stats` - Should return `{"success":true,"data":{...}}`
- `/api/properties` - Should return `{"success":true,"data":[...]}`
- `/api/applications` - Should return `{"success":true,"data":[...]}`

### Problem: "Endpoints returning errors"

**Check backend terminal:**
- Look for error messages when you load the dashboard
- Backend should show logs like:
  ```
  📋 Fetching all applications...
  ✅ Found X applications
  ```

**If backend shows errors:**
- Restart backend: Stop (Ctrl+C) and run `npm run dev` in backend folder
- Check Supabase connection: Verify `.env` file has correct credentials

### Problem: "User profile not loading"

**Symptoms:**
```
❌ [AuthContext] Error from Supabase: ...
```

**Fixes:**
1. User doesn't exist in `users` table (only in Auth):
   ```sql
   -- Check if user exists
   SELECT COUNT(*) FROM users WHERE email = 'manager@rentflow.ai';
   
   -- If count is 0, user doesn't exist - need to create
   ```

2. Get the Auth ID from console logs:
   ```
   🔍 [AuthContext] Fetching user profile for Auth ID: abc-123-xyz
   ```

3. Create user record:
   ```sql
   INSERT INTO users (
       id,
       email,
       first_name,
       last_name,
       user_type,
       role,
       is_active
   ) VALUES (
       'abc-123-xyz',  -- Auth ID from console
       'manager@rentflow.ai',
       'Property',
       'Manager',
       'property_manager',
       'manager',
       true
   );
   ```

---

## 🎯 Quick Checklist

- [ ] Run SQL to fix role in Supabase
- [ ] Verify role = 'manager' in database
- [ ] Clear browser cache and cookies
- [ ] Sign out and sign back in
- [ ] Check browser console for routing logs
- [ ] Verify "Showing Manager Dashboard" message
- [ ] Check stats cards display numbers
- [ ] Test clicking different tabs
- [ ] Check backend terminal for API logs

---

## 📁 Related Files

- **`CHECK_USER_ROLE.sql`** - SQL script to check and fix user roles
- **`DIAGNOSE_BLANK_DASHBOARD.md`** - Detailed diagnostic guide
- **`frontend/src/App.tsx`** - Updated with better logging
- **`frontend/src/contexts/AuthContext.tsx`** - Handles user authentication

---

## ⚡ One-Liner Fix

If you just want the quickest fix, run this in Supabase SQL Editor:

```sql
UPDATE users SET role = 'manager' WHERE email = 'manager@rentflow.ai';
```

Then: Sign out → Clear cache (Ctrl+Shift+Delete) → Sign in again

---

## 🆘 Still Having Issues?

If the dashboard is still blank after all these steps:

1. **Take a screenshot** of the browser console
2. **Copy the console logs** (especially the routing decision logs)
3. **Copy any backend terminal errors**
4. **Share these** so we can diagnose further

The enhanced logging will show exactly what's happening!
