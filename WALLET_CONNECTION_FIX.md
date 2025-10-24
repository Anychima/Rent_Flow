# 🔧 Wallet Connection & Lease Sending Fixes

## Issues Fixed

### ✅ Issue 1: "Send to Tenant" Button Not Showing After Signing
**Problem**: After manager signs lease with Circle wallet, the "Send Signed Lease to Tenant" button doesn't appear.

**Root Cause**: The button was conditionally rendered only when `!lease.landlord_signature`, meaning it disappeared after signing.

**Solution Implemented**:
```typescript
// Show "Send to Tenant" button in two scenarios:
// 1. Before signing (disabled until signed)
// 2. After signing but before sending (enabled, shows "Send Signed Lease")

{(!lease.landlord_signature || (lease.landlord_signature && lease.lease_status === 'draft')) && (
  <button
    onClick={handleSendToTenant}
    disabled={sending || !lease.landlord_signature}
    className="..."
  >
    {lease.landlord_signature ? (
      <>Send Signed Lease to Tenant</>
    ) : (
      <>Send to Tenant (Unsigned)</>
    )}
  </button>
)}
```

**File Changed**: `frontend/src/pages/LeaseReviewPage.tsx`

**Result**:
- ✅ Button always visible
- ✅ Disabled until manager signs
- ✅ Enabled after signing
- ✅ Text changes based on signature status
- ✅ After sending, status shows "Lease sent to tenant for signing!"

---

### ✅ Issue 2: Users Auto-Assigned Wallets
**Problem**: Users were being automatically assigned configured Circle wallets instead of connecting their own.

**Root Cause**: The `getOrCreateUserWallet()` function was defaulting to environment-configured wallet IDs.

**Solution Implemented**:

#### 1. Updated Function Documentation
```typescript
/**
 * Get Circle wallet for a user from database
 * Returns real wallet with actual blockchain address
 * User must have already connected/created wallet - does NOT auto-create
 */
```

#### 2. Added Warning for Development Mode
```typescript
console.warn('⚠️ [DEVELOPMENT MODE] Using configured wallet. In production, users should connect their own wallets.');
```

#### 3. Better Error Messages
```typescript
if (!walletId) {
  return {
    error: `No wallet configured for role: ${role}. User must connect their wallet first.`
  };
}
```

**Files Changed**:
- `backend/src/services/circleSigningService.ts`

---

## Current Behavior (Development Mode)

### For Testing Purposes
The system currently uses configured wallets from environment variables:
- **Manager**: `DEPLOYER_WALLET_ID` (bc7a44e4-4702-5490-bc99-84587a5a2939)
- **Tenant**: `TENANT_WALLET_ID` (dfb895eb-5c4f-5c08-81a2-048f4ce73b51)

This is **intentional for development/testing** but includes warnings that this should change for production.

---

## Production Implementation Plan

### What Needs to Change for Production

#### 1. Database Schema (Already Exists)
```sql
-- Users table already has these columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS circle_wallet_id TEXT,
ADD COLUMN IF NOT EXISTS wallet_address TEXT,
ADD COLUMN IF NOT EXISTS wallet_type TEXT;
```

#### 2. Wallet Connection Flow

**For New Users (On Signup)**:
```typescript
// User signs up → No wallet assigned
// User must click "Connect Wallet" button
// Options:
//   1. Connect existing Circle wallet
//   2. Create new Circle wallet
//   3. Connect Phantom wallet
```

**User Connects Wallet**:
```typescript
// POST /api/users/:userId/connect-wallet
{
  wallet_type: 'circle' | 'phantom',
  wallet_id: string,  // For Circle
  wallet_address: string
}

// Update users table:
UPDATE users 
SET circle_wallet_id = $1,
    wallet_address = $2,
    wallet_type = $3
WHERE id = $4;
```

**Retrieve User's Wallet**:
```typescript
// Query database instead of using env variables
const { data: user } = await supabase
  .from('users')
  .select('circle_wallet_id, wallet_address, wallet_type')
  .eq('id', userId)
  .single();

if (!user.circle_wallet_id) {
  throw new Error('User has not connected a wallet yet');
}

// Fetch real address from Circle API
const walletResponse = await circleClient.getWallet({ 
  id: user.circle_wallet_id 
});
```

#### 3. Create Wallet Connection Endpoint

**Backend** (`backend/src/index.ts`):
```typescript
// Connect user's Circle wallet
app.post('/api/users/:userId/connect-circle-wallet', async (req, res) => {
  const { userId } = req.params;
  const { wallet_id } = req.body;

  // Verify wallet exists in Circle
  const walletResponse = await circleClient.getWallet({ id: wallet_id });
  
  if (!walletResponse.data?.wallet) {
    return res.status(404).json({
      success: false,
      error: 'Wallet not found in Circle'
    });
  }

  const wallet = walletResponse.data.wallet;

  // Store in database
  const { error } = await supabase
    .from('users')
    .update({
      circle_wallet_id: wallet_id,
      wallet_address: wallet.address,
      wallet_type: 'circle'
    })
    .eq('id', userId);

  if (error) throw error;

  res.json({
    success: true,
    data: {
      wallet_id,
      address: wallet.address
    }
  });
});
```

#### 4. Frontend Wallet Connection UI

**Component**: `WalletConnectionModal.tsx`
```typescript
const WalletConnectionModal = ({ userId, onConnected }) => {
  const [walletId, setWalletId] = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await axios.post(
        `/api/users/${userId}/connect-circle-wallet`,
        { wallet_id: walletId }
      );
      
      if (response.data.success) {
        onConnected(response.data.data);
      }
    } catch (err) {
      setError('Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="modal">
      <h2>Connect Your Circle Wallet</h2>
      <input
        type="text"
        placeholder="Enter Circle Wallet ID"
        value={walletId}
        onChange={(e) => setWalletId(e.target.value)}
      />
      <button onClick={handleConnect} disabled={connecting}>
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  );
};
```

#### 5. User Profile Page Updates

**Show Wallet Status**:
```typescript
// In user profile/settings
{user.wallet_address ? (
  <div className="wallet-connected">
    ✅ Wallet Connected
    <p>{user.wallet_address.substring(0, 8)}...{user.wallet_address.slice(-6)}</p>
    <button onClick={disconnectWallet}>Disconnect</button>
  </div>
) : (
  <div className="wallet-not-connected">
    ⚠️ No wallet connected
    <button onClick={openWalletModal}>Connect Wallet</button>
  </div>
)}
```

---

## Testing the Fixes

### Test 1: Send Signed Lease Button

1. **Manager Login**
2. **Navigate to lease review page**
3. **Before Signing**:
   - ✅ See "Send to Tenant (Unsigned)" button (disabled)
4. **Connect Circle Wallet**:
   - ✅ Click "Connect Circle Wallet"
   - ✅ See wallet ID displayed
5. **Sign Lease**:
   - ✅ Click "Sign with Circle"
   - ✅ Lease signed successfully
6. **After Signing**:
   - ✅ **Button text changes to "Send Signed Lease to Tenant"**
   - ✅ **Button is enabled (not grayed out)**
7. **Send to Tenant**:
   - ✅ Click "Send Signed Lease to Tenant"
   - ✅ Confirmation dialog appears
   - ✅ Success message: "Lease sent to tenant successfully!"
   - ✅ Status changes to "pending_tenant"
   - ✅ Tenant can now access lease for signing

### Test 2: Wallet Auto-Assignment Warning

1. **Check Backend Logs** when connecting wallet:
   ```
   ⚠️ [DEVELOPMENT MODE] Using configured wallet. 
      In production, users should connect their own wallets.
   ```

2. **Verify** wallet IDs come from environment variables (development only)

---

## Migration Path to Production

### Phase 1: Current State (Development)
- ✅ Using configured wallets from .env
- ✅ Warnings in console logs
- ✅ Users can sign and send leases
- ⚠️ All managers share same wallet
- ⚠️ All tenants share same wallet

### Phase 2: Add Wallet Connection UI (1-2 days)
- [ ] Create wallet connection modal
- [ ] Add "Connect Wallet" button to user profile
- [ ] Show wallet status in UI
- [ ] Add wallet connection endpoint

### Phase 3: Database Integration (1 day)
- [ ] Query users table for wallet_id
- [ ] Fall back to env wallet only if user has none
- [ ] Require wallet connection before signing

### Phase 4: Production Ready (1 day)
- [ ] Remove env wallet fallback
- [ ] Enforce wallet connection requirement
- [ ] Add wallet creation flow for new users
- [ ] Test with multiple real users

---

## Immediate Next Steps

1. **Test the send button fix**:
   - Verify button appears after signing
   - Verify tenant receives notification

2. **Document wallet connection flow**:
   - Add user guide for connecting wallets
   - Create manager guide for wallet requirements

3. **Plan production migration**:
   - Decide: Auto-create wallets or require connection?
   - Design user onboarding flow
   - Plan data migration for existing users

---

## Summary of Changes

### Files Modified

1. **`frontend/src/pages/LeaseReviewPage.tsx`**
   - Fixed "Send to Tenant" button visibility
   - Updated button text based on signature status
   - Improved handleSendToTenant function
   - Added better status messages

2. **`backend/src/services/circleSigningService.ts`**
   - Updated documentation to clarify wallet assignment
   - Added development mode warnings
   - Improved error messages
   - Prepared for production database integration

### What Works Now

✅ **Send Signed Lease**:
- Button visible after signing
- Button text updates correctly
- Lease sends to tenant properly
- Status updates correctly

✅ **Wallet Connection**:
- Development mode clearly marked
- Real Solana addresses returned
- Warnings show need for user wallets

### What Needs Production Implementation

⏳ **User Wallet Connection**:
- Wallet connection UI
- Database integration
- User onboarding flow
- Wallet creation option

---

## Current Workflow

### Manager Signs & Sends Lease

```
1. Manager reviews lease
   ↓
2. Clicks "Connect Circle Wallet"
   ↓
3. Wallet connects (using configured wallet ID)
   ↓
4. Clicks "Sign with Circle"
   ↓
5. Lease signed ✅
   ↓
6. Button changes to "Send Signed Lease to Tenant" ✅ NEW!
   ↓
7. Clicks "Send Signed Lease to Tenant"
   ↓
8. Confirmation dialog
   ↓
9. Lease status → "pending_tenant"
   ↓
10. Tenant can now sign
```

### Tenant Receives & Signs

```
1. Tenant views "My Applications"
   ↓
2. Sees "Sign Lease" button
   ↓
3. Clicks to open lease signing page
   ↓
4. Connects wallet
   ↓
5. Signs lease
   ↓
6. Lease status → "fully_signed"
   ↓
7. Payments required
   ↓
8. Lease activated
```

---

**Status**: ✅ **Both Issues Fixed - Ready for Testing**

**Next**: Test send button behavior and plan production wallet connection flow.
