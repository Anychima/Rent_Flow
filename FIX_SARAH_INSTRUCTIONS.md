# Fix for Sarah Johnson's Account - Complete Solution

## 🔍 Problem
Sarah Johnson (sarah.johnson@example.com) has signed a lease but is still seeing the prospective tenant dashboard instead of the tenant dashboard.

## 🎯 Root Cause
The user's role in the database is still `prospective_tenant` even though the lease is signed. This can happen if:
1. The lease was signed before the auto-activation feature was implemented
2. The auto-activation failed silently
3. The database trigger wasn't installed

## ✅ Complete Fix (3 Steps)

---

### Step 1: Run Database Fix Script

**Open Supabase SQL Editor** and run `FIX_SARAH_ACCOUNT.sql`:

This script will:
1. ✅ Check Sarah's current status
2. ✅ Force update her role to `tenant`
3. ✅ Activate the lease if it's only `fully_signed`
4. ✅ Verify the fix was successful

**Expected Output:**
```
✅ Successfully transitioned to tenant
🎉 SARAH JOHNSON SHOULD NOW SEE TENANT DASHBOARD!
```

---

### Step 2: Sarah Needs to Refresh Her Session

After running the database fix, Sarah has **3 options** to see the tenant dashboard:

#### Option A: Hard Refresh (Easiest)
1. Press `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
2. This forces a full page reload and refreshes the auth context

#### Option B: Logout and Login
1. Click logout
2. Login again with same credentials
3. Should now see tenant dashboard

#### Option C: Close and Reopen Browser
1. Close all browser tabs
2. Reopen browser
3. Go to the application
4. Login again

---

### Step 3: Verify the Fix

After Sarah refreshes/re-logs in, verify:

**Frontend Check:**
- ✅ She should see the **Tenant Dashboard**
- ✅ Navigation should show tenant-specific options
- ✅ Can access maintenance requests, payments, etc.

**Database Check (Run in Supabase):**
```sql
SELECT 
  email,
  role,
  user_type,
  (SELECT lease_status FROM leases WHERE tenant_id = users.id LIMIT 1) as lease_status
FROM users
WHERE email = 'sarah.johnson@example.com';
```

**Expected Result:**
```
email: sarah.johnson@example.com
role: tenant
user_type: tenant
lease_status: active
```

---

## 🚀 Future Prevention

The following updates have been made to prevent this issue in the future:

### 1. Auto-Activation in Backend ✅
**Location:** `backend/src/index.ts` lines 3145-3192

When both parties sign the lease:
- Lease automatically becomes `active`
- User role automatically transitions to `tenant`
- Backend returns `activated: true` flag

### 2. Profile Refresh in Frontend ✅
**Location:** `frontend/src/contexts/AuthContext.tsx`

New `refreshUserProfile()` function added:
- Forces profile reload from database
- Updates cached role in AuthContext
- Called automatically after activation

**Location:** `frontend/src/pages/LeaseSigningPage.tsx`

After signing:
- Detects `activated: true` flag
- Calls `refreshUserProfile()` to update role
- Redirects to tenant dashboard

### 3. Database Trigger (Run If Needed)
**Location:** `FIX_ROLE_TRANSITION_COMPLETE.sql`

Installs `sync_role_user_type_trigger`:
- Keeps `role` and `user_type` synchronized
- Prevents manual mismatches
- Ensures consistency

---

## 📋 Quick Reference Commands

### Check Sarah's Status
```sql
-- Run in Supabase SQL Editor
SELECT * FROM users WHERE email = 'sarah.johnson@example.com';
```

### Fix Sarah's Role
```sql
-- Run in Supabase SQL Editor (copy from FIX_SARAH_ACCOUNT.sql)
UPDATE users 
SET role = 'tenant', user_type = 'tenant', updated_at = NOW()
WHERE email = 'sarah.johnson@example.com';
```

### Verify Lease is Active
```sql
-- Run in Supabase SQL Editor
SELECT l.*, u.email, u.role 
FROM leases l
JOIN users u ON u.id = l.tenant_id
WHERE u.email = 'sarah.johnson@example.com';
```

---

## 🔧 Troubleshooting

### Issue: "Role updated but still seeing prospective dashboard"

**Solution:**
- Clear browser cache: `Ctrl + Shift + Delete`
- Clear localStorage: Open DevTools > Application > Local Storage > Clear All
- Hard refresh: `Ctrl + Shift + R`
- Logout and login again

### Issue: "Database update succeeded but role reverts back"

**Check:**
```sql
-- Check if trigger exists
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'sync_role_user_type_trigger';
```

**If no trigger found:**
Run `FIX_ROLE_TRANSITION_COMPLETE.sql` to install it

### Issue: "Frontend shows tenant but can't access tenant features"

**Check RLS Policies:**
```sql
-- Verify RLS policies for tenant role
SELECT * FROM pg_policies WHERE tablename = 'maintenance_requests';
SELECT * FROM pg_policies WHERE tablename = 'payments';
```

---

## ✅ Success Criteria

Sarah's account is fully fixed when:
1. ✅ Database shows `role = 'tenant'` and `user_type = 'tenant'`
2. ✅ Lease status is `active`
3. ✅ Frontend displays **Tenant Dashboard**
4. ✅ Can access all tenant features (maintenance, payments, etc.)
5. ✅ Navigation shows tenant-specific menu items

---

## 📞 If Issue Persists

If after all these steps Sarah still can't see the tenant dashboard:

1. Check browser console for errors (F12)
2. Check backend logs for auth errors
3. Verify Supabase RLS policies
4. Check if there are multiple user records with same email
5. Verify the lease is linked to the correct user ID

Run this diagnostic:
```sql
-- Full diagnostic for Sarah's account
SELECT 
  u.id,
  u.email,
  u.role,
  u.user_type,
  COUNT(l.id) as lease_count,
  array_agg(l.lease_status) as lease_statuses,
  array_agg(l.id) as lease_ids
FROM users u
LEFT JOIN leases l ON l.tenant_id = u.id
WHERE u.email = 'sarah.johnson@example.com'
GROUP BY u.id, u.email, u.role, u.user_type;
```

---

## 🎉 Summary

1. **Run:** `FIX_SARAH_ACCOUNT.sql` in Supabase
2. **Have Sarah:** Logout and login again (or hard refresh)
3. **Verify:** She sees tenant dashboard
4. **Prevent Future Issues:** Install sync trigger with `FIX_ROLE_TRANSITION_COMPLETE.sql`

That's it! Sarah should now have full tenant access. 🚀
