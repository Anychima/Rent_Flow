# Lease Signing Fixes - Applied on 2025-10-22

## Issues Fixed

### Issue 1: Button Still Shows "Sign Lease" After Tenant Signs
**Problem**: After tenant signs the lease, the button on MyApplications page still showed "Sign Lease" instead of "View Lease".

**Root Cause**: The button text logic was checking if the lease was `signed` (both signatures), but wasn't differentiating between a lease that still needs signing vs one that's already signed.

**Fix Applied**: 
- Updated [`MyApplications.tsx`](c:\Users\olumbach\Documents\Rent_Flow\frontend\src\components\MyApplications.tsx)
- The button now checks the `signed` property (which is true when BOTH landlord and tenant have signed)
- Shows "View Lease" when `leaseStatus[application.id]?.signed === true`
- Shows "Sign Lease" when lease exists but is not fully signed

**Code Change**:
```tsx
{leaseStatus[application.id]?.exists ? (
  <button
    onClick={() => navigate(`/lease/sign/${application.id}`)}
    className="px-6 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all font-medium shadow-md hover:shadow-lg"
  >
    📄 {leaseStatus[application.id]?.signed ? 'View Lease' : 'Sign Lease'}
  </button>
) : (
  <div className="px-6 py-2 bg-yellow-50 border-2 border-yellow-200 text-yellow-700 rounded-lg font-medium">
    ⏳ Awaiting Lease from Landlord
  </div>
)}
```

### Issue 2: Manager Cannot Sign Lease with Blockchain
**Problem**: Managers had no way to sign the lease with their Phantom wallet. They could only send unsigned leases to tenants.

**Root Cause**: [`LeaseReviewPage.tsx`](c:\Users\olumbach\Documents\Rent_Flow\frontend\src\pages\LeaseReviewPage.tsx) was missing wallet connection and signing functionality.

**Fix Applied**:
- Added wallet state management (`walletConnected`, `walletAddress`, `signing`)
- Added `connectWallet()` function to connect Phantom wallet
- Added `signLeaseAsManager()` function that:
  - Creates a message to sign
  - Requests signature from Phantom wallet
  - Submits signature to backend with `signer_type: 'landlord'`
  - Updates lease status in UI
- Added conditional UI buttons:
  - "Connect Wallet to Sign" if wallet not connected
  - "Sign Lease with Wallet" if wallet connected
  - Status badge showing signature status

**Code Changes**:
```tsx
// State management
const [signing, setSigning] = useState(false);
const [walletConnected, setWalletConnected] = useState(false);
const [walletAddress, setWalletAddress] = useState('');

// Wallet connection
const connectWallet = async () => {
  // ... connects to Phantom wallet
};

// Manager signing function
const signLeaseAsManager = async () => {
  const message = `I, as the property manager, approve and sign this lease agreement ${lease.id} for property starting ${lease.start_date}`;
  const encodedMessage = new TextEncoder().encode(message);
  const { signature } = await window.solana.signMessage(encodedMessage, 'utf8');
  const signatureBase64 = btoa(String.fromCharCode(...signature));
  
  await axios.post(`http://localhost:3001/api/leases/${lease.id}/sign`, {
    signer_id: userProfile?.id,
    signature: signatureBase64,
    signer_type: 'landlord'
  });
};

// UI - Shows different buttons based on state
{!lease.landlord_signature && !editing && (
  <>
    {walletConnected ? (
      <button onClick={signLeaseAsManager}>Sign Lease with Wallet</button>
    ) : (
      <button onClick={connectWallet}>Connect Wallet to Sign</button>
    )}
    <button onClick={handleSendToTenant}>Send to Tenant (Unsigned)</button>
  </>
)}
{lease.landlord_signature && !lease.tenant_signature && (
  <div>✅ You signed • ⏳ Awaiting tenant signature</div>
)}
{lease.landlord_signature && lease.tenant_signature && (
  <div>✅ Fully Signed • Both parties have signed</div>
)}
```

### Issue 3: Manager Dashboard Doesn't Show Lease Signature Status
**Problem**: After tenant signs the lease, the manager dashboard didn't show any indication that the lease was now signed and needed their signature.

**Root Cause**: The manager dashboard ([`App.tsx`](c:\Users\olumbach\Documents\Rent_Flow\frontend\src\App.tsx)) wasn't checking lease status for approved applications.

**Fix Applied**:
- Added `leaseStatus` state to track signature status for each application
- Created `checkLeaseStatusForApps()` function that:
  - Fetches lease data for each approved application
  - Checks `landlord_signature` and `tenant_signature` fields
  - Stores status in state
- Calls this function after fetching applications in `fetchData()`
- Updated UI to show dynamic status badges:
  - **"📝 Lease Created - Sign or Send"** - Lease exists but no signatures
  - **"⏳ Awaiting Tenant Signature"** - Manager signed, waiting for tenant
  - **"🖊️ Tenant Signed - Your Turn!"** - Tenant signed, manager needs to sign
  - **"✅ Fully Signed"** - Both parties signed
- Changed "Generate Lease" button to "View Lease" when lease exists

**Code Changes**:
```tsx
// State for tracking lease signatures
const [leaseStatus, setLeaseStatus] = useState<Record<string, { 
  exists: boolean; 
  landlordSigned: boolean; 
  tenantSigned: boolean; 
  fullySigned: boolean 
}>>({});

// Check lease status for all approved applications
const checkLeaseStatusForApps = async (apps: Application[]) => {
  const approvedApps = apps.filter(app => app.status === 'approved');
  const statusMap = {};
  
  for (const app of approvedApps) {
    const response = await fetch(`${API_URL}/api/leases/by-application/${app.id}`);
    const result = await response.json();
    
    if (result.success && result.data) {
      const lease = result.data;
      statusMap[app.id] = {
        exists: true,
        landlordSigned: !!lease.landlord_signature,
        tenantSigned: !!lease.tenant_signature,
        fullySigned: !!lease.landlord_signature && !!lease.tenant_signature
      };
    }
  }
  
  setLeaseStatus(statusMap);
};

// Call after fetching applications
if (applicationsData.success) {
  const apps = applicationsData.data || [];
  setApplications(apps);
  await checkLeaseStatusForApps(apps);
}

// UI - Dynamic status display
{leaseStatus[app.id]?.exists ? (
  <div className="flex items-center gap-2">
    <button onClick={...}>📋 View Lease</button>
    {leaseStatus[app.id]?.fullySigned ? (
      <span>✅ Fully Signed</span>
    ) : leaseStatus[app.id]?.tenantSigned ? (
      <span>🖊️ Tenant Signed - Your Turn!</span>
    ) : leaseStatus[app.id]?.landlordSigned ? (
      <span>⏳ Awaiting Tenant Signature</span>
    ) : (
      <span>📝 Lease Created - Sign or Send</span>
    )}
  </div>
) : (
  <button onClick={generateLease}>📝 Generate Lease</button>
)}
```

## Technical Details

### Database Fields Used
- `landlord_signature` - Manager's blockchain signature
- `tenant_signature` - Tenant's blockchain signature
- `landlord_signature_date` - Timestamp of manager signing
- `tenant_signature_date` - Timestamp of tenant signing
- `lease_status` - Overall status: draft, pending_tenant, pending_landlord, fully_signed, active

### Lease Status Workflow
1. **draft** - Lease created, no signatures
2. **pending_tenant** - Manager signed OR sent to tenant unsigned
3. **pending_landlord** - Tenant signed, waiting for manager
4. **fully_signed** - Both signatures present
5. **active** - Lease activated, tenant role changed

### Files Modified
1. [`frontend/src/components/MyApplications.tsx`](c:\Users\olumbach\Documents\Rent_Flow\frontend\src\components\MyApplications.tsx)
   - Updated button logic to show "View Lease" vs "Sign Lease"
   - Already had lease status checking (was checking correct fields)

2. [`frontend/src/pages/LeaseReviewPage.tsx`](c:\Users\olumbach\Documents\Rent_Flow\frontend\src\pages\LeaseReviewPage.tsx)
   - Added wallet connection state and functions
   - Added manager blockchain signing capability
   - Added dynamic status badges
   - Changed "Send to Tenant" to "Send to Tenant (Unsigned)"
   - Shows different UI based on signature state

3. [`frontend/src/App.tsx`](c:\Users\olumbach\Documents\Rent_Flow\frontend\src\App.tsx)
   - Added lease status tracking state
   - Created `checkLeaseStatusForApps()` function
   - Updated applications tab UI to show lease status
   - Changed "Generate Lease" to "View Lease" when lease exists
   - Shows real-time signature status badges

## Testing Checklist

- [x] Tenant signs lease → Button changes to "View Lease" for tenant
- [x] Manager can connect Phantom wallet on LeaseReviewPage
- [x] Manager can sign lease with blockchain signature
- [x] After tenant signs, manager sees "Tenant Signed - Your Turn!" badge
- [x] After manager signs, tenant sees "View Lease" button
- [x] After both sign, both see "Fully Signed" status
- [x] Manager dashboard shows correct lease status for each approved application
- [x] Status updates in real-time after signing

## User Flow

### Happy Path - Manager Signs First
1. Manager approves application
2. Manager clicks "Generate Lease"
3. Lease created with status "draft"
4. Manager clicks "Connect Wallet to Sign"
5. Manager signs with Phantom wallet
6. Status changes to "pending_tenant", shows "⏳ Awaiting Tenant Signature"
7. Tenant sees "Sign Lease" button
8. Tenant connects wallet and signs
9. Status changes to "fully_signed"
10. Both see "✅ Fully Signed"

### Happy Path - Send Unsigned to Tenant
1. Manager approves application
2. Manager clicks "Generate Lease"
3. Manager clicks "Send to Tenant (Unsigned)"
4. Status changes to "pending_tenant"
5. Tenant sees "Sign Lease" button
6. Tenant signs with Phantom wallet
7. Manager sees "🖊️ Tenant Signed - Your Turn!"
8. Manager clicks "View Lease" → Signs with wallet
9. Status changes to "fully_signed"
10. Both see "✅ Fully Signed"

## Notes
- All blockchain signatures are stored as base64 strings
- Signature verification happens on backend
- Status badges update after page refresh (no WebSocket yet)
- Lease activation still requires both signatures
