# 🔧 Payment RLS Policy Fix & Micropayment Tracking

**Date**: October 22, 2025  
**Issues**:
1. ❌ **Payment creation failing** - "new row violates row-level security policy for table rent_payments"
2. ✅ **Micropayments working** - But no UI to track them
3. ❌ **No Solana transaction links** - Can't verify on Solscan/Solana Explorer

---

## 🔍 Root Cause Analysis

### Issue 1: RLS Policy Blocking Payments

**Error**: `new row violates row-level security policy for table "rent_payments"`

**Cause**: Supabase Row-Level Security (RLS) is preventing the backend from creating payment records on behalf of tenants.

**Backend logs show**:
```
✅ Micropayment completed successfully  ← Works (has correct policy)
❌ Database error creating payment: row-level security policy  ← Fails
```

### Issue 2: Micropayments Not Visible in UI

**Status**: Micropayments ARE being created in database successfully!

**Example from logs**:
```json
{
  "id": "f6b08776-db34-4ab2-9cb9-3791107f019b",
  "from_user_id": "a0000000-0000-0000-0000-000000000003",
  "to_user_id": "a0000000-0000-0000-0000-000000000001",
  "amount_usdc": 1,
  "purpose": "test",
  "transaction_hash": "SIMULATED_ebfa290c_1761162572481",
  "status": "completed"
}
```

**Missing**: UI component to display micropayment history

### Issue 3: No Blockchain Explorer Links

**Current**: Simulated transaction hashes (not clickable)  
**Needed**: Real Solana transaction links like `https://solscan.io/tx/{hash}?cluster=devnet`

---

## ✅ Solution Steps

### Step 1: Fix RLS Policy (REQUIRED)

**Run this SQL in Supabase Dashboard**:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** → **+ New Query**
4. Copy and paste the SQL from: `database/migrations/007_fix_payment_rls_policy.sql`
5. Click **RUN**

**Quick SQL** (if you want to copy-paste directly):

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own payments" ON rent_payments;
DROP POLICY IF EXISTS "Users can create their own payments" ON rent_payments;

-- Allow service role (backend) to manage all payments
CREATE POLICY "Service role can manage all payments"
ON rent_payments
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Allow tenants to view their payments
CREATE POLICY "Tenants can view their payments"
ON rent_payments FOR SELECT
USING (tenant_id::text = auth.uid()::text);

-- Allow tenants to create payments for their leases
CREATE POLICY "Tenants can create payments"
ON rent_payments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leases 
    WHERE leases.id = lease_id 
    AND leases.tenant_id = tenant_id
  )
);

-- Ensure RLS is enabled
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;
```

### Step 2: Restart Backend

The backend now uses `SUPABASE_SERVICE_KEY` which bypasses RLS:

```bash
# In backend terminal, press Ctrl+C
npm run dev
```

**Verify** in `.env` file you have:
```
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhaWNlcXlhb290dmtkZW54YnF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2Mjg5MiwiZXhwIjoyMDc2NjM4ODkyfQ.cEcqwT8dSN4KWzxKqMHRb7VdZcLO7I5cOqrGvx0lL08
```

**Note**: Get this from Supabase Dashboard → Settings → API → service_role key

### Step 3: Test Payment Creation

1. Open `http://localhost:3000`
2. Login as John Doe
3. Click **"Make Payment"**
4. Enter: Amount `100`, Type `rent`
5. Should succeed! ✅

---

## 🎯 Add Micropayment Tracking UI

I'll create a new component to view micropayment history. This will be added in the next update, but here's what it will include:

**Features**:
- ✅ List all sent/received micropayments
- ✅ Show transaction hashes
- ✅ Click to view on Solana Explorer  
- ✅ Filter by date, amount, purpose
- ✅ Export to CSV

**Location**: New tab in Tenant Dashboard - "Micropayments"

---

## 🔗 Add Solana Explorer Links

To make transaction hashes clickable and viewable on Solana Explorer:

### For Simulated Transactions (Development)

Currently showing: `SIMULATED_ebfa290c_1761162572481`

**Improvement**: Add note that this is simulated and will be real when Circle API is configured

### For Real Transactions (Production)

Format: `https://solscan.io/tx/{transactionHash}?cluster=devnet`

Example:
```
Transaction: 5KjR3x... 
[View on Solana Explorer →]
```

---

## 📋 Verification Checklist

After completing Step 1 & 2:

- [ ] SQL migration executed in Supabase Dashboard
- [ ] Backend restarted with SERVICE_KEY
- [ ] Test payment creation - should work without RLS error
- [ ] Micropayments still working  
- [ ] No "Unknown error" in frontend

---

## 🧪 Test Cases

### Test 1: Create Regular Payment
```bash
# Should succeed now
curl -X POST http://localhost:3001/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "lease_id": "c0000000-0000-0000-0000-000000000001",
    "tenant_id": "a0000000-0000-0000-0000-000000000003",
    "amount_usdc": 100,
    "payment_type": "rent",
    "due_date": "2025-11-01"
  }'
```

**Expected**:
```json
{
  "success": true,
  "data": { "id": "...", "status": "pending", ... }
}
```

### Test 2: Verify Micropayment in Database
```sql
SELECT * FROM micropayments 
WHERE from_user_id = 'a0000000-0000-0000-0000-000000000003'
ORDER BY created_at DESC
LIMIT 5;
```

**Should show**: Your test micropayments

### Test 3: Frontend Payment Creation
1. Go to Tenant Portal
2. Click "Make Payment"
3. Enter amount and type
4. Submit
5. Should see success message ✅

---

## 🚨 Troubleshooting

### Error: "new row violates row-level security policy"

**Cause**: RLS migration not run or backend not using SERVICE_KEY

**Fix**:
1. Run Step 1 SQL migration
2. Add `SUPABASE_SERVICE_KEY` to `.env`
3. Restart backend

### Error: "SUPABASE_SERVICE_KEY not found"

**Get the key**:
1. Go to Supabase Dashboard
2. Settings → API
3. Copy "service_role" key (starts with `eyJ...`)
4. Add to `.env`:
   ```
   SUPABASE_SERVICE_KEY=eyJ...your-key-here...
   ```

### Micropayments work but payments don't

**This is the current state!**

**Why**: Micropayments table has correct RLS policy, payments table doesn't

**Fix**: Run Step 1 migration

---

## 📊 Current Status

| Feature | Status | Notes |
|---------|--------|-------|
| Micropayment Creation | ✅ Working | Successfully saving to database |
| Micropayment UI | ❌ Missing | Need to add history view |
| Payment Creation | ❌ Failing | RLS policy blocking |
| Transaction Links | ❌ Missing | Need Solana Explorer integration |
| Backend SERVICE_KEY | ✅ Updated | Now uses service role |

---

## 🎯 Next Steps

1. **Immediate** (Fix payments):
   - Run RLS migration (Step 1)
   - Restart backend (Step 2)
   - Test payment creation

2. **Short-term** (Add tracking):
   - Create Micropayment History component
   - Add to Tenant Dashboard
   - Show transaction details

3. **Future** (Real transactions):
   - Configure Circle API keys
   - Replace simulated hashes with real ones
   - Add Solana Explorer links

---

## 📚 Related Files

**Migrations**:
- `database/migrations/007_fix_payment_rls_policy.sql` - RLS fix

**Backend**:
- `backend/src/index.ts` - Now uses SERVICE_KEY (line 23)

**Frontend** (to be updated):
- `frontend/src/components/TenantDashboard.tsx` - Add micropayment history
- `frontend/src/components/MicropaymentHistory.tsx` - New component (to create)

---

**Last Updated**: October 22, 2025  
**Priority**: HIGH - Payment creation blocked  
**Est. Fix Time**: 5 minutes (Step 1 & 2)
