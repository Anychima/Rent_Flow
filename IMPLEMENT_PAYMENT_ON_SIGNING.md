# Implementation Plan: Payment Required Upon Lease Signing

## 🎯 Requirements

1. **Payment on Signing**: Prospective tenant must pay security deposit + first month's rent when signing lease
2. **Lease in Tenant Dashboard**: After role transition, tenant should see their active lease details
3. **Payment Records**: Automatically create payment records for tracking

## 📋 Implementation Steps

### Step 1: Modify Backend - Lease Signing Endpoint

**File**: `backend/src/index.ts` (around line 3160)

**Changes**:
1. When tenant signs and lease becomes `fully_signed`:
   - Create initial payment record for security deposit
   - Create initial payment record for first month's rent
   - Both payments marked as `pending`
   - Tenant must complete these payments before activation

2. Add payment validation before activation:
   - Check if security deposit is paid
   - Check if first month's rent is paid
   - Only activate if both are completed

### Step 2: Update Frontend - Lease Signing Page

**File**: `frontend/src/pages/LeaseSigningPage.tsx`

**Changes**:
1. After signing, show payment requirement banner
2. Display payment amounts:
   - Security Deposit: $X USDC
   - First Month's Rent: $Y USDC
   - Total Due: $(X+Y) USDC
3. Add "Complete Payment to Activate Lease" button
4. Redirect to payment page after signing

### Step 3: Create Payment Flow

**New Component**: `frontend/src/components/LeasePaymentModal.tsx`

**Features**:
- Show itemized payment breakdown
- Wallet selection (Phantom or Circle)
- Payment confirmation
- Transaction tracking

### Step 4: Update Tenant Dashboard

**File**: `frontend/src/components/TenantDashboard.tsx`

**Changes**:
1. Fetch active lease for current tenant
2. Display lease details (already implemented ✅)
3. Show payment history for the lease
4. Display property information from the lease

### Step 5: Backend - Payment Processing

**Endpoints to Add/Modify**:
1. `/api/leases/:id/create-initial-payments` - Create payment records
2. `/api/leases/:id/verify-payments` - Check if all required payments are completed
3. `/api/leases/:id/activate` - Modified to require payment verification

## 🔧 Detailed Implementation

### 1. Backend Changes

#### Create Initial Payments Function
```typescript
async function createInitialPayments(leaseId: string, tenantId: string) {
  const { data: lease } = await supabase
    .from('leases')
    .select('*')
    .eq('id', leaseId)
    .single();

  if (!lease) throw new Error('Lease not found');

  // Create security deposit payment
  const securityPayment = await supabase
    .from('payments')
    .insert({
      lease_id: leaseId,
      tenant_id: tenantId,
      amount_usdc: lease.security_deposit_usdc,
      payment_type: 'security_deposit',
      due_date: new Date().toISOString(),
      status: 'pending'
    })
    .select()
    .single();

  // Create first month's rent payment
  const rentPayment = await supabase
    .from('payments')
    .insert({
      lease_id: leaseId,
      tenant_id: tenantId,
      amount_usdc: lease.monthly_rent_usdc,
      payment_type: 'rent',
      due_date: lease.start_date,
      status: 'pending'
    })
    .select()
    .single();

  return {
    securityPayment: securityPayment.data,
    rentPayment: rentPayment.data
  };
}
```

#### Verify Payments Function
```typescript
async function verifyLeasePayments(leaseId: string): Promise<boolean> {
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('lease_id', leaseId)
    .in('payment_type', ['security_deposit', 'rent']);

  if (!payments || payments.length < 2) return false;

  // Check if both payments are completed
  const securityPaid = payments.some(p => 
    p.payment_type === 'security_deposit' && p.status === 'completed'
  );
  const rentPaid = payments.some(p => 
    p.payment_type === 'rent' && p.status === 'completed'
  );

  return securityPaid && rentPaid;
}
```

### 2. Modified Signing Flow

**When lease becomes fully_signed**:
```typescript
if (newLeaseStatus === 'fully_signed') {
  console.log('🚀 [Auto-Activate] Lease fully signed, creating payment records...');
  
  // Create initial payment records
  await createInitialPayments(lease.id, lease.tenant_id);
  
  console.log('💰 Initial payments created - waiting for tenant payment...');
  
  res.json({
    success: true,
    data: updatedLease,
    message: 'Lease signed successfully. Please complete initial payments to activate.',
    requires_payment: true,
    payment_required: {
      security_deposit: lease.security_deposit_usdc,
      first_month_rent: lease.monthly_rent_usdc,
      total: lease.security_deposit_usdc + lease.monthly_rent_usdc
    }
  });
}
```

### 3. Modified Activation Flow

**Check payments before activating**:
```typescript
app.post('/api/leases/:id/activate', async (req, res) => {
  // ... existing lease fetch code ...

  // Verify payments are completed
  const paymentsVerified = await verifyLeasePayments(id);
  
  if (!paymentsVerified) {
    return res.status(400).json({
      success: false,
      error: 'Cannot activate lease: Initial payments not completed. Please pay security deposit and first month rent.'
    });
  }

  // ... rest of activation code ...
});
```

## 🎨 Frontend Changes

### Payment Modal Component

```typescript
interface LeasePaymentModalProps {
  lease: Lease;
  onClose: () => void;
  onPaymentComplete: () => void;
}

function LeasePaymentModal({ lease, onClose, onPaymentComplete }: LeasePaymentModalProps) {
  const securityDeposit = lease.security_deposit_usdc;
  const firstMonthRent = lease.monthly_rent_usdc;
  const total = securityDeposit + firstMonthRent;

  return (
    <div className="modal">
      <h2>Complete Initial Payments</h2>
      <div className="payment-breakdown">
        <div className="payment-item">
          <span>Security Deposit</span>
          <span>${securityDeposit} USDC</span>
        </div>
        <div className="payment-item">
          <span>First Month's Rent</span>
          <span>${firstMonthRent} USDC</span>
        </div>
        <div className="payment-total">
          <span>Total Due</span>
          <span>${total} USDC</span>
        </div>
      </div>
      
      {/* Wallet selection and payment buttons */}
      <button onClick={handlePayWithPhantom}>
        Pay with Phantom Wallet
      </button>
      <button onClick={handlePayWithCircle}>
        Pay with Circle Wallet
      </button>
    </div>
  );
}
```

### Updated Signing Page Flow

```typescript
if (response.data.success) {
  if (response.data.requires_payment) {
    // Show payment modal instead of immediate activation
    setShowPaymentModal(true);
    setPaymentInfo(response.data.payment_required);
  } else if (response.data.activated) {
    // Existing activation redirect code
    await refreshUserProfile();
    window.location.href = '/';
  }
}
```

## ✅ Testing Checklist

1. [ ] Sign lease as tenant
2. [ ] Verify payment records are created
3. [ ] Verify both payments show as "pending"
4. [ ] Complete security deposit payment
5. [ ] Complete first month's rent payment
6. [ ] Verify lease activates after both payments
7. [ ] Verify role transitions to "tenant"
8. [ ] Verify tenant sees dashboard with lease details
9. [ ] Verify payment history shows in tenant dashboard

## 📝 SQL Script to Check Payment Status

```sql
SELECT 
  l.id as lease_id,
  u.email as tenant_email,
  u.role as tenant_role,
  l.lease_status,
  l.activated_at,
  p.id as payment_id,
  p.payment_type,
  p.amount_usdc,
  p.status as payment_status,
  p.paid_at
FROM leases l
JOIN users u ON u.id = l.tenant_id
LEFT JOIN payments p ON p.lease_id = l.id
WHERE u.email = 'sarah.johnson@example.com'
ORDER BY p.created_at;
```

## 🚨 Important Notes

1. **Payment Security**: Use Circle API for secure USDC transactions
2. **Error Handling**: Handle payment failures gracefully
3. **User Feedback**: Clear messaging about payment requirements
4. **Transaction Tracking**: Store transaction hashes for verification
5. **Refund Policy**: Implement refund mechanism for cancelled leases

## 🎯 Benefits

- ✅ Ensures payment before tenancy begins
- ✅ Clear financial tracking from day one
- ✅ Automated payment record creation
- ✅ Blockchain verification of payments
- ✅ Smooth transition from prospective tenant to tenant
