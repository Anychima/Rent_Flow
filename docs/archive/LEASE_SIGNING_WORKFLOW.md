# 📋 Lease Signing Workflow - Complete Guide

## 🎯 Overview

The lease signing workflow enables digital lease agreements with blockchain signatures on Solana. This document explains the complete end-to-end process.

---

## 🔄 Complete Workflow

### **Step 1: Application Approval**
1. **Login as Manager**: `manager@rentflow.ai`
2. **Navigate to Applications Tab**
3. **Review Applications**: View AI scores and applicant details
4. **Approve Application**: Click "✓ Approve" button
5. **Generate Lease**: Click "📝 Generate Lease" for approved application

### **Step 2: Lease Generation** (Backend)
**API Endpoint**: `POST /api/leases/generate`

**What Happens:**
- System retrieves approved application with property and applicant data
- Calculates lease dates (default: 1-year lease from move-in date)
- Generates comprehensive lease terms including:
  - Property details (address, bedrooms, bathrooms, amenities)
  - Financial terms (rent, security deposit, late fees)
  - Standard clauses (maintenance, subletting, utilities)
  - Special terms (pets, parking, etc.)
- Creates lease record with status `pending_tenant`
- Returns lease ID for signing

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "lease-uuid",
    "application_id": "app-uuid",
    "property_id": "property-uuid",
    "tenant_id": "tenant-uuid",
    "lease_status": "pending_tenant",
    "monthly_rent_usdc": 1500,
    "lease_terms": { ... }
  }
}
```

---

### **Step 3: Tenant Signs Lease**
1. **Logout from Manager Account**
2. **Login as Prospective Tenant**: Use demo account (e.g., `sarah.johnson@example.com`)
3. **Navigate to My Applications**: Click user menu → "My Applications"
4. **View Approved Application**: Find your approved application
5. **Click "📄 Sign Lease"** button

### **Step 4: Digital Signing Process**
**Page**: `/lease/sign/:leaseId`

1. **Review Lease Document**:
   - Property details and address
   - Lease period (start/end dates)
   - Financial terms (rent, deposit, late fees)
   - Standard clauses and special terms
   - Signatures section

2. **Connect Wallet**:
   - Click "Connect Phantom Wallet"
   - Phantom extension opens
   - Approve connection
   - Wallet address displayed

3. **Sign Lease**:
   - Click "Sign Lease Agreement"
   - Phantom prompts for message signature
   - Message: "I agree to the terms of lease {id} for property starting {date}"
   - Approve signature in Phantom
   - Signature submitted to blockchain

**API Endpoint**: `POST /api/leases/:id/sign`

**Request:**
```json
{
  "signer_id": "tenant-uuid",
  "signature": "base64-encoded-signature",
  "signer_type": "tenant"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "lease-uuid",
    "lease_status": "pending_landlord",  // or "fully_signed" if landlord already signed
    "tenant_signature": "base64-signature",
    "tenant_signature_date": "2025-10-22T18:30:00.000Z"
  }
}
```

---

### **Step 5: Lease Activation & Role Transition**
**Trigger**: Automatically when both parties sign (or can be manual)

**API Endpoint**: `POST /api/leases/:id/activate`

**What Happens:**
1. Verify lease is `fully_signed`
2. Update lease status to `active`
3. **Role Transition**: Update user record
   ```sql
   UPDATE users 
   SET role = 'tenant', user_type = 'tenant'
   WHERE id = {tenant_id}
   ```
4. Record activation timestamp

**Result:**
- User transitions from `prospective_tenant` → `tenant`
- Gains access to Tenant Dashboard
- Can view lease, make payments, submit maintenance requests

---

## 🗄️ Database Schema

### **Enhanced Leases Table**
```sql
CREATE TABLE leases (
  id UUID PRIMARY KEY,
  application_id UUID REFERENCES property_applications(id),
  property_id UUID REFERENCES properties(id),
  tenant_id UUID REFERENCES users(id),
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  generated_at TIMESTAMP,
  activated_at TIMESTAMP,
  
  -- Financial
  monthly_rent_usdc DECIMAL(20,6),
  security_deposit_usdc DECIMAL(20,6),
  rent_due_day INTEGER,
  
  -- Status
  lease_status TEXT CHECK (lease_status IN (
    'draft', 'pending_tenant', 'pending_landlord', 
    'fully_signed', 'active', 'expired', 'terminated'
  )),
  
  -- Signatures
  tenant_signature TEXT,
  tenant_signature_date TIMESTAMP,
  landlord_signature TEXT,
  landlord_signature_date TIMESTAMP,
  signature_transaction_hash TEXT,
  signature_blockchain_network TEXT DEFAULT 'solana',
  
  -- Content
  lease_document_url TEXT,
  lease_document_hash TEXT,
  lease_terms JSONB,
  special_terms JSONB,
  auto_renew BOOLEAN DEFAULT FALSE
);
```

---

## 🎨 Frontend Components

### **1. LeaseDocument.tsx**
**Purpose**: Display formatted lease agreement

**Features**:
- Beautiful PDF-style layout
- Color-coded sections (property, financial, parties)
- Signature status indicators
- Responsive design

**Props**:
```typescript
interface LeaseDocumentProps {
  lease: Lease;
}
```

---

### **2. LeaseSigningPage.tsx**
**Purpose**: Digital signing interface with wallet integration

**Features**:
- Wallet connection (Phantom)
- Message signing flow
- Real-time status updates
- Auto-activation after signing

**Key Functions**:
```typescript
connectWallet()    // Connect Phantom wallet
signLease()        // Sign with wallet and submit
activateLease()    // Transition tenant role
```

---

## 🔐 Blockchain Signature Flow

### **Phantom Wallet Integration**

1. **Check for Phantom**:
```typescript
if (window.solana && window.solana.isPhantom) {
  // Wallet available
}
```

2. **Connect Wallet**:
```typescript
const response = await window.solana.connect();
const walletAddress = response.publicKey.toString();
```

3. **Sign Message**:
```typescript
const message = `I agree to the terms of lease ${leaseId}...`;
const encodedMessage = new TextEncoder().encode(message);
const { signature } = await window.solana.signMessage(encodedMessage, 'utf8');
const signatureBase64 = btoa(String.fromCharCode(...signature));
```

4. **Verify on Backend**:
- Store signature in database
- Update lease status
- Trigger role transition if fully signed

---

## 📊 Lease Statuses

| Status | Description | Who Can Access |
|--------|-------------|----------------|
| `draft` | Lease generated but not sent | Manager only |
| `pending_tenant` | Waiting for tenant signature | Tenant + Manager |
| `pending_landlord` | Waiting for landlord signature | Manager only |
| `fully_signed` | Both parties signed | Both parties |
| `active` | Lease activated, tenant transitioned | Both parties |
| `expired` | Lease term ended naturally | Both parties (read-only) |
| `terminated` | Lease ended early | Both parties (read-only) |

---

## 🧪 Testing the Complete Flow

### **Prerequisites**:
1. ✅ Frontend running on `localhost:3000`
2. ✅ Backend running on `localhost:3001`
3. ✅ Supabase database migrations applied
4. ✅ Phantom wallet browser extension installed
5. ✅ Demo accounts created (manager + prospective tenants)

### **Test Scenario**:

**Part 1: Manager Approves & Generates Lease**
```bash
1. Login as manager@rentflow.ai
2. Go to Applications tab
3. Find application by Sarah Johnson (score: 92.5)
4. Click "✓ Approve"
5. Click "📝 Generate Lease"
6. Note the success message with Lease ID
```

**Part 2: Tenant Signs Lease**
```bash
7. Logout from manager account
8. Login as sarah.johnson@example.com (password: demo123)
9. Click "My Applications" in user menu
10. Find approved application
11. Click "📄 Sign Lease" button
12. Review lease document
13. Click "Connect Phantom Wallet"
14. Approve connection in Phantom
15. Click "Sign Lease Agreement"
16. Approve signature in Phantom
17. Wait for success message
```

**Part 3: Role Transition**
```bash
18. If auto-activated, wait for redirect
19. Should now see Tenant Dashboard (not property listings)
20. Verify user role changed from prospective_tenant to tenant
```

**Verify in Database**:
```sql
-- Check lease record
SELECT id, lease_status, tenant_signature, activated_at 
FROM leases 
WHERE tenant_id = '<sarah-user-id>';

-- Check user role transition
SELECT id, email, role, user_type 
FROM users 
WHERE email = 'sarah.johnson@example.com';
```

---

## 🚨 Troubleshooting

### **Issue: "Connect Phantom Wallet" button doesn't work**
**Solution**: 
- Install Phantom wallet extension: https://phantom.app/
- Refresh the page after installation

### **Issue: Signature fails with error**
**Solution**:
- Check that wallet is connected
- Ensure you're using the correct network (Solana Mainnet/Devnet)
- Check browser console for errors

### **Issue: Role doesn't transition after signing**
**Solution**:
- Check backend logs for activation errors
- Verify lease status is `fully_signed`
- Manually call activation endpoint if needed:
  ```bash
  curl -X POST http://localhost:3001/api/leases/{lease-id}/activate
  ```

### **Issue: "Lease not found" error**
**Solution**:
- Verify the lease was generated successfully
- Check the lease ID in the URL matches database
- Ensure migrations were run (`005_lease_signing_enhancement.sql`)

---

## 🔗 Related Files

### **Backend**:
- `backend/src/index.ts` - Lease API endpoints (lines 2726-3120)
- `database/migrations/005_lease_signing_enhancement.sql` - Database schema

### **Frontend**:
- `frontend/src/pages/LeaseSigningPage.tsx` - Signing interface
- `frontend/src/components/LeaseDocument.tsx` - Lease display
- `frontend/src/components/MyApplications.tsx` - Shows "Sign Lease" button
- `frontend/src/App.tsx` - Routing and manager dashboard "Generate Lease" button

---

## 📝 Next Steps

After lease signing is working:
1. ✅ **Tenant Dashboard** - Build full tenant view with payments and maintenance
2. **Payment Integration** - Connect lease to automated rent payments
3. **Voice Notifications** - Send welcome message to new tenants (ElevenLabs)
4. **Smart Contract** - Deploy lease terms to Solana smart contract
5. **PDF Generation** - Generate downloadable PDF of signed lease

---

## 🎉 Success Criteria

The lease signing workflow is complete when:
- ✅ Manager can generate lease from approved application
- ✅ Tenant receives lease and can view all terms
- ✅ Tenant can connect Phantom wallet
- ✅ Tenant can digitally sign with blockchain signature
- ✅ Signature is recorded in database with timestamp
- ✅ User role automatically transitions to `tenant`
- ✅ Tenant dashboard becomes accessible after signing
- ✅ Property listings view is replaced with tenant features

---

**Created**: 2025-10-22  
**Version**: 1.0  
**Status**: Implementation Complete ✅
