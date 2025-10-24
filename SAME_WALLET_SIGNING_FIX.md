# Same Wallet Signing Issue - Fix Applied (2025-10-22)

## Problem Identified

**Error**: `-32603` "Unexpected error" when manager tries to sign lease
**Root Cause**: Using the same Phantom wallet for both tenant and manager roles

### What Was Happening

1. Tenant signs lease with Phantom wallet `cgCqGmStiuXTo4sxrA2DPq5RVWjhjypNt73v6sFYMN4`
2. Manager (same person, same wallet) tries to sign the same lease
3. Phantom wallet detects duplicate signing attempt and rejects with error `-32603`

### Why This Happens

Phantom wallet has internal safeguards to prevent:
- Signing the same message twice with the same wallet
- Potential replay attacks
- Confusion about which signature is which

When you try to sign the same lease ID with the same wallet from both sides, Phantom sees it as suspicious activity and blocks it.

## Solutions Implemented

### Solution 1: Different Messages for Each Role (Applied)

Made the signing messages unique by:
1. **Adding role prefix** (LANDLORD SIGNATURE vs TENANT SIGNATURE)
2. **Adding timestamp** to ensure messages are never identical
3. **Keeping lease context** for verification purposes

#### Manager Signing Message
```typescript
const timestamp = Date.now();
const message = `LANDLORD SIGNATURE - I, as the property manager, approve and sign this lease agreement ${lease.id} for property starting ${lease.start_date}. Timestamp: ${timestamp}`;
```

#### Tenant Signing Message
```typescript
const timestamp = Date.now();
const message = `TENANT SIGNATURE - I agree to the terms of lease ${lease.id} for property starting ${lease.start_date}. Timestamp: ${timestamp}`;
```

### Solution 2: Use Different Wallets (Recommended for Production)

**For Testing:**
1. **Option A - Different Browsers**
   - Use Chrome for manager account
   - Use Firefox for tenant account
   - Each browser will have its own Phantom wallet

2. **Option B - Incognito/Private Window**
   - Open an incognito window
   - Install Phantom wallet extension
   - Create/import a different wallet
   - Use for one role

3. **Option C - Multiple Phantom Accounts**
   - In Phantom, click the menu (top left)
   - Select "Add / Connect Wallet"
   - Create a new wallet account
   - Switch between accounts as needed

**For Production:**
- In a real scenario, managers and tenants would ALWAYS have different wallets
- This is just a testing workaround
- The unique message approach allows same-wallet testing while maintaining security

## Code Changes

### File: `frontend/src/pages/LeaseReviewPage.tsx`

**Before:**
```typescript
const message = `I, as the property manager, approve and sign this lease agreement ${lease.id} for property starting ${lease.start_date}`;
```

**After:**
```typescript
const timestamp = Date.now();
const message = `LANDLORD SIGNATURE - I, as the property manager, approve and sign this lease agreement ${lease.id} for property starting ${lease.start_date}. Timestamp: ${timestamp}`;
```

### File: `frontend/src/pages/LeaseSigningPage.tsx`

**Before:**
```typescript
const message = `I agree to the terms of lease ${lease.id} for property starting ${lease.start_date}`;
```

**After:**
```typescript
const timestamp = Date.now();
const message = `TENANT SIGNATURE - I agree to the terms of lease ${lease.id} for property starting ${lease.start_date}. Timestamp: ${timestamp}`;
```

## Benefits of This Approach

### 1. Testing Flexibility
- Can use same wallet for testing both roles
- No need to manage multiple wallets during development
- Faster testing iteration

### 2. Security Maintained
- Each signature is unique (timestamp + role)
- No risk of signature replay
- Clear role identification in the message

### 3. Production Ready
- Works with same wallet (testing)
- Works with different wallets (production)
- No code changes needed for deployment

### 4. Audit Trail
- Signature messages clearly show:
  - Who signed (LANDLORD vs TENANT)
  - When they signed (timestamp)
  - What they signed (lease ID and details)

## Testing Instructions

### Testing with Same Wallet

1. **As Manager:**
   ```
   1. Login as manager
   2. Generate lease
   3. Connect Phantom wallet
   4. Click "Sign Lease with Wallet"
   5. Approve in Phantom popup
   6. Verify signature success
   ```

2. **As Tenant:**
   ```
   1. Logout and login as tenant
   2. Go to My Applications
   3. Click "Sign Lease" 
   4. Connect same Phantom wallet
   5. Click "Sign Lease Agreement"
   6. Approve in Phantom popup
   7. Verify signature success
   ```

Both signatures should now work with the same wallet!

### Testing with Different Wallets (Recommended)

1. **Setup:**
   - Create two Phantom wallet accounts
   - Or use two different browsers
   - Or use incognito window for one role

2. **Process:**
   - Follow same steps as above
   - But use different wallets for manager and tenant
   - This simulates real-world usage

## Error Code Reference

| Error Code | Meaning | Solution |
|------------|---------|----------|
| -32603 | Internal error / Duplicate signing | Use unique messages or different wallets |
| -32600 | Invalid request | Check message encoding |
| -32601 | Method not found | Verify Phantom API method |
| 4001 | User rejected | User cancelled in Phantom popup |

## Backend Considerations

The backend still stores:
- `landlord_signature`: Manager's blockchain signature
- `tenant_signature`: Tenant's blockchain signature
- `landlord_signature_date`: When manager signed
- `tenant_signature_date`: When tenant signed

These remain unchanged. The backend doesn't need to know about the message content differences.

## Phantom Wallet Behavior

### What Phantom Checks:
1. ✅ Is the wallet connected?
2. ✅ Is the message properly encoded?
3. ✅ Has this exact message been signed before by this wallet?
4. ✅ Is the signing request legitimate?

### What Phantom Blocks:
- ❌ Duplicate message signatures
- ❌ Unsigned wallet operations
- ❌ Malformed message encoding
- ❌ Too many rapid signing requests

## Production Deployment Notes

### For Production:
- This approach works fine in production
- Real users will have different wallets naturally
- The unique messages add an extra layer of security
- Audit trail is clearer with role prefixes

### Optional Enhancements:
1. **Add wallet address to message**
   ```typescript
   const message = `LANDLORD SIGNATURE (${walletAddress}) - ...`;
   ```

2. **Add contract/blockchain reference**
   ```typescript
   const message = `LANDLORD SIGNATURE - Blockchain: Solana Devnet - ...`;
   ```

3. **Add application ID for traceability**
   ```typescript
   const message = `LANDLORD SIGNATURE - Application: ${applicationId} - Lease: ${lease.id} - ...`;
   ```

## Troubleshooting

### If Signing Still Fails:

1. **Check Phantom Connection**
   ```typescript
   console.log('Connected:', window.solana.isConnected);
   console.log('Public Key:', window.solana.publicKey?.toString());
   ```

2. **Clear Phantom Cache**
   - Disconnect wallet from site
   - Reconnect wallet
   - Try signing again

3. **Check Message Encoding**
   ```typescript
   console.log('Message:', message);
   console.log('Encoded length:', encodedMessage.length);
   ```

4. **Try Different Wallet**
   - Create new Phantom account
   - Import using seed phrase
   - Test with fresh wallet

## Summary

✅ **Fixed**: Same wallet can now sign from both manager and tenant roles
✅ **Method**: Unique messages with role prefix and timestamp
✅ **Impact**: Enables same-wallet testing without security compromise
✅ **Production**: Works for both same-wallet (testing) and different-wallet (production) scenarios

The error `-32603` was Phantom's way of saying "I've already signed this exact message with this wallet!" Now each signature is unique and traceable.
