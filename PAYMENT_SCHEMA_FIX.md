# 🔧 Payment & Micropayment Schema Fix

**Date**: October 22, 2025  
**Issue**: Database schema missing `payment_type` column and `micropayments` table  
**Errors**:
- ❌ "Could not find the 'payment_type' column of 'rent_payments'"
- ❌ "Could not find the table 'public.micropayments'"

---

## 🔍 Root Cause

The database schema on Supabase is missing:
1. **payment_type** column in `rent_payments` table
2. **micropayments** table for small USDC transfers

These exist in the schema file (`database/schema.sql`) but haven't been applied to the live database.

---

## ✅ Solution: Run Migration

### Method 1: Supabase Dashboard (Recommended)

**Step 1: Access Supabase SQL Editor**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **saiceqyaootvkdenxbqx**
3. Click **SQL Editor** in the left sidebar
4. Click **+ New Query**

**Step 2: Execute Migration SQL**

Copy and paste this SQL into the editor:

```sql
-- Migration: Fix Payment and Micropayment Tables
-- Date: 2025-10-22

-- 1. Add payment_type column to rent_payments
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'rent_payments' 
        AND column_name = 'payment_type'
    ) THEN
        ALTER TABLE rent_payments 
        ADD COLUMN payment_type TEXT DEFAULT 'rent' 
        CHECK (payment_type IN ('rent', 'security_deposit', 'late_fee', 'other'));
        
        RAISE NOTICE 'Added payment_type column to rent_payments table';
    ELSE
        RAISE NOTICE 'payment_type column already exists';
    END IF;
END $$;

-- 2. Create micropayments table
CREATE TABLE IF NOT EXISTS micropayments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id UUID REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    amount_usdc DECIMAL(20,6) NOT NULL,
    purpose TEXT NOT NULL,
    transaction_hash TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    blockchain_network TEXT DEFAULT 'solana',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for micropayments
CREATE INDEX IF NOT EXISTS idx_micropayments_from_user ON micropayments(from_user_id);
CREATE INDEX IF NOT EXISTS idx_micropayments_to_user ON micropayments(to_user_id);
CREATE INDEX IF NOT EXISTS idx_micropayments_status ON micropayments(status);
CREATE INDEX IF NOT EXISTS idx_micropayments_created_at ON micropayments(created_at);

-- 4. Add comment
COMMENT ON TABLE micropayments IS 'Micropayments table for small USDC transfers between users (max $10)';

-- 5. Verify changes
DO $$
DECLARE
    payment_type_exists BOOLEAN;
    micropayments_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'rent_payments' 
        AND column_name = 'payment_type'
    ) INTO payment_type_exists;
    
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'micropayments'
    ) INTO micropayments_exists;
    
    RAISE NOTICE '=== Migration Verification ===';
    RAISE NOTICE 'payment_type column exists: %', payment_type_exists;
    RAISE NOTICE 'micropayments table exists: %', micropayments_exists;
    
    IF payment_type_exists AND micropayments_exists THEN
        RAISE NOTICE '✅ Migration completed successfully!';
    ELSE
        RAISE WARNING '⚠️ Migration may be incomplete';
    END IF;
END $$;
```

**Step 3: Run the Query**
1. Click **RUN** button (or press Ctrl+Enter)
2. Wait for completion
3. Check the **Results** tab for success messages

**Expected Output**:
```
=== Migration Verification ===
payment_type column exists: true
micropayments table exists: true
✅ Migration completed successfully!
```

---

### Method 2: Using psql (Alternative)

If you have PostgreSQL client installed:

```bash
# From project root
psql "postgresql://postgres:[YOUR_PASSWORD]@db.saiceqyaootvkdenxbqx.supabase.co:5432/postgres" < database/migrations/006_fix_payments_micropayments.sql
```

---

### Method 3: Run Script (Automated)

```bash
cd scripts
npx ts-node fix-payment-schema.ts
```

**Note**: This may require manual execution if RPC is not enabled.

---

## 🔍 Verify the Fix

### Check 1: Verify Tables and Columns

In Supabase Dashboard SQL Editor, run:

```sql
-- Check payment_type column
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'rent_payments'
AND column_name = 'payment_type';

-- Check micropayments table
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'micropayments'
ORDER BY ordinal_position;

-- Count records
SELECT 
  (SELECT COUNT(*) FROM rent_payments) as rent_payments_count,
  (SELECT COUNT(*) FROM micropayments) as micropayments_count;
```

### Check 2: Test from Backend

**Restart backend server**:
```bash
# Stop current server (Ctrl+C)
cd backend
npm run dev
```

**Test micropayment endpoint**:
```bash
curl -X POST http://localhost:3001/api/micropayments \
  -H "Content-Type: application/json" \
  -d '{
    "fromUserId": "a0000000-0000-0000-0000-000000000001",
    "toUserId": "a0000000-0000-0000-0000-000000000002",
    "amountUsdc": 5,
    "purpose": "Test payment"
  }'
```

**Test payment endpoint**:
```bash
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

### Check 3: Test from Frontend

1. Open browser: `http://localhost:3000`
2. Login as tenant (John Doe)
3. Try **"Make Payment"** → Should work without errors
4. Try **"Send Micropayment"** → Should work without errors

---

## 🎯 After Migration

### Step 1: Restart Backend
```bash
# In backend terminal, press Ctrl+C
npm run dev
```

### Step 2: Clear Browser Cache
Visit: `http://localhost:3000/clear-cache.html`
Click **"Clear All Cache & Reload"**

### Step 3: Test Functionality

**Test Payment Creation**:
1. Login to Tenant Portal
2. Click "Make Payment"
3. Enter amount: `100`
4. Enter type: `rent`
5. Should succeed ✅

**Test Micropayment**:
1. Click "Send Micropayment"
2. Enter amount: `5` (between $0.01 and $10)
3. Enter purpose: `Test transfer`
4. Should succeed ✅

---

## 📊 Expected Results

### Before Migration
❌ Backend errors:
```
Could not find the 'payment_type' column of 'rent_payments'
Could not find the table 'public.micropayments'
```

❌ Frontend errors:
```
Error: Unknown error
Payment Creation Failed
```

### After Migration
✅ Backend logs:
```
💳 Creating payment record: {...}
✅ Payment created successfully
```

✅ Frontend:
```
Payment created successfully!
Micropayment sent successfully!
```

---

## 🚨 Troubleshooting

### Issue: "Permission denied"

**Cause**: Using wrong API key

**Fix**: Use `SUPABASE_SERVICE_KEY` instead of `SUPABASE_KEY` in `.env`

### Issue: "Table already exists"

**Cause**: Migration already run

**Fix**: This is OK! The migration uses `IF NOT EXISTS` so it's safe to run multiple times.

### Issue: "Constraint violation"

**Cause**: Existing data doesn't match new constraints

**Fix**: 
```sql
-- Update existing records
UPDATE rent_payments 
SET payment_type = 'rent' 
WHERE payment_type IS NULL;
```

### Issue: Migration runs but errors persist

**Cause**: Database cache not refreshed

**Fix**:
1. Restart backend server
2. Clear browser cache
3. Try again

---

## 📋 Checklist

Migration complete when ALL are checked:

- [ ] Migration SQL executed in Supabase Dashboard
- [ ] Verification query shows both exist
- [ ] Backend server restarted
- [ ] Browser cache cleared
- [ ] Payment creation works (no error)
- [ ] Micropayment works (no error)
- [ ] Backend logs show success messages
- [ ] No console errors in browser (F12)

---

## 📚 Related Files

**Migration SQL**:
- `database/migrations/006_fix_payments_micropayments.sql`

**Schema Definition**:
- `database/schema.sql` (lines 67-92)

**Backend Endpoints**:
- `backend/src/index.ts` (payments and micropayments endpoints)

**Frontend Components**:
- `frontend/src/components/TenantDashboard.tsx` (handleMakePayment)
- `frontend/src/components/TenantPortal.tsx` (payment display)

**Documentation**:
- `PAYMENT_FIXES_SUMMARY.md` - Previous payment fixes
- `BROWSER_CACHE_FIX.md` - Cache troubleshooting

---

## ✅ Success Indicators

After completing migration:

1. ✅ No database errors in backend logs
2. ✅ Payments can be created from frontend
3. ✅ Micropayments can be sent
4. ✅ No "Unknown error" messages
5. ✅ Backend logs show successful operations:
   ```
   💳 Creating payment record: {...}
   ✅ Payment created successfully
   
   💵 Micropayment request: {...}
   ✅ Circle payment successful
   ✅ Micropayment completed successfully
   ```

---

**Last Updated**: October 22, 2025  
**Status**: Ready to Execute  
**Priority**: HIGH - Blocking payment functionality
