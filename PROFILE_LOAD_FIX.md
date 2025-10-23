# 🔧 Profile Load Failed - Root Cause & Fix

## Investigation Results

✅ **User exists in Supabase Auth** (ID: d296410e-35db-498c-8949-93c5332d3034)  
✅ **User exists in Database** (ID: a0000000-0000-0000-0000-000000000003)  
❌ **Profile fetch is FAILING** despite user existing

## Root Cause

The issue is likely one of these:

### 1. Row Level Security (RLS) Blocking the Query
- The `users` table has RLS enabled
- The policy might not allow users to read their own profile
- Auth ID ≠ Database ID causes the RLS policy to fail

### 2. API Key Permissions
- Using anon key which has limited permissions
- RLS policies check `auth.uid()` which returns Auth ID
- But database has different ID

### 3. CORS or Network Issue
- Query is timing out or being blocked
- Supabase API not responding

---

## Immediate Fix Options

### Option A: Disable RLS for users table (Quick Fix)

**In Supabase Dashboard:**
1. Go to Authentication → Policies
2. Find `users` table policies
3. Temporarily disable RLS or add policy:
   ```sql
   -- Allow users to read by email
   CREATE POLICY "Users can read own profile by email"
   ON users FOR SELECT
   USING (email = auth.jwt() ->> 'email');
   ```

### Option B: Use Service Role Key (Bypass RLS)

**Update frontend/.env:**
```env
# Use service role key instead of anon key (ONLY FOR DEVELOPMENT!)
REACT_APP_SUPABASE_KEY=<SUPABASE_SERVICE_ROLE_KEY>
```

⚠️ **WARNING:** Service role bypasses RLS. Only use in development!

### Option C: Fix the ID Mismatch

**Run this SQL in Supabase:**
```sql
-- Update database user ID to match Auth ID
UPDATE users 
SET id = 'd296410e-35db-498c-8949-93c5332d3034'
WHERE email = 'john.doe@email.com';

-- Also update related tables
UPDATE leases 
SET tenant_id = 'd296410e-35db-498c-8949-93c5332d3034'
WHERE tenant_id = 'a0000000-0000-0000-0000-000000000003';

UPDATE maintenance_requests
SET requested_by = 'd296410e-35db-498c-8949-93c5332d3034'
WHERE requested_by = 'a0000000-0000-0000-0000-000000000003';
```

### Option D: Add Better RLS Policy (RECOMMENDED)

**Run this SQL in Supabase:**
```sql
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view own data" ON users;

-- Create new policy that works with email lookup
CREATE POLICY "Users can read own profile"
ON users FOR SELECT
USING (
  -- Allow if ID matches
  auth.uid()::text = id::text
  OR
  -- Allow if email matches (for email fallback)
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
```

---

## Testing the Fix

### Step 1: Check Console Logs

Open browser console (F12) and look for:

```
🔍 [AuthContext] Fetching user profile for Auth ID: d296410e-...
⚠️  [AuthContext] Direct ID lookup failed: <ERROR MESSAGE>
   Error code: <CODE>
🔄 [AuthContext] Attempting email fallback...
📧 [AuthContext] Looking up by email: john.doe@email.com
❌ [AuthContext] Email lookup failed: <ERROR MESSAGE>
```

The error code and message will tell us exactly what's wrong.

### Step 2: Test Direct Supabase Query

Run in browser console:
```javascript
// Test if we can query users table
fetch('https://saiceqyaootvkdenxbqx.supabase.co/rest/v1/users?email=eq.john.doe@email.com', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
})
.then(r => r.json())
.then(d => console.log('Result:', d))
.catch(e => console.error('Error:', e));
```

---

## Most Likely Solution

Based on the symptoms, **Option D (Fix RLS Policy)** is the best approach:

1. Open Supabase SQL Editor
2. Run the RLS policy update SQL above
3. Reload the app
4. Login should work!

---

## Next Steps

1. **Check browser console** for detailed error logs
2. **Share the error code/message** from console
3. **Try Option D** (update RLS policy) in Supabase
4. If that doesn't work, try **Option C** (sync IDs)

---

**I've added enhanced logging to AuthContext. Reload the app and check console for the exact error!**
