# 🔧 FIX: Invalid Supabase API Keys

## Problem

The backend is showing this error:
```
❌ Tenant not found: Invalid API key
❌ Error fetching tenant dashboard: {
  message: 'Invalid API key',
  hint: 'Double check your Supabase `anon` or `service_role` API key.'
}
```

**Root Cause**: The JWT tokens in `backend/.env` have invalid signatures or were generated with the wrong secret.

## Solution: Get Correct API Keys from Supabase Dashboard

### Step 1: Access Supabase Dashboard

1. Go to: **https://supabase.com/dashboard**
2. Sign in with your account
3. Select your project: **saiceqyaootvkdenxbqx**

### Step 2: Get API Keys

1. In the left sidebar, click **Settings** (gear icon)
2. Click **API** in the settings menu
3. You'll see three important values:

#### Project URL
```
https://saiceqyaootvkdenxbqx.supabase.co
```
✅ This is correct in your `.env` file

#### Project API keys

You'll see two keys:

**1. anon / public key** (starts with `eyJhbGci...`)
- This is for client-side operations
- Copy this entire JWT token

**2. service_role / secret key** (starts with `eyJhbGci...`)
- This is for server-side operations  
- Has admin privileges
- ⚠️ KEEP THIS SECRET!
- Copy this entire JWT token

### Step 3: Update backend/.env

Open `backend/.env` and update these lines:

```env
# Database - Supabase
SUPABASE_URL=https://saiceqyaootvkdenxbqx.supabase.co
SUPABASE_KEY=<PASTE_YOUR_ANON_KEY_HERE>
SUPABASE_SERVICE_KEY=<PASTE_YOUR_SERVICE_ROLE_KEY_HERE>
```

**Example format** (DO NOT use these - they're examples):
```env
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhaWNlcXlhb290dmtkZW54YnF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAwMDAwMDAsImV4cCI6MjA0NTAwMDAwMH0.REAL_SIGNATURE_HERE

SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhaWNlcXlhb290dmtkZW54YnF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDAwMDAwMCwiZXhwIjoyMDQ1MDAwMDAwfQ.REAL_SIGNATURE_HERE
```

### Step 4: Restart Backend Server

After updating the `.env` file:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

Or if using the root directory:
```bash
cd c:\Users\olumbach\Documents\Rent_Flow
npm run dev
```

### Step 5: Verify Fix

1. The backend logs should NO LONGER show:
   ```
   ❌ Tenant not found: Invalid API key
   ```

2. The browser should load the dashboard successfully

3. You should see in backend logs:
   ```
   ✅ Server running on http://localhost:3001
   🗄️  Database: https://saiceqyaootvkdenxbqx.supabase.co
   ```

4. Test dashboard load at: http://localhost:3000

## Quick Test

After updating keys, test the connection:

```bash
cd backend
node -e "const { createClient } = require('@supabase/supabase-js'); require('dotenv').config(); const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY); supabase.from('users').select('id').limit(1).then(r => console.log('✅ Connection successful:', r.data ? 'Data retrieved' : 'No data')).catch(e => console.error('❌ Error:', e.message));"
```

You should see: `✅ Connection successful: Data retrieved`

## Why This Happened

The JWT tokens in your `.env` file have these characteristics:
- Issued timestamp (`iat`): 1761062892 (December 21, 2025)  
- Expiration (`exp`): 2076638892 (October 9, 2035)

The issued date is in the future, which suggests:
1. These tokens were generated with an incorrect timestamp
2. OR these are placeholder/example tokens
3. OR the JWT secret used to sign them doesn't match your Supabase project's secret

## Security Note

⚠️ **NEVER** commit the `service_role` key to Git!
- It has full admin access to your database
- Can bypass Row-Level Security (RLS)  
- Should only be used server-side

Make sure `backend/.env` is in `.gitignore`:
```
backend/.env
.env
*.env
```

## Still Having Issues?

If you still get errors after updating the keys:

1. **Verify keys are copied correctly**
   - No extra spaces
   - Complete JWT token (starts with `eyJ`)
   - No line breaks in the middle

2. **Check Supabase project status**
   - Is the project active in dashboard?
   - Any billing issues?
   - Database migrations completed?

3. **Clear environment cache**
   ```bash
   # Kill all node processes
   taskkill /F /IM node.exe
   
   # Restart fresh
   npm run dev
   ```

4. **Contact me with**:
   - Screenshot of Supabase API settings page (hide the keys!)
   - Backend log output
   - Browser console errors

---

**Next**: Once you fix the Supabase keys, your dashboard will load and you can test the Circle API micropayments!
