# Wallet Connection & Chat Continuity Implementation Plan

## 🎯 Issues Identified

### Issue 1: Wallet Connection Timing is Unclear
**Problem**: Currently, wallets are only connected during lease signing, but payment happens AFTER signing.

**Current Flow** (Incorrect):
1. Prospective tenant signs lease (connects wallet)
2. Lease becomes fully_signed
3. Payment records created (security deposit + first month rent)
4. Tenant needs to pay but wallet connection is lost
5. Confusion about when/where to connect wallet for payment

**Correct Flow Should Be**:
1. Manager signs lease
2. Tenant signs lease (connects wallet for signing)
3. **Wallet stays connected for immediate payment**
4. Tenant completes both required payments using same wallet session
5. Once payments complete → lease activates → role transitions to tenant

---

### Issue 2: Chat Loses Context After Lease Signing
**Problem**: Chat is currently tied to `application_id` only, but after lease is signed, the application is "complete" and chat should continue on the lease.

**Current Structure**:
```typescript
// ChatBox tied to application only
interface ChatBoxProps {
  applicationId: string;  // ❌ Lost after lease signing
  ...
}
```

**Database**:
```sql
messages table:
  - application_id UUID  // ✅ Exists for pre-lease chat
  - lease_id UUID        // ❌ MISSING - need to add this!
```

**Expected Behavior**:
- **Pre-lease**: Chat attached to `application_id`
- **Post-lease**: Same chat continues, now attached to `lease_id`
- **UI Indicator**: Badge showing "Chat moved to Lease #123"
- **Completed Application**: Shows minimal UI, directs to lease for active communication

---

## 🔧 Solutions

### Solution 1: Seamless Wallet-to-Payment Flow

#### A. Modify Lease Signing Flow

**Current State**:
```typescript
// LeaseSigningPage.tsx
const signLease = async () => {
  // Signs lease
  // Redirects to dashboard (❌ loses wallet connection)
}
```

**New State**:
```typescript
const signLease = async () => {
  // Signs lease
  const response = await signLeaseAPI();
  
  if (response.requires_payment) {
    // ✅ Show payment UI immediately
    setShowPaymentUI(true);
    // Keep wallet connected!
  }
}
```

#### B. Add Payment UI to Lease Signing Page

**New Components**:
1. `PaymentSection.tsx` - Shows required payments
2. Integrated into LeaseSigningPage after signing
3. Uses same wallet connection from signing

**UI Flow**:
```
[Lease Terms]
     ↓
[Connect Wallet & Sign] ← User signs here
     ↓
✅ Lease Signed!
     ↓
[Payment Required Section]  ← ✅ NEW!
     ↓
  Security Deposit: $2,000 USDC [Pay Now]
  First Month Rent: $1,500 USDC [Pay Now]
     ↓
✅ Payments Complete!
     ↓
🎉 Welcome to your new home! (role → tenant)
```

#### C. Manager Wallet Connection

**When**: At lease creation/signing time (for receiving payments later)
**Where**: LeaseReviewPage - before or during manager signature
**Purpose**: Set up manager's Circle wallet as payment recipient

---

### Solution 2: Chat Continuity Across Lifecycle

#### A. Database Migration

**Add `lease_id` to messages table**:
```sql
-- CHAT_CONTINUITY_MIGRATION.sql
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES leases(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_messages_lease ON messages(lease_id);

COMMENT ON COLUMN messages.lease_id IS 'Reference to lease for tenant-manager communication after lease signing';
```

#### B. Update ChatBox Component

**Current**:
```typescript
interface ChatBoxProps {
  applicationId: string;
  ...
}
```

**New (Flexible)**:
```typescript
interface ChatBoxProps {
  applicationId?: string;  // Optional - for pre-lease
  leaseId?: string;        // Optional - for post-lease
  conversationType: 'application' | 'lease';
  ...
}
```

#### C. Backend API Updates

**New Endpoints**:
```typescript
// Get messages by lease_id
GET /api/leases/:leaseId/messages

// Send message to lease conversation
POST /api/leases/:leaseId/messages

// Migrate application chat to lease
POST /api/leases/:leaseId/migrate-chat
```

#### D. Chat Migration on Lease Signing

**Trigger**: When lease status → `fully_signed`

**Backend Logic**:
```typescript
async function migrateApplicationChatToLease(applicationId, leaseId) {
  // Update all messages to point to lease
  await supabase
    .from('messages')
    .update({ lease_id: leaseId })
    .eq('application_id', applicationId);
  
  // Keep application_id for reference
  // Now messages are linked to BOTH
}
```

#### E. UI State Management

**Application Status "Completed"**:
```tsx
{application.status === 'lease_signed' && (
  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
    <h3 className="font-semibold text-green-800">✅ Application Complete</h3>
    <p className="text-sm text-green-700">
      Lease signed! Continue communication on the lease page.
    </p>
    <button 
      onClick={() => navigate(`/lease/${application.lease_id}`)}
      className="mt-2 text-blue-600 underline"
    >
      Go to Lease & Chat →
    </button>
  </div>
)}
```

**Lease Page with Chat**:
```tsx
// Lease detail page includes chat component
<ChatBox 
  leaseId={lease.id}
  conversationType="lease"
  currentUserId={userProfile.id}
  otherUserId={lease.tenant_id === userProfile.id ? lease.property.owner_id : lease.tenant_id}
  ...
/>
```

---

## 📋 Implementation Steps

### Phase 1: Database Changes
- [ ] Create migration for `messages.lease_id` column
- [ ] Add index for performance
- [ ] Test migration in Supabase

### Phase 2: Backend API
- [ ] Add lease messages endpoints
- [ ] Add chat migration function
- [ ] Update lease signing to auto-migrate chat
- [ ] Update payment completion to keep lease context

### Phase 3: Frontend - Wallet & Payment
- [ ] Create `PaymentSection` component
- [ ] Integrate into LeaseSigningPage
- [ ] Modify signing flow to show payments immediately
- [ ] Add wallet persistence across signing → payment
- [ ] Test payment completion flow

### Phase 4: Frontend - Chat Continuity
- [ ] Update ChatBox to accept `leaseId`
- [ ] Create lease detail page with integrated chat
- [ ] Add migration banner to applications
- [ ] Update application UI for completed status
- [ ] Test chat continuity

### Phase 5: Manager Wallet Setup
- [ ] Add wallet connection to LeaseReviewPage
- [ ] Store manager wallet info with lease
- [ ] Use for payment recipient address
- [ ] Test end-to-end payment flow

### Phase 6: Testing
- [ ] Test complete tenant journey
- [ ] Test manager workflow
- [ ] Test chat migration
- [ ] Test payment flow
- [ ] Test role transition

---

## 🎨 Detailed UI Mockups

### Lease Signing Page (Tenant) - After Signing

```
┌────────────────────────────────────────────────┐
│  ✅ Lease Signed Successfully!                 │
│                                                 │
│  Your signature has been recorded on-chain.    │
│  Next step: Complete required payments         │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│  💳 Required Payments                          │
│  ─────────────────────────────────────────     │
│                                                 │
│  🔐 Wallet Connected:                          │
│  8kr6...Kyiz (Phantom Wallet)                  │
│                                                 │
│  ───────────────────────────────────────────   │
│                                                 │
│  📋 Security Deposit                           │
│  Amount: $2,000.00 USDC                        │
│  Status: ⏳ Pending                            │
│  [Pay Security Deposit →]                      │
│                                                 │
│  ───────────────────────────────────────────   │
│                                                 │
│  📋 First Month's Rent                         │
│  Amount: $1,500.00 USDC                        │
│  Status: ⏳ Pending                            │
│  [Pay First Month Rent →]                      │
│                                                 │
│  ───────────────────────────────────────────   │
│                                                 │
│  Total Due: $3,500.00 USDC                     │
│                                                 │
│  ⚠️ Your lease will activate after both        │
│     payments are completed.                     │
└────────────────────────────────────────────────┘
```

### Application Page - Completed Status

```
┌────────────────────────────────────────────────┐
│  Application Status: ✅ LEASE SIGNED           │
│  ─────────────────────────────────────────     │
│                                                 │
│  This application has been completed.          │
│  A lease has been generated and signed.        │
│                                                 │
│  📄 Lease ID: #L-2024-001                      │
│  📅 Signed: Jan 15, 2024                       │
│                                                 │
│  💬 Chat Moved to Lease                        │
│  Continue your conversation on the lease page. │
│                                                 │
│  [View Lease & Chat →]                         │
│                                                 │
│  ─── Application Details (Read-Only) ───       │
│  Property: Luxury Apartment...                 │
│  Applied: Jan 10, 2024                         │
│  Approved: Jan 12, 2024                        │
│  Lease Generated: Jan 14, 2024                 │
└────────────────────────────────────────────────┘
```

### Lease Detail Page - With Chat

```
┌────────────────────────────────────────────────┐
│  Lease #L-2024-001                             │
│  [View Details] [💬 Chat] [📄 Documents]       │
└────────────────────────────────────────────────┘

┌─────────────────┬──────────────────────────────┐
│ Lease Details   │  💬 Chat with Manager        │
│                 │  ─────────────────────────    │
│ Property:       │                              │
│ Luxury Apt      │  Manager: Hi! How can I...   │
│                 │           [2:30 PM]          │
│ Term:           │                              │
│ 12 months       │  You: I have a question...   │
│                 │       [2:32 PM]              │
│ Rent:           │                              │
│ $1,500/mo       │  Manager: Sure, what is...   │
│                 │           [2:35 PM]          │
│ Status:         │                              │
│ ✅ Active       │  ───────────────────────     │
│                 │                              │
│ [Make Payment]  │  [Type message...]  [Send]   │
└─────────────────┴──────────────────────────────┘
```

---

## 🔐 Wallet Connection Points

### For Tenants:
1. **Lease Signing** (LeaseSigningPage):
   - Connect wallet → Sign lease → Keep connected
   - Immediately shows payment UI
   - Complete payments with same wallet
   - ✅ Seamless experience

### For Managers:
1. **Lease Review/Creation** (LeaseReviewPage):
   - Connect wallet before/during signing
   - Wallet address stored with lease
   - Used as payment recipient
   - Can be Circle Developer Wallet (automatic)

---

## 💾 Data Model Updates

### Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES users(id),
  recipient_id UUID NOT NULL REFERENCES users(id),
  application_id UUID REFERENCES property_applications(id),  -- Existing
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,     -- ✅ NEW
  message_body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Leases Table (Add Wallet Info)
```sql
ALTER TABLE leases
ADD COLUMN IF NOT EXISTS manager_wallet_address TEXT,
ADD COLUMN IF NOT EXISTS manager_wallet_type TEXT CHECK (manager_wallet_type IN ('phantom', 'circle')),
ADD COLUMN IF NOT EXISTS tenant_wallet_address TEXT,
ADD COLUMN IF NOT EXISTS tenant_wallet_type TEXT CHECK (tenant_wallet_type IN ('phantom', 'circle'));
```

---

## 🧪 Testing Scenarios

### Scenario 1: Complete Tenant Journey
1. Browse properties
2. Apply for property
3. Chat with manager about application
4. Manager approves → generates lease
5. Tenant receives lease
6. **Tenant connects Phantom wallet**
7. **Tenant signs lease**
8. **Payment UI appears immediately**
9. **Tenant pays security deposit** (wallet still connected)
10. **Tenant pays first month rent** (wallet still connected)
11. ✅ Lease activates, role → tenant
12. **Chat continues on lease page**

### Scenario 2: Manager Workflow
1. Review application
2. Chat with applicant
3. Approve application
4. **Connect Circle wallet**
5. Generate lease (wallet address stored)
6. Sign lease
7. Wait for tenant signing + payment
8. Receive payments to Circle wallet
9. **Chat continues on lease page**

### Scenario 3: Chat Continuity
1. Pre-lease chat on application
2. Lease signed
3. Navigate to application page → sees "Chat moved to lease"
4. Click to go to lease
5. Same chat history appears
6. Can continue conversation
7. Application page is read-only

---

## 🚀 Success Criteria

- ✅ Tenant connects wallet once and uses for both signing + payment
- ✅ No confusion about when to pay
- ✅ Payment happens immediately after signing
- ✅ Manager wallet is set up before lease is created
- ✅ Chat seamlessly continues from application to lease
- ✅ Application page shows completed status after lease signing
- ✅ Lease page has integrated chat functionality
- ✅ No messages are lost during transition
- ✅ Both parties can see chat history
- ✅ Clear UI indicators show where chat is active

---

## 📝 Files to Create/Modify

### New Files:
1. `CHAT_CONTINUITY_MIGRATION.sql` - Database migration
2. `frontend/src/components/PaymentSection.tsx` - Payment UI component
3. `frontend/src/pages/LeaseDetailPage.tsx` - Lease view with chat

### Modified Files:
1. `frontend/src/pages/LeaseSigningPage.tsx` - Add payment section
2. `frontend/src/pages/LeaseReviewPage.tsx` - Add manager wallet connection
3. `frontend/src/components/ChatBox.tsx` - Support both application & lease
4. `backend/src/index.ts` - Add lease messages endpoints
5. `frontend/src/App.tsx` - Update application display for completed status

---

**Priority**: HIGH - Critical UX issues affecting payment and communication
**Impact**: Significantly improves user experience and reduces confusion
**Estimated Effort**: 6-8 hours implementation + 2 hours testing
