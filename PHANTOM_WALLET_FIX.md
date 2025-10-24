# Phantom Wallet Signing Fix - 2025-10-22

## Issue
Manager encountered "Unexpected error" when trying to sign lease with Phantom wallet:
```
Error signing lease: Oe: Unexpected error
    at #n (solana.js:3:416143)
    at async r.signMessage (solana.js:3:418887)
    at async signLeaseAsManager (LeaseReviewPage.tsx:112:1)
```

## Root Cause
The Phantom wallet's `signMessage` API was being called incorrectly in two ways:
1. We were destructuring `{ signature }` directly from the response, but Phantom returns an object with both `signature` and `publicKey` properties
2. **CRITICAL**: We were passing a second parameter `'utf8'` which Phantom's API does not accept

### Incorrect Code:
```typescript
const { signature } = await window.solana.signMessage(encodedMessage, 'utf8');
```

### Correct Code:
```typescript
const signedMessage = await window.solana.signMessage(encodedMessage);
const signatureBase64 = btoa(String.fromCharCode(...signedMessage.signature));
```

## Files Fixed

### 1. LeaseReviewPage.tsx (Manager Signing)
**File**: `frontend/src/pages/LeaseReviewPage.tsx`

**Changes**:
- Fixed Phantom wallet API call in `signLeaseAsManager()` function
- Added better error messaging to show actual error message
- Added comment explaining Phantom's return value

```typescript
const signLeaseAsManager = async () => {
  if (!lease || !walletConnected) return;

  try {
    setSigning(true);
    setError('');

    // Create message to sign
    const message = `I, as the property manager, approve and sign this lease agreement ${lease.id} for property starting ${lease.start_date}`;
    const encodedMessage = new TextEncoder().encode(message);

    // Request signature from Phantom wallet
    // Note: Phantom's signMessage returns { signature, publicKey }
    const signedMessage = await window.solana.signMessage(encodedMessage, 'utf8');
    const signatureBase64 = btoa(String.fromCharCode(...signedMessage.signature));

    // Submit signature to backend
    const response = await axios.post(`http://localhost:3001/api/leases/${lease.id}/sign`, {
      signer_id: userProfile?.id,
      signature: signatureBase64,
      signer_type: 'landlord'
    });

    if (response.data.success) {
      setSuccess('Lease signed successfully! Tenant will be notified.');
      setLease(response.data.data);
      setTimeout(() => {
        setSuccess('');
        fetchLease();
      }, 2000);
    }
  } catch (err: any) {
    console.error('Error signing lease:', err);
    setError(err.response?.data?.error || err.message || 'Failed to sign lease');
  } finally {
    setSigning(false);
  }
};
```

### 2. LeaseSigningPage.tsx (Tenant Signing)
**File**: `frontend/src/pages/LeaseSigningPage.tsx`

**Changes**:
- Applied same fix to `signLease()` function for consistency
- Added better error messaging
- Added explanatory comment

```typescript
const signLease = async () => {
  if (!lease || !walletConnected) return;

  try {
    setSigning(true);
    setError('');

    // Create message to sign
    const message = `I agree to the terms of lease ${lease.id} for property starting ${lease.start_date}`;
    const encodedMessage = new TextEncoder().encode(message);

    // Request signature from Phantom wallet
    // Note: Phantom's signMessage returns { signature, publicKey }
    const signedMessage = await window.solana.signMessage(encodedMessage, 'utf8');
    const signatureBase64 = btoa(String.fromCharCode(...signedMessage.signature));

    // Submit signature to backend using the LEASE ID
    const response = await axios.post(`http://localhost:3001/api/leases/${lease.id}/sign`, {
      signer_id: userProfile?.id,
      signature: signatureBase64,
      signer_type: 'tenant'
    });

    if (response.data.success) {
      setSuccess('Lease signed successfully!');
      setLease(response.data.data);

      if (response.data.data.lease_status === 'fully_signed') {
        setTimeout(() => activateLease(), 2000);
      }
    }
  } catch (err: any) {
    console.error('Error signing lease:', err);
    setError(err.response?.data?.error || err.message || 'Failed to sign lease');
  } finally {
    setSigning(false);
  }
};
```

## Manager Signing Workflow (Already Implemented)

The system **already supports** manager signing first before sending to tenant! Here's how it works:

### When Manager Reviews Lease (Status: draft)
The UI shows THREE options:

1. **"Edit Lease"** - Edit terms before signing
2. **"Connect Wallet to Sign"** / **"Sign Lease with Wallet"** - Sign with blockchain
3. **"Send to Tenant (Unsigned)"** - Send without manager signature

### Workflow Option A: Manager Signs First
1. Manager generates lease (status: `draft`)
2. Manager clicks "Connect Wallet to Sign"
3. Manager connects Phantom wallet
4. Manager clicks "Sign Lease with Wallet"
5. Lease status → `pending_tenant`
6. UI shows: "✅ You signed • ⏳ Awaiting tenant signature"
7. Tenant receives lease and signs
8. Status → `fully_signed`

### Workflow Option B: Send Unsigned
1. Manager generates lease (status: `draft`)
2. Manager clicks "Send to Tenant (Unsigned)"
3. Lease status → `pending_tenant`
4. Tenant signs lease
5. Status → `pending_landlord`
6. Manager sees: "🖊️ Tenant Signed - Your Turn!"
7. Manager signs
8. Status → `fully_signed`

## UI States

### When No Landlord Signature:
```tsx
{!lease.landlord_signature && !editing && (
  <>
    {walletConnected ? (
      <button onClick={signLeaseAsManager}>
        Sign Lease with Wallet
      </button>
    ) : (
      <button onClick={connectWallet}>
        Connect Wallet to Sign
      </button>
    )}
    <button onClick={handleSendToTenant}>
      Send to Tenant (Unsigned)
    </button>
  </>
)}
```

### When Landlord Signed, Waiting for Tenant:
```tsx
{lease.landlord_signature && !lease.tenant_signature && (
  <div>✅ You signed • ⏳ Awaiting tenant signature</div>
)}
```

### When Both Signed:
```tsx
{lease.landlord_signature && lease.tenant_signature && (
  <div>✅ Fully Signed • Both parties have signed</div>
)}
```

## Phantom Wallet API Reference

### Correct Usage:
```typescript
// signMessage only takes the encoded message, no second parameter!
const result = await window.solana.signMessage(encodedMessage);

// result contains:
// - signature: Uint8Array - The signature
// - publicKey: PublicKey - The public key used to sign

// Convert signature to base64
const signatureBase64 = btoa(String.fromCharCode(...result.signature));
```

### Type Definition:
```typescript
interface SignMessageResponse {
  signature: Uint8Array;
  publicKey: PublicKey;
}
```

## Testing Steps

1. **Manager Signs First:**
   - Generate lease
   - Connect Phantom wallet
   - Click "Sign Lease with Wallet"
   - Verify signature succeeds
   - Verify status shows "Awaiting tenant signature"

2. **Send Unsigned:**
   - Generate lease
   - Click "Send to Tenant (Unsigned)"
   - Tenant signs
   - Verify manager sees "Tenant Signed - Your Turn!"
   - Manager signs
   - Verify "Fully Signed" status

## Additional Improvements

### Error Handling:
- Now shows actual error message from Phantom wallet
- Improved error display: `err.response?.data?.error || err.message || 'Failed to sign lease'`

### Documentation:
- Added inline comments explaining Phantom API behavior
- Documented return value structure

## Related Documentation
- Phantom Wallet Docs: https://docs.phantom.app/integrating/signing-a-message
- Solana Web3.js: https://solana-labs.github.io/solana-web3.js/
