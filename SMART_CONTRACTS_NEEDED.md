# 🔗 Smart Contracts Needed for RentFlow Portal

## ✅ Already Deployed:

### 1. **RentFlowLeaseSignature.sol**
- **Address**: `0x1B831B4a95216ea98668BCEFf2662FEF2E833Da3`
- **Network**: Arc Testnet
- **Purpose**: On-chain lease signature verification
- **Status**: ✅ Deployed and Working

**Functions**:
- `signLease(leaseId, signature, isLandlord)` - Record signatures
- `getLease(leaseId)` - Get lease details
- `isLeaseFullySigned(leaseId)` - Check if both parties signed
- `getLeaseMessageHash(...)` - Get message hash for signing

---

## 🚀 Smart Contracts To Deploy:

### 2. **RentFlowPayments.sol** (Priority: HIGH)

**Purpose**: Handle all rent payments, deposits, and refunds on-chain

**Key Features**:
- Track monthly rent payments
- Security deposit escrow
- Automatic payment distribution
- Refund logic when lease ends
- Payment history verification

**Functions Needed**:
```solidity
// Payment tracking
function recordPayment(
    uint256 leaseId,
    address tenant,
    uint256 amount,
    PaymentType paymentType // RENT, DEPOSIT, LATE_FEE
) external payable

// Check payment status
function getPaymentHistory(uint256 leaseId) external view returns (Payment[] memory)
function isRentPaid(uint256 leaseId, uint256 month) external view returns (bool)

// Deposit management
function holdDeposit(uint256 leaseId, uint256 amount) external payable
function releaseDeposit(uint256 leaseId, address to, uint256 amount) external

// Automatic distribution
function distributeRent(uint256 leaseId) external
```

**Why We Need This**:
- Currently payments only tracked in database
- No on-chain proof of payment
- No escrow protection for deposits
- Manual payment tracking prone to errors

---

### 3. **RentFlowDisputes.sol** (Priority: MEDIUM)

**Purpose**: Manage disputes between landlords and tenants

**Key Features**:
- File disputes with evidence hashes
- Multi-signature resolution (requires both parties or arbitrator)
- Time-locked dispute periods
- Automatic refunds based on resolution

**Functions Needed**:
```solidity
// Dispute filing
function openDispute(
    uint256 leaseId,
    string memory reason,
    bytes32 evidenceHash,
    DisputeType disputeType // DAMAGE, PAYMENT, EARLY_TERMINATION
) external

// Resolution
function resolveDispute(
    uint256 disputeId,
    DisputeResolution resolution, // LANDLORD_FAVOR, TENANT_FAVOR, SPLIT
    uint256 refundAmount
) external

// Arbitration (for Circle AI Agent)
function arbitrateDispute(uint256 disputeId, bytes memory aiDecision) external
```

**Why We Need This**:
- Transparent dispute resolution
- Immutable evidence storage
- Protection for both parties
- Automated refund distribution

---

### 4. **RentFlowProperties.sol** (Priority: MEDIUM)

**Purpose**: Register properties on-chain with ownership verification

**Key Features**:
- Property registration with metadata
- Owner verification
- Transfer of property ownership
- Property status tracking (available, leased, under maintenance)

**Functions Needed**:
```solidity
// Property management
function registerProperty(
    string memory propertyId,
    address owner,
    bytes32 propertyHash,
    uint256 monthlyRent
) external

function transferPropertyOwnership(string memory propertyId, address newOwner) external
function updatePropertyStatus(string memory propertyId, PropertyStatus status) external

// Query
function getPropertyOwner(string memory propertyId) external view returns (address)
function isPropertyAvailable(string memory propertyId) external view returns (bool)
```

**Why We Need This**:
- Verify landlord actually owns the property
- Prevent duplicate listings
- Track property history on-chain
- Enable property NFT marketplace in future

---

### 5. **RentFlowEscrow.sol** (Priority: HIGH)

**Purpose**: Escrow service for security deposits and damage claims

**Key Features**:
- Lock deposits until lease ends
- Time-locked release mechanisms
- Partial release for damages
- Automatic full release if no claims

**Functions Needed**:
```solidity
// Escrow management
function createEscrow(
    uint256 leaseId,
    uint256 depositAmount,
    uint256 releaseDate
) external payable

function releaseEscrow(
    uint256 leaseId,
    address recipient,
    uint256 amount,
    string memory reason
) external

function claimDamages(
    uint256 leaseId,
    uint256 amount,
    bytes32 evidenceHash
) external

// Auto-release after time period
function autoRelease(uint256 leaseId) external
```

**Why We Need This**:
- Protect tenant deposits
- Prevent landlord from withholding deposits unfairly
- Automated release after lease + grace period
- Dispute resolution via smart contract logic

---

### 6. **RentFlowMaintenanceRequests.sol** (Priority: LOW)

**Purpose**: Track maintenance requests and fund allocation

**Key Features**:
- Submit maintenance requests
- Approve/reject with reasons
- Allocate funds from escrow for approved work
- Track completion and payment

**Functions Needed**:
```solidity
function submitMaintenanceRequest(
    uint256 leaseId,
    string memory description,
    uint256 estimatedCost,
    Priority priority
) external

function approveMaintenanceRequest(uint256 requestId, uint256 approvedAmount) external
function completeMaintenanceRequest(uint256 requestId, bytes32 receiptHash) external
function payMaintenanceWorker(uint256 requestId, address worker) external
```

**Why We Need This**:
- Transparent maintenance tracking
- Automatic payment to verified workers
- History of all repairs
- Proof of landlord responsiveness

---

### 7. **RentFlowIdentityVerification.sol** (Priority: LOW)

**Purpose**: KYC/identity verification for tenants and landlords

**Key Features**:
- Store verification status (not personal data)
- Integration with third-party KYC providers
- Reputation scores
- Credit check verification hashes

**Functions Needed**:
```solidity
function verifyUser(
    address user,
    bytes32 verificationHash,
    VerificationType verificationType // KYC, CREDIT, BACKGROUND
) external

function isUserVerified(address user) external view returns (bool)
function getUserReputationScore(address user) external view returns (uint256)
function recordLeaseCompletion(address user, bool positive) external
```

**Why We Need This**:
- Build tenant/landlord reputation
- Enable trust-less rental decisions
- Portable rental history across platforms
- Privacy-preserving verification

---

## 📋 Deployment Priority Order:

### Phase 1 (Next 2 Weeks):
1. ✅ **RentFlowLeaseSignature** (Done)
2. 🚀 **RentFlowPayments** - Critical for actual payments
3. 🔒 **RentFlowEscrow** - Protect deposits

### Phase 2 (Weeks 3-4):
4. 🏠 **RentFlowProperties** - Property registry
5. ⚖️ **RentFlowDisputes** - Conflict resolution

### Phase 3 (Month 2):
6. 🔧 **RentFlowMaintenanceRequests** - Better UX
7. 🆔 **RentFlowIdentityVerification** - Trust layer

---

## 🎯 Immediate Action Items:

### 1. Deploy RentFlowPayments.sol
```bash
cd contracts
npx hardhat run scripts/deploy-payments.js --network arc-testnet
```

### 2. Deploy RentFlowEscrow.sol
```bash
npx hardhat run scripts/deploy-escrow.js --network arc-testnet
```

### 3. Update Frontend Integration
- Add payment contract interaction
- Add escrow status display
- Show on-chain payment history

### 4. Backend API Updates
- Add endpoints for contract interactions
- Store contract addresses in .env
- Update payment flow to use contracts

---

## 💡 Smart Contract Architecture:

```
┌─────────────────────────────────────────────────┐
│          RentFlow Smart Contract Suite          │
└─────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
│  Signatures  │ │  Payments   │ │   Escrow   │
│   (Active)   │ │  (Deploy)   │ │  (Deploy)  │
└──────┬───────┘ └──────┬──────┘ └─────┬──────┘
       │                │               │
       └────────────────┼───────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
│  Properties  │ │  Disputes   │ │ Maintenance│
│  (Phase 2)   │ │  (Phase 2)  │ │ (Phase 3)  │
└──────────────┘ └─────────────┘ └────────────┘
```

---

## 🔐 Security Considerations:

### Access Control:
- **Owner**: Can update contract logic (upgradeable proxy)
- **Landlord**: Can create leases, receive payments
- **Tenant**: Can sign leases, make payments
- **Arbitrator**: Circle AI Agent for disputes

### Upgradability:
- Use OpenZeppelin's UUPS proxy pattern
- Allow bug fixes without redeployment
- Preserve all existing data

### Audit Requirements:
- Get contracts audited before mainnet
- Use OpenZeppelin's audited libraries
- Implement emergency pause mechanism

---

## 📊 Estimated Costs:

### Development:
- RentFlowPayments: ~2-3 days
- RentFlowEscrow: ~2-3 days
- RentFlowDisputes: ~3-4 days
- RentFlowProperties: ~2 days
- Total: ~2-3 weeks for Phase 1 & 2

### Deployment (Arc Testnet - FREE):
- Gas fees: ~0 (testnet)
- Testing: FREE
- Total: $0

### Deployment (Arc Mainnet):
- Gas fees: ~$50-200 per contract
- Audit: $5,000-15,000 (optional but recommended)
- Total: ~$300-1,000 (without audit)

---

## 🎉 Benefits of Full On-Chain System:

1. **Transparency**: All transactions visible on Arc Explorer
2. **Trust**: No reliance on centralized database
3. **Automation**: Smart contracts execute automatically
4. **Security**: Funds protected by blockchain
5. **Portability**: Users own their data/history
6. **Compliance**: Immutable audit trail
7. **Global**: Works anywhere with internet

---

## ✅ Next Steps:

1. Review this document with team
2. Prioritize contracts based on user needs
3. Start developing RentFlowPayments.sol
4. Set up Hardhat deployment scripts
5. Test on Arc Testnet thoroughly
6. Update frontend to integrate new contracts
7. Deploy to production when ready

---

**Need help implementing any of these contracts? I can generate the Solidity code for each one!** 🚀
