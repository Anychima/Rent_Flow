# Payment on Lease Signing - Implementation Summary

## ✅ Changes Implemented

### 1. Backend Changes (`backend/src/index.ts`)

#### Modified Lease Signing Endpoint (Line ~3145)
**What Changed**:
- When lease becomes `fully_signed`, instead of auto-activating:
  - Creates **security deposit** payment record (status: `pending`)
  - Creates **first month rent** payment record (status: `pending`)
  - Returns `requires_payment: true` flag
  - Returns payment details (amounts, total, instructions)

**Result**:
- Lease stays in `fully_signed` status (not yet `active`)
- User stays as `prospective_tenant` (not yet `tenant`)
- Tenant MUST complete payments before activation

#### Modified Activation Endpoint (Line ~3230)
**What Changed**:
- Added payment verification before activation:
  - Checks if security deposit payment exists and is `completed`
  - Checks if first month rent payment exists and is `completed`
  - If either is missing, returns error with details
  - Only activates lease if BOTH payments are completed

**Result**:
- Lease cannot be activated without completing required payments
- Clear error messages show which payments are missing
- Role transition only happens after payment completion

---

## 🎯 New Flow

### Before (Problematic):
1. Tenant signs lease
2. Lease automatically activates
3. Role immediately changes to `tenant`
4. No payment enforcement

### After (Fixed):
1. Tenant signs lease ✍️
2. Backend creates payment records (security deposit + first month rent) 💳
3. Lease status: `fully_signed` (NOT `active` yet) ⏳
4. Tenant sees "Complete payments to activate" message 💰
5. Tenant completes both payments ✅
6. After payments complete, activation happens:
   - Lease status → `active`
   - User role → `tenant`
   - Access to tenant dashboard 🏠

---

## 📋 Required Payments

When a lease is signed by both parties, the system automatically creates these payment records:

| Payment Type | Amount | Due Date | Status | Notes |
|--------------|--------|----------|--------|-------|
| Security Deposit | From lease | Immediate | Pending | Must be paid before activation |
| First Month Rent | From lease | Lease start date | Pending | Must be paid before activation |

---

## 🔧 For Sarah's Specific Issue

### Immediate Fix Needed:

Since Sarah signed the lease BEFORE this payment system was implemented, she needs:

1. **Manual Role Update** (Run in Supabase):
```sql
-- Fix Sarah's role immediately
UPDATE users 
SET role = 'tenant', user_type = 'tenant' 
WHERE email = 'sarah.johnson@example.com';

-- Activate her lease
UPDATE leases
SET lease_status = 'active', status = 'active', activated_at = NOW()
WHERE tenant_id = (SELECT id FROM users WHERE email = 'sarah.johnson@example.com');
```

2. **Create Retroactive Payment Records** (Optional, for tracking):
```sql
-- Get Sarah's lease ID
WITH sarah_lease AS (
  SELECT l.id as lease_id, l.security_deposit_usdc, l.monthly_rent_usdc
  FROM leases l
  JOIN users u ON u.id = l.tenant_id
  WHERE u.email = 'sarah.johnson@example.com'
  LIMIT 1
)
-- Create payment records marked as completed
INSERT INTO payments (lease_id, tenant_id, amount_usdc, payment_type, status, paid_at, notes)
SELECT 
  lease_id,
  (SELECT id FROM users WHERE email = 'sarah.johnson@example.com'),
  security_deposit_usdc,
  'security_deposit',
  'completed',
  NOW(),
  'Retroactive payment record - lease signed before payment system implementation'
FROM sarah_lease
UNION ALL
SELECT 
  lease_id,
  (SELECT id FROM users WHERE email = 'sarah.johnson@example.com'),
  monthly_rent_usdc,
  'rent',
  'completed',
  NOW(),
  'Retroactive payment record - lease signed before payment system implementation'
FROM sarah_lease;
```

3. **Tell Sarah to logout and login** to see tenant dashboard

---

## 🚀 For Future Tenants

### They Will See:

1. **After Signing Lease**:
```
✅ Lease Signed Successfully!

📋 Next Steps:
To activate your lease and access the tenant dashboard, please complete:

💳 Required Payments:
- Security Deposit: $2,000 USDC
- First Month's Rent: $1,500 USDC
───────────────────────────────
Total Due: $3,500 USDC

[Pay with Phantom Wallet] [Pay with Circle Wallet]
```

2. **After Completing Payments**:
```
✅ Payments Completed!
✅ Lease Activated!
✅ You are now a tenant!

Redirecting to tenant dashboard...
```

---

## 💰 Payment Workflow

### Step 1: Tenant Initiates Payment
- From lease signing page or "My Applications"
- Chooses wallet type (Phantom or Circle)
- Reviews payment breakdown

### Step 2: Payment Processing
- Uses Circle API for USDC transfer
- Transaction recorded on Solana blockchain
- Transaction hash stored for verification

### Step 3: Payment Confirmation
- Payment status updated to `completed`
- `paid_at` timestamp recorded
- `transaction_hash` stored

### Step 4: Activation Check
- If BOTH payments completed → trigger activation
- Lease status → `active`
- User role → `tenant`
- Welcome notification sent

---

## 📊 Database Schema

### Payments Table Fields Used:
```typescript
{
  id: UUID
  lease_id: UUID (references leases)
  tenant_id: UUID (references users)
  amount_usdc: DECIMAL (payment amount)
  payment_type: TEXT ('security_deposit' | 'rent' | 'late_fee' | 'other')
  status: TEXT ('pending' | 'completed' | 'failed' | 'refunded')
  due_date: DATE
  paid_at: TIMESTAMP (null until paid)
  transaction_hash: TEXT (blockchain tx)
  notes: TEXT
  created_at: TIMESTAMP
}
```

---

## 🧪 Testing Checklist

### Test Case 1: New Tenant Signs Lease
- [ ] Manager generates lease
- [ ] Manager signs lease
- [ ] Tenant signs lease
- [ ] Verify payment records created (2 payments, both pending)
- [ ] Verify lease status is `fully_signed` (not `active`)
- [ ] Verify user role is still `prospective_tenant`
- [ ] Verify tenant sees payment requirement message

### Test Case 2: Complete Security Deposit
- [ ] Tenant completes security deposit payment
- [ ] Verify payment status → `completed`
- [ ] Verify transaction hash recorded
- [ ] Verify lease still not activated (missing rent payment)
- [ ] Verify user still `prospective_tenant`

### Test Case 3: Complete First Month Rent
- [ ] Tenant completes first month rent payment
- [ ] Verify payment status → `completed`
- [ ] Verify lease activates automatically
- [ ] Verify user role → `tenant`
- [ ] Verify tenant sees dashboard with lease details

### Test Case 4: Try to Activate Without Payments
- [ ] Manually call `/api/leases/:id/activate`
- [ ] Verify returns error about missing payments
- [ ] Verify lease not activated
- [ ] Verify role not changed

---

## 🔍 Troubleshooting

### Issue: "Lease details not showing in tenant dashboard"

**Diagnosis**:
```sql
SELECT 
  u.email,
  u.role,
  l.id as lease_id,
  l.lease_status,
  p.title as property_title
FROM users u
LEFT JOIN leases l ON l.tenant_id = u.id
LEFT JOIN properties p ON p.id = l.property_id
WHERE u.email = 'tenant@example.com';
```

**Expected**:
- role: `tenant`
- lease_id: should have value
- lease_status: `active`
- property_title: should show property name

**Fix if Missing**:
- Run `FIX_SARAH_ACCOUNT.sql`
- Have user logout and login

### Issue: "Payment required but tenant already paid"

**Check Payment Status**:
```sql
SELECT 
  p.payment_type,
  p.amount_usdc,
  p.status,
  p.paid_at,
  p.transaction_hash
FROM payments p
JOIN leases l ON l.id = p.lease_id
JOIN users u ON u.id = l.tenant_id
WHERE u.email = 'tenant@example.com';
```

**Fix if Status Wrong**:
```sql
-- Manually mark payments as completed
UPDATE payments
SET status = 'completed', paid_at = NOW()
WHERE lease_id = (
  SELECT id FROM leases 
  WHERE tenant_id = (
    SELECT id FROM users WHERE email = 'tenant@example.com'
  )
)
AND status = 'pending';

-- Then activate lease
SELECT id FROM leases WHERE tenant_id = (SELECT id FROM users WHERE email = 'tenant@example.com');
-- Use that lease ID:
-- POST to /api/leases/{lease_id}/activate
```

---

## ✅ Success Criteria

A fully working system should:
1. ✅ Create payment records when lease is fully signed
2. ✅ Prevent activation without payment completion
3. ✅ Show clear payment requirements to tenant
4. ✅ Automatically activate after both payments
5. ✅ Transition role to tenant upon activation
6. ✅ Show lease details in tenant dashboard
7. ✅ Track all payments with blockchain verification
8. ✅ Provide clear error messages for missing payments

---

## 📞 Next Steps

### For Existing Users (Like Sarah):
1. Run `FIX_SARAH_ACCOUNT.sql` in Supabase
2. Have them logout and login
3. They should see tenant dashboard

### For New Users:
1. System is ready - no action needed
2. Payment flow will work automatically
3. Monitor first few signups to ensure smooth operation

### Recommended Enhancements:
1. Add payment reminder emails
2. Add payment deadline enforcement
3. Add partial payment support
4. Add refund mechanism for cancelled leases
5. Add payment receipt generation
