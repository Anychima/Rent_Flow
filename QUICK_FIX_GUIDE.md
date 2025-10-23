# 🚨 Quick Fix Guide - Loading Timeout Issue

## Current Status
You're seeing the "Loading Timeout" screen. This happens when the profile takes longer than 10 seconds to load.

## Immediate Solutions

### Solution 1: Hard Refresh (Recommended)
**In your browser:**
1. Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. This clears the cache and forces a fresh load
3. Try logging in again

### Solution 2: Clear Browser Data
1. Press `F12` to open DevTools
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Clear storage** or **Clear site data**
4. Close DevTools
5. Refresh the page

### Solution 3: Try Incognito/Private Mode
1. Open a new incognito/private window
2. Go to `http://localhost:3000`
3. Login as John Doe

## What Changed (To Fix the Issue)

### ✅ Reduced Timeouts
- **AuthContext:** 10s → **5s** (profile fetch timeout)
- **App.tsx:** 15s → **10s** (total loading timeout)
- Faster feedback when something is stuck

### ✅ Better Error Recovery
- TenantDashboard now retries after 1 second if profile isn't ready
- Added "Reload" button on loading screen
- Better cleanup when component unmounts

### ✅ Improved Dependency Tracking
- Fixed `useEffect` dependency arrays
- Prevents infinite re-render loops
- Only triggers when user ID actually changes

## Debugging Steps

### Step 1: Check Console (F12)
Look for these logs:

**Good Flow:**
```
🔍 [AuthContext] Fetching user profile for Auth ID: d296410e-...
⚠️  [AuthContext] Direct ID lookup failed
🔄 [AuthContext] Attempting email fallback...
📧 [AuthContext] Looking up by email: john.doe@email.com
✅ [AuthContext] Found user by email!
   💾 DB ID: a0000000-...
```

**Bad Flow (Timeout):**
```
🔍 [AuthContext] Fetching user profile for Auth ID: d296410e-...
⚠️  [AuthContext] Direct ID lookup failed
🔄 [AuthContext] Attempting email fallback...
⚠️  [AuthContext] Profile fetch timeout after 5s
```

### Step 2: Check Network Tab (F12)
1. Open DevTools → **Network** tab
2. Filter by **Fetch/XHR**
3. Look for requests to Supabase:
   - `https://saiceqyaootvkdenxbqx.supabase.co/rest/v1/users`
4. Check if requests are:
   - ✅ **Completing** (status 200)
   - ❌ **Pending** (stuck/hanging)
   - ❌ **Failed** (red, status 500/404)

### Step 3: Test Supabase Connection
Run this in the browser console (F12 → Console):
```javascript
fetch('https://saiceqyaootvkdenxbqx.supabase.co/rest/v1/users?email=eq.john.doe@email.com', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhaWNlcXlhb290dmtkZW54YnF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNjI4OTIsImV4cCI6MjA3NjYzODg5Mn0.0-tzD08uhq6CSHolgxwkv-fx9542p_xn6betmJn7yqI'
  }
})
.then(r => r.json())
.then(d => console.log('✅ Supabase working:', d))
.catch(e => console.error('❌ Supabase error:', e));
```

## Common Issues & Fixes

### Issue: "Loading Timeout" every time
**Cause:** Supabase connection is slow or blocked
**Fix:**
1. Check internet connection
2. Try disabling VPN/proxy
3. Check if Supabase is down: https://status.supabase.com

### Issue: Works in one browser, not another
**Cause:** Cached auth state or CORS issues
**Fix:**
1. Clear all browser data for localhost
2. Use incognito mode
3. Try a different browser

### Issue: Infinite spinning after login
**Cause:** Profile fetch is stuck
**Fix:**
1. Check console for error messages
2. Verify Supabase credentials in `.env`
3. Test direct Supabase query (see Step 3 above)

### Issue: "Profile Load Failed"
**Cause:** User exists in Auth but not in database
**Fix:**
Run this SQL in Supabase SQL Editor:
```sql
-- Check if user exists in database
SELECT * FROM users WHERE email = 'john.doe@email.com';

-- If no results, the user needs to be created in the database
-- This might happen if Auth and DB are out of sync
```

## Recovery Actions

### Option A: Force Reload Everything
```bash
# In your terminal
npm run dev
```
Then hard refresh browser (Ctrl+Shift+R)

### Option B: Clear All State
1. Sign out (if you can access the app)
2. Clear browser data
3. Reload page
4. Login again

### Option C: Reset Auth Session
Run in browser console:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

## Files Modified (In This Fix)

1. **frontend/src/contexts/AuthContext.tsx**
   - Reduced timeout: 10s → 5s
   
2. **frontend/src/App.tsx**
   - Reduced timeout: 15s → 10s
   
3. **frontend/src/components/TenantDashboard.tsx**
   - Added retry logic
   - Added reload button on loading screen
   - Fixed dependency array

## Expected Behavior After Fix

### Normal Flow (2-5 seconds):
1. "Loading RentFlow AI..." (2s)
2. Email fallback succeeds (1-2s)
3. Dashboard loads (1-2s)
4. **Total: 4-6 seconds**

### Slow Network (5-10 seconds):
1. "Loading RentFlow AI..." (3s)
2. Email fallback timeout (5s)
3. Shows "Profile Load Failed" screen
4. User can try again or sign out

### Complete Failure (10+ seconds):
1. "Loading RentFlow AI..." stuck
2. Safety timeout triggers (10s)
3. Shows "Loading Timeout" screen
4. User can reload

## Still Not Working?

If you're still seeing the timeout screen:

1. **Check backend is running:**
   ```
   Backend should show: ✅ OpenAI service initialized
   ```

2. **Check Supabase status:**
   Visit: https://status.supabase.com
   
3. **Try different user:**
   Instead of john.doe@email.com, try admin account

4. **Check .env file:**
   ```
   REACT_APP_SUPABASE_URL=https://saiceqyaootvkdenxbqx.supabase.co
   REACT_APP_SUPABASE_KEY=eyJh... (should be there)
   ```

5. **Restart development server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

## Contact Points

If none of this works, please provide:
1. Screenshot of browser console (F12)
2. Screenshot of Network tab showing failed requests
3. Any error messages you see

---

**Status:** ✅ Timeouts reduced, retry logic added, better error handling

*The app should now load faster and provide better feedback!*
