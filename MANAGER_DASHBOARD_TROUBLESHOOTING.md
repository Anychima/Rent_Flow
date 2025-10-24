# Manager Dashboard Troubleshooting Guide

## Problem
When logging in as manager@rentflow.ai, you see an old/blank dashboard instead of the new one with applications and chat.

## Root Cause Analysis
The dashboard code is CORRECT and already harmonized to use 'manager' role. The issue is likely one of:
1. Database has wrong role value for manager user
2. Backend is not running
3. Browser cache/session issue
4. API calls are failing

## Step-by-Step Fix

### Step 1: Verify Database Role ✅
Run this in Supabase SQL Editor:
```sql
SELECT email, role, user_type, is_active 
FROM public.users 
WHERE email = 'manager@rentflow.ai';
```

**Expected Result:**
```
email: manager@rentflow.ai
role: manager          ← MUST be 'manager', not 'property_manager'
user_type: manager     ← MUST be 'manager', not 'property_manager'
is_active: true
```

**If role is NOT 'manager':**
```sql
UPDATE public.users 
SET role = 'manager', user_type = 'manager' 
WHERE email = 'manager@rentflow.ai';
```

---

### Step 2: Check Backend is Running ✅
1. Open terminal in `c:\Users\olumbach\Documents\Rent_Flow`
2. Run: `cd backend`
3. Run: `npm run dev`

**Expected Output:**
```
🚀 Server running on http://localhost:3001
✅ Connected to Supabase
```

**If not running:** Start it before continuing!

---

### Step 3: Clear Browser Cache & Reload ✅
1. Open Chrome DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

OR

1. Press Ctrl+Shift+Delete
2. Select "Cached images and files"
3. Click "Clear data"
4. Reload the page

---

### Step 4: Check Browser Console Logs ✅
1. Open Chrome DevTools (F12)
2. Go to **Console** tab
3. Look for these logs when you log in:

**What you SHOULD see:**
```
🔍 [AuthContext] Fetching user profile...
✅ [AuthContext] User profile loaded!
   Role: manager
🔀 [App.tsx] Routing Decision for User:
   Profile Role: manager
✅ [App.tsx] Role is MANAGER - Showing Manager Dashboard
📊 [Dashboard] Starting data fetch...
✅ [Dashboard] Data fetch complete!
```

**What you should NOT see:**
```
❌ [AuthContext] Email lookup failed
❌ [Dashboard] Error fetching data
Failed to load resource: net::ERR_CONNECTION_REFUSED
```

---

### Step 5: Check Network Tab ✅
1. Open Chrome DevTools (F12)
2. Go to **Network** tab
3. Reload the page
4. Look for these API calls:

**Should see ALL these requests with status 200:**
- `GET http://localhost:3001/api/dashboard/stats`
- `GET http://localhost:3001/api/properties`
- `GET http://localhost:3001/api/applications`
- `GET http://localhost:3001/api/leases`
- `GET http://localhost:3001/api/payments`
- `GET http://localhost:3001/api/maintenance`

**If any show "Failed" or "pending":** Backend is not running!

---

### Step 6: Test the Applications Tab ✅
Once logged in:
1. Click on the **"applications"** tab in the top navigation
2. You should see all submitted applications
3. For approved applications, there should be:
   - 💬 **Chat** button
   - 📝 **Generate Lease** button

---

### Step 7: Test Chat Feature ✅
1. Go to applications tab
2. Find an approved application
3. Click 💬 **Chat** button
4. Send a test message
5. Check browser console for any errors

**Expected:** Message sends successfully without FK constraint errors

---

## Quick Diagnostic Commands

### Check if user exists in database:
```sql
SELECT * FROM public.users WHERE email = 'manager@rentflow.ai';
```

### Check if harmonization worked:
```sql
SELECT user_type, COUNT(*) 
FROM public.users 
GROUP BY user_type;
-- Should NOT show 'property_manager'
```

### Check applications:
```sql
SELECT id, status, applicant_id, property_id 
FROM public.property_applications 
LIMIT 5;
```

---

## Common Issues & Fixes

### Issue: Blank white screen
**Cause:** JavaScript error
**Fix:** Check browser console for errors

### Issue: "Loading..." never stops
**Cause:** Backend not running or API calls failing
**Fix:** Start backend with `npm run dev` in backend folder

### Issue: See old dashboard without applications tab
**Cause:** Browser cache
**Fix:** Hard reload (Ctrl+Shift+R)

### Issue: Applications tab shows but it's empty
**Cause:** No applications in database
**Fix:** Go to property listings and submit an application as a prospective tenant

### Issue: Chat button doesn't appear
**Cause:** Application status is not 'approved'
**Fix:** Approve an application first

---

## Expected Dashboard Features

The NEW dashboard should have:
✅ Top navigation with 8 tabs: dashboard, properties, applications, leases, payments, analytics, maintenance, notifications
✅ **Applications tab** showing all submitted applications
✅ AI analysis scores for each application
✅ Approve/Reject buttons for pending applications
✅ 💬 **Chat** button for approved applications
✅ 📝 **Generate Lease** button for approved applications
✅ Stats cards showing total properties, active leases, pending requests, total revenue

If you're missing ANY of these, the frontend code didn't load correctly.

---

## Next Steps After Verification

Once you verify the dashboard loads correctly:
1. ✅ Test approving an application
2. ✅ Test the chat feature
3. ✅ Test generating a lease
4. ✅ Test the complete workflow: browse → apply → approve → chat → lease

---

## Need Help?
If after following all steps the issue persists, provide:
1. Screenshot of browser console logs
2. Screenshot of Network tab showing API calls
3. Output of the database role check query
