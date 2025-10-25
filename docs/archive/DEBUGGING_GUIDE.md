# 🐛 Debugging Guide - Tenant Portal Issues

## Issues Reported
1. ❌ **Payments not showing** for John Doe
2. ❌ **Submit button for maintenance** does not work

## Root Cause Analysis

### 🔍 Investigation Results

**Backend Test:** ✅ WORKING
```bash
npm run test:tenant-features
```
Results:
- ✅ Found John Doe in database (ID: a0000000-0000-0000-0000-000000000003)
- ✅ Active lease found
- ✅ 2 payments found in database
- ✅ 4 maintenance requests found
- ✅ Maintenance request creation works

**API Test:** ⚠️ ID MISMATCH PROBLEM
- ✅ API with DB ID works: `/api/tenant/a0000000-0000-0000-0000-000000000003/dashboard` → Returns 2 payments
- ❌ API with Auth ID fails: `/api/tenant/d296410e-35db-498c-8949-93c5332d3034/dashboard` → 500 error

### 🎯 The Problem

**Auth ID ≠ Database ID**
- Auth System ID: `d296410e-35db-498c-8949-93c5332d3034`
- Database User ID: `a0000000-0000-0000-0000-000000000003`

The frontend was using the Auth ID, but all database records are linked to the DB ID.

### ✅ The Solution

**Email Fallback Lookup** - Already implemented in AuthContext:
1. Try to fetch user by Auth ID
2. If fails, fetch by email instead
3. Return the database user profile (with DB ID)
4. Frontend uses `userProfile.id` (which is now the DB ID)

## 🔧 Fixes Applied

### 1. Enhanced Logging

**AuthContext.tsx** - Added detailed logging:
```typescript
✅ [AuthContext] Found user by email!
   🎯 Auth ID: d296410e-35db-498c-8949-93c5332d3034
   💾 DB ID: a0000000-0000-0000-0000-000000000003
   👤 Email: john.doe@email.com
   🎭 Role: tenant
```

**TenantDashboard.tsx** - Added comprehensive logging:
```typescript
🔍 Fetching dashboard for tenant: john.doe@email.com
📍 API URL: http://localhost:3001/api/tenant/[ID]/dashboard
📡 Response status: 200 OK
📊 Dashboard API response: { success: true, ... }
✅ Dashboard data set:
   - Lease: Active (Modern Downtown Apartment)
   - Maintenance Requests: 4
   - Payments: 2
💳 Payment details:
   1. 2500 USDC - rent (completed)
   2. 2500 USDC - rent (completed)
```

### 2. Added Error Alerts

- User-friendly error messages for all failures
- Network error handling
- Validation error messages
- Loading state indicators

## 📋 Testing Instructions

### Step 1: Check Browser Console

1. Open browser (the preview should auto-reload)
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Login as John Doe

### Step 2: Look for These Logs

**On Login:**
```
🔍 [AuthContext] Fetching user profile for Auth ID: d296410e-...
⚠️  [AuthContext] Direct ID lookup failed: ...
🔄 [AuthContext] Attempting email fallback...
📧 [AuthContext] Looking up by email: john.doe@email.com
✅ [AuthContext] Found user by email!
   🎯 Auth ID: d296410e-...
   💾 DB ID: a0000000-...
   👤 Email: john.doe@email.com
   🎭 Role: tenant
```

**On Dashboard Load:**
```
🔍 Fetching dashboard for tenant: john.doe@email.com ID: a0000000-...
📍 API URL: http://localhost:3001/api/tenant/a0000000-.../dashboard
📡 Response status: 200 OK
📊 Dashboard API response: { success: true, data: {...} }
✅ Dashboard data set:
   - Lease: Active (Modern Downtown Apartment)
   - Maintenance Requests: 4
   - Payments: 2
💳 Payment details:
   1. 2500 USDC - rent (completed)
   2. 2500 USDC - rent (completed)
```

### Step 3: Test Maintenance Submission

1. Go to **Maintenance** tab
2. Click **"+ New Request"**
3. Fill in the form:
   - Title: "Test Request"
   - Description: "Testing submission"
   - Category: any
   - Priority: any
4. Click **"Submit Request"**

**Expected Console Logs:**
```
📝 Submitting maintenance request: { title: "Test Request", ... }
📥 Maintenance submission result: { success: true, ... }
```

**Expected Alert:**
```
✅ Maintenance request submitted successfully!

Your request has been sent to the property manager.
```

### Step 4: Verify Payments Display

1. Go to **Payments** tab
2. Should see 2 completed payments

**Expected Display:**
```
2500 USDC - rent (Completed)
Due: October 1, 2025
Paid: [date]

2500 USDC - rent (Completed)
Due: September 1, 2025
Paid: [date]
```

## 🚨 If Still Not Working

### Check 1: Verify Email Fallback Worked
Look for this in console:
```
✅ [AuthContext] Found user by email!
   💾 DB ID: a0000000-0000-0000-0000-000000000003
```

If you see:
```
❌ [AuthContext] Email lookup also failed
```

Then there's a database connection issue.

### Check 2: Verify Dashboard API Call
Look for:
```
📍 API URL: http://localhost:3001/api/tenant/a0000000-.../dashboard
```

The ID should be `a0000000-...` (DB ID), NOT `d296410e-...` (Auth ID)

### Check 3: Check API Response
Look for:
```
✅ Dashboard data set:
   - Payments: 2
```

If it says `Payments: 0`, the backend isn't returning data.

### Check 4: Network Errors
In console, look for:
```
❌ Error fetching dashboard: ...
```

This indicates a network/CORS/backend issue.

## 🔧 Quick Fixes

### If No Payments Show But Console Says "Payments: 2"

**Issue:** React state not updating
**Fix:** Force refresh
```bash
# In browser
Ctrl + Shift + R (hard refresh)
```

### If Maintenance Submit Doesn't Work

**Check Console For:**
```
📝 Submitting maintenance request: ...
```

**If you see:**
```
❌ You must have an active lease to submit maintenance requests.
```
Then the lease data isn't loading.

**If button is disabled:**
- Check if form fields are empty
- Button is disabled when title or description is empty

### If Getting 500 Errors

**Check Backend Logs:**
```
[0] ❌ Error fetching tenant dashboard: ...
```

**Verify Backend is Using Correct Schema:**
- Should use `requested_by` not `requestor_id`
- Should use `rent_payments` not `payments`

## 📊 Backend Verification

Run this to verify backend data:
```bash
npm run test:tenant-features
```

Should show:
```
✅ Found 2 payment(s)
✅ Found 4 maintenance request(s)
```

## 🎯 Expected Behavior

### After Login
1. AuthContext fetches user by email fallback
2. Gets DB ID: `a0000000-...`
3. TenantDashboard uses DB ID for API calls
4. All data loads correctly

### Maintenance Submission
1. Click "+ New Request" → Form opens
2. Fill form → Submit button enables
3. Click Submit → Loading state
4. Success → Alert + form closes + list refreshes

### Payment Display
1. Navigate to Payments tab
2. See 2 completed payments
3. Each shows amount, type, dates, status
4. No "Pay Now" buttons (already completed)

## 📝 Files Modified

1. **frontend/src/contexts/AuthContext.tsx** - Enhanced logging
2. **frontend/src/components/TenantDashboard.tsx** - Enhanced logging + error handling
3. **backend/src/index.ts** - Fixed schema column names
4. **scripts/test-dashboard-api.ts** - Created API test script

## ✅ Success Criteria

- [ ] Console shows email fallback success
- [ ] Console shows DB ID being used (a0000000-...)
- [ ] Console shows 2 payments found
- [ ] Payments tab displays 2 payments
- [ ] Maintenance form opens on click
- [ ] Maintenance submission works and shows success alert
- [ ] New maintenance request appears in list

---

**Status:** 🔧 Enhanced logging added, ready for browser testing

*Next: Open browser, check console, verify email fallback is working*
