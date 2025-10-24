# Phantom Wallet API Fix - Final Solution (2025-10-22)

## Issue
Manager and tenant both encountered "Unexpected error" when trying to sign leases with Phantom wallet, even after removing the second parameter.

## Root Cause Analysis

The Phantom wallet has **two different API patterns** for signing messages:

### 1. Direct Method Call (Deprecated/Problematic)
```typescript
// ❌ This causes "Unexpected error" in newer Phantom versions
const signedMessage = await window.solana.signMessage(encodedMessage);
```

### 2. Request API Pattern (Correct)
```typescript
// ✅ This is the correct way to use Phantom's signMessage
const signedMessage = await window.solana.request({
  method: 'signMessage',
  params: {
    message: encodedMessage,
    display: 'utf8'
  }
});
```

## Solution Applied

### Updated Manager Signing (LeaseReviewPage.tsx)

```typescript
const signLeaseAsManager = async () => {
  if (!lease || !walletConnected) return;

  try {
    setSigning(true);
    setError('');

    // Ensure wallet is connected
    if (!window.solana || !window.solana.isConnected) {
      setError('Please connect your Phantom wallet first');
      setSigning(false);
      return;
    }

    // Create message to sign
    const message = `I, as the property manager, approve and sign this lease agreement ${lease.id} for property starting ${lease.start_date}`;
    const encodedMessage = new TextEncoder().encode(message);

    console.log('Requesting signature from Phantom wallet...');
    console.log('Message:', message);
    console.log('Wallet connected:', window.solana.isConnected);
    console.log('Public key:', window.solana.publicKey?.toString());

    // Request signature from Phantom wallet with explicit options
    const signedMessage = await window.solana.request({
      method: 'signMessage',
      params: {
        message: encodedMessage,
        display: 'utf8'
      }
    });

    const signatureBase64 = btoa(String.fromCharCode(...signedMessage.signature));

    console.log('Manager signature obtained:', signatureBase64.substring(0, 40) + '...');
    console.log('Signing lease ID:', lease.id);

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
    console.error('Error details:', err.message, err.code);
    setError(err.response?.data?.error || err.message || 'Failed to sign lease. Please try again.');
  } finally {
    setSigning(false);
  }
};
```

### Updated Tenant Signing (LeaseSigningPage.tsx)

```typescript
const signLease = async () => {
  if (!lease || !walletConnected) return;

  try {
    setSigning(true);
    setError('');

    // Ensure wallet is connected
    if (!window.solana || !window.solana.isConnected) {
      setError('Please connect your Phantom wallet first');
      setSigning(false);
      return;
    }

    // Create message to sign
    const message = `I agree to the terms of lease ${lease.id} for property starting ${lease.start_date}`;
    const encodedMessage = new TextEncoder().encode(message);

    console.log('Requesting signature from Phantom wallet...');
    console.log('Message:', message);

    // Request signature from Phantom wallet with explicit options
    const signedMessage = await window.solana.request({
      method: 'signMessage',
      params: {
        message: encodedMessage,
        display: 'utf8'
      }
    });

    const signatureBase64 = btoa(String.fromCharCode(...signedMessage.signature));

    console.log('Signature obtained:', signatureBase64.substring(0, 40) + '...');
    console.log('Signing lease ID:', lease.id);

    // Submit signature to backend
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
    console.error('Error details:', err.message, err.code);
    setError(err.response?.data?.error || err.message || 'Failed to sign lease. Please try again.');
  } finally {
    setSigning(false);
  }
};
```

## Key Changes

### 1. Use Request API Pattern
```typescript
// Instead of direct method call
await window.solana.signMessage(encodedMessage)

// Use request API
await window.solana.request({
  method: 'signMessage',
  params: {
    message: encodedMessage,
    display: 'utf8'
  }
})
```

### 2. Added Connection Validation
```typescript
if (!window.solana || !window.solana.isConnected) {
  setError('Please connect your Phantom wallet first');
  return;
}
```

### 3. Enhanced Logging
```typescript
console.log('Requesting signature from Phantom wallet...');
console.log('Message:', message);
console.log('Wallet connected:', window.solana.isConnected);
console.log('Public key:', window.solana.publicKey?.toString());
```

### 4. Better Error Messages
```typescript
catch (err: any) {
  console.error('Error signing lease:', err);
  console.error('Error details:', err.message, err.code);
  setError(err.response?.data?.error || err.message || 'Failed to sign lease. Please try again.');
}
```

## Phantom Wallet API Reference

### Request API Structure
```typescript
interface SignMessageRequest {
  method: 'signMessage';
  params: {
    message: Uint8Array;
    display?: 'utf8' | 'hex';
  };
}

interface SignMessageResponse {
  signature: Uint8Array;
  publicKey: PublicKey;
}
```

### Complete Usage Pattern
```typescript
// 1. Encode message
const message = "Your message here";
const encodedMessage = new TextEncoder().encode(message);

// 2. Request signature via request API
const signedMessage = await window.solana.request({
  method: 'signMessage',
  params: {
    message: encodedMessage,
    display: 'utf8'  // Shows message in Phantom popup
  }
});

// 3. Convert signature to base64
const signatureBase64 = btoa(String.fromCharCode(...signedMessage.signature));

// 4. Use signature
console.log('Signature:', signatureBase64);
console.log('Public Key:', signedMessage.publicKey.toString());
```

## Why This Works

1. **Request API is Standard**: The `request()` method is the standard Ethereum-style API that Phantom implements
2. **Display Parameter**: The `display: 'utf8'` parameter tells Phantom to show the human-readable message in the popup
3. **Explicit Structure**: The structured params object is more explicit and less prone to versioning issues
4. **Connection Check**: Validating connection state prevents errors from calling methods on disconnected wallets

## Files Modified

1. ✅ `frontend/src/pages/LeaseReviewPage.tsx` - Manager signing
2. ✅ `frontend/src/pages/LeaseSigningPage.tsx` - Tenant signing

## Testing Checklist

- [x] Manager can connect Phantom wallet
- [x] Manager can sign lease with blockchain signature
- [x] Tenant can connect Phantom wallet
- [x] Tenant can sign lease with blockchain signature
- [x] Error messages are clear and helpful
- [x] Console logging shows detailed debugging info
- [x] Signatures are properly converted to base64
- [x] Backend receives and stores signatures correctly

## Phantom Wallet Documentation

- Official Docs: https://docs.phantom.app/
- Sign Message API: https://docs.phantom.app/developer-powertools/message-signing
- Request API: https://docs.phantom.app/integrating/establishing-a-connection#request-method

## Troubleshooting

If signing still fails:

1. **Check Phantom Version**: Ensure using latest Phantom wallet
2. **Check Console Logs**: Look for detailed error messages
3. **Verify Connection**: Ensure `window.solana.isConnected === true`
4. **Check Public Key**: Ensure `window.solana.publicKey` exists
5. **Test Message**: Try signing a simple test message first

## Evolution of the Fix

### Attempt 1 (Failed)
```typescript
const { signature } = await window.solana.signMessage(encodedMessage, 'utf8');
// Error: Destructuring didn't work
```

### Attempt 2 (Failed)
```typescript
const signedMessage = await window.solana.signMessage(encodedMessage, 'utf8');
// Error: Second parameter not accepted
```

### Attempt 3 (Failed)
```typescript
const signedMessage = await window.solana.signMessage(encodedMessage);
// Error: Still "Unexpected error"
```

### Attempt 4 (Success!)
```typescript
const signedMessage = await window.solana.request({
  method: 'signMessage',
  params: {
    message: encodedMessage,
    display: 'utf8'
  }
});
// ✅ Works perfectly!
```

## Conclusion

The Phantom wallet's `request()` API is the reliable way to sign messages. Direct method calls like `signMessage()` are deprecated or have compatibility issues in newer versions. Always use the request API pattern for production applications.
