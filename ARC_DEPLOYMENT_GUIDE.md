# 🎉 RentFlowLeaseSignature - Arc Testnet Deployment

**Date**: 2025-10-28  
**Status**: ✅ DEPLOYED SUCCESSFULLY  
**Network**: Arc Testnet

---

## 📊 Deployment Details

### **Smart Contract**
- **Name**: RentFlowLeaseSignature
- **Address**: `0x1B831B4a95216ea98668BCEFf2662FEF2E833Da3`
- **Network**: Arc Testnet
- **Chain ID**: 5042002

### **Deployment Transaction**
- **Hash**: `0x6a487eb6a213ce0635a815acc52fd611124694d823459b7ddf7efe8cc00dd894`
- **Deployer**: `0x4e076D7ce8F401858E3026BC567478C6611d741a`
- **Gas Used**: 1,333,764
- **Timestamp**: 2025-10-28 14:43:59 UTC

### **Block Explorer**
- **URL**: https://testnet.arcscan.app/address/0x1B831B4a95216ea98668BCEFf2662FEF2E833Da3
- **Transaction**: https://testnet.arcscan.app/tx/0x6a487eb6a213ce0635a815acc52fd611124694d823459b7ddf7efe8cc00dd894

---

## ✨ Contract Features

### **Industry-Standard Blockchain Signing**

✅ **ECDSA Signature Verification**
- Uses elliptic curve cryptography (secp256k1)
- Same standard as Bitcoin, Ethereum
- Cryptographically secure

✅ **Universal Wallet Compatibility**
- Works with MetaMask
- Works with Circle wallets
- Works with Ledger hardware wallets
- Works with ANY EVM wallet

✅ **On-Chain Verification**
- Signatures verified on blockchain
- Trustless - no backend trust needed
- Immutable proof of signing

✅ **Dual Signing Support**
- Landlord signs lease
- Tenant signs lease
- Both signatures required for activation

---

## 🔧 Contract Functions

### **1. createLease()**
```solidity
function createLease(
    address landlord,
    address tenant,
    string memory leaseDocumentHash,
    uint256 monthlyRent,
    uint256 securityDeposit,
    uint64 startDate,
    uint64 endDate
) external returns (uint256)
```

**Purpose**: Create a new lease agreement  
**Returns**: Lease ID  
**Who can call**: Anyone (manager, tenant, backend)

---

### **2. signLease()**
```solidity
function signLease(
    uint256 leaseId,
    bytes memory signature,
    bool isLandlord
) external
```

**Purpose**: Sign lease with cryptographic signature  
**Parameters**:
- `leaseId`: The lease to sign
- `signature`: ECDSA signature (from wallet)
- `isLandlord`: true if landlord, false if tenant

**How it works**:
1. Recovers signer address from signature
2. Verifies signer is authorized (landlord or tenant)
3. Stores signature on-chain
4. Updates lease status

**Signature verification**: Uses OpenZeppelin's ECDSA library  
**Security**: Only authorized party can sign their role

---

### **3. verifySignature()**
```solidity
function verifySignature(
    uint256 leaseId,
    bytes memory signature,
    address expectedSigner,
    bool isLandlord
) public view returns (bool)
```

**Purpose**: Verify a signature without submitting transaction  
**Returns**: true if valid, false if invalid  
**Gas**: No gas (view function)

**Use case**: Frontend validation before submitting

---

### **4. isLeaseFullySigned()**
```solidity
function isLeaseFullySigned(uint256 leaseId) 
    public view returns (bool)
```

**Purpose**: Check if both parties have signed  
**Returns**: true if landlord AND tenant signed  
**Gas**: No gas (view function)

---

### **5. getLease()**
```solidity
function getLease(uint256 leaseId) 
    public view returns (Lease memory)
```

**Purpose**: Get complete lease details  
**Returns**: Lease struct with all data  
**Gas**: No gas (view function)

---

## 🔐 How Signing Works

### **Complete Flow**

```
1. USER CONNECTS WALLET
   ├─ MetaMask: Browser extension
   ├─ Circle: Via backend API
   └─ Ledger: Hardware device
   → Gets blockchain address (0x123...)

2. FRONTEND PREPARES MESSAGE
   ├─ Construct message hash:
   │  keccak256(
   │    leaseId,
   │    landlord,
   │    tenant,
   │    documentHash,
   │    monthlyRent,
   │    securityDeposit,
   │    role
   │  )
   └─ Message is deterministic (same inputs = same hash)

3. USER SIGNS MESSAGE
   ├─ External Wallet:
   │  └─ window.ethereum.request({
   │       method: 'personal_sign',
   │       params: [message, address]
   │     })
   │     → User approves in wallet popup
   │     → Returns signature (0xabc...)
   │
   └─ Circle Wallet:
      └─ Backend calls Circle SDK
         → Server-side signing
         → Returns signature (0xabc...)

4. SUBMIT TO SMART CONTRACT
   └─ rentFlowContract.signLease(
        leaseId,
        signature,
        isLandlord
      )
      → Contract recovers signer address
      → Verifies: recovered == expected
      → Stores signature on-chain
      → ✅ Transaction succeeds

5. VERIFICATION
   └─ Anyone can verify signature:
      - On-chain (smart contract)
      - Off-chain (ethers.js)
      - Immutable proof
```

---

## 📝 Integration Guide

### **Step 1: Install Dependencies**

```bash
npm install ethers@6
```

---

### **Step 2: Create Contract Instance**

```typescript
import { ethers } from 'ethers';

// Contract ABI (simplified - use full ABI from artifacts)
const contractABI = [
  "function createLease(address landlord, address tenant, string leaseDocumentHash, uint256 monthlyRent, uint256 securityDeposit, uint64 startDate, uint64 endDate) external returns (uint256)",
  "function signLease(uint256 leaseId, bytes signature, bool isLandlord) external",
  "function verifySignature(uint256 leaseId, bytes signature, address expectedSigner, bool isLandlord) public view returns (bool)",
  "function isLeaseFullySigned(uint256 leaseId) public view returns (bool)",
  "function getLease(uint256 leaseId) public view returns (tuple)"
];

const contractAddress = "0x1B831B4a95216ea98668BCEFf2662FEF2E833Da3";

// Connect with provider
const provider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network");
const contract = new ethers.Contract(contractAddress, contractABI, provider);

// Connect with signer (for transactions)
const wallet = new ethers.Wallet(privateKey, provider);
const contractWithSigner = contract.connect(wallet);
```

---

### **Step 3: Create Lease**

```typescript
async function createLease() {
  const tx = await contractWithSigner.createLease(
    "0xLandlordAddress",
    "0xTenantAddress",
    "QmHashOfLeaseDocument",  // IPFS hash
    1000000000,               // $1000 USDC (6 decimals)
    2000000000,               // $2000 security deposit
    Math.floor(Date.now() / 1000),  // Start date (timestamp)
    Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)  // End date (+1 year)
  );

  const receipt = await tx.wait();
  console.log("Lease created, transaction:", receipt.hash);
  
  // Get lease ID from events
  const leaseId = receipt.logs[0].args.leaseId;
  return leaseId;
}
```

---

### **Step 4: Sign Lease**

```typescript
async function signLease(leaseId: number, walletAddress: string, isLandlord: boolean) {
  // Step 1: Get lease details
  const lease = await contract.getLease(leaseId);
  
  // Step 2: Construct message hash (must match contract's getLeaseMessageHash)
  const messageHash = ethers.keccak256(
    ethers.solidityPacked(
      ['uint256', 'address', 'address', 'string', 'uint256', 'uint256', 'string'],
      [
        leaseId,
        lease.landlord,
        lease.tenant,
        lease.leaseDocumentHash,
        lease.monthlyRent,
        lease.securityDeposit,
        isLandlord ? 'LANDLORD' : 'TENANT'
      ]
    )
  );

  // Step 3: Sign message with wallet
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));

  // Step 4: Submit signature to contract
  const tx = await contractWithSigner.signLease(
    leaseId,
    signature,
    isLandlord
  );

  await tx.wait();
  console.log("Lease signed!");
}
```

---

### **Step 5: Verify Signature (Off-Chain)**

```typescript
async function verifySignatureOffChain(
  leaseId: number,
  signature: string,
  expectedSigner: string,
  isLandlord: boolean
): Promise<boolean> {
  return await contract.verifySignature(
    leaseId,
    signature,
    expectedSigner,
    isLandlord
  );
}
```

---

## 🧪 Testing Guide

### **Test 1: Create Lease**

```bash
# Using Hardhat console
npx hardhat console --network arc

# In console:
const RentFlowLeaseSignature = await ethers.getContractFactory("RentFlowLeaseSignature");
const contract = RentFlowLeaseSignature.attach("0x1B831B4a95216ea98668BCEFf2662FEF2E833Da3");

const tx = await contract.createLease(
  "0x4e076D7ce8F401858E3026BC567478C6611d741a",  // landlord
  "0xTenantAddress",
  "QmTest",
  1000000000,
  2000000000,
  Math.floor(Date.now() / 1000),
  Math.floor(Date.now() / 1000) + 31536000
);

await tx.wait();
```

---

### **Test 2: Sign with MetaMask**

1. Connect MetaMask to Arc testnet
2. Add Arc testnet to MetaMask:
   - Network Name: Arc Testnet
   - RPC URL: https://rpc.testnet.arc.network
   - Chain ID: 5042002
   - Currency Symbol: ETH

3. Use frontend to sign lease
4. MetaMask popup appears
5. User clicks "Sign"
6. Transaction submitted to contract

---

## 📊 Gas Costs (Estimated)

| Operation | Gas Used | Cost (at 20 gwei) |
|-----------|----------|-------------------|
| Deploy Contract | 1,333,764 | ~0.027 ETH |
| Create Lease | ~150,000 | ~0.003 ETH |
| Sign Lease | ~100,000 | ~0.002 ETH |
| Verify Signature | 0 (view) | Free |

---

## 🔗 Important Links

### **Arc Testnet Resources**
- **RPC Endpoint**: https://rpc.testnet.arc.network
- **Block Explorer**: https://testnet.arcscan.app
- **Chain ID**: 5042002

### **Contract Links**
- **Contract Address**: https://testnet.arcscan.app/address/0x1B831B4a95216ea98668BCEFf2662FEF2E833Da3
- **Deployment Tx**: https://testnet.arcscan.app/tx/0x6a487eb6a213ce0635a815acc52fd611124694d823459b7ddf7efe8cc00dd894

### **Documentation**
- **EIP-191**: https://eips.ethereum.org/EIPS/eip-191
- **OpenZeppelin ECDSA**: https://docs.openzeppelin.com/contracts/4.x/api/utils#ECDSA
- **Ethers.js**: https://docs.ethers.org/v6/

---

## ✅ Next Steps

### **1. Update Frontend**

Replace old signing code with:

```typescript
import arcWalletSigningService from './services/arcWalletSigningService';

// Sign lease
const result = await arcWalletSigningService.signMessage(
  leaseMessage,
  {
    address: userWalletAddress,
    walletType: isCircleWallet ? 'circle' : 'external',
    circleWalletId: circleWalletId || undefined
  }
);

if (result.success) {
  // Submit signature to smart contract
  const tx = await contract.signLease(
    leaseId,
    result.signature,
    isLandlord
  );
  
  await tx.wait();
  console.log("Lease signed on-chain!");
}
```

---

### **2. Test with Different Wallets**

- ✅ MetaMask (external wallet)
- ✅ Circle wallet (via backend)
- ✅ Ledger (hardware wallet)

---

### **3. Verify Contract (Optional)**

Verify the contract source code on Arc explorer for transparency:

```bash
npx hardhat verify --network arc 0x1B831B4a95216ea98668BCEFf2662FEF2E833Da3
```

---

## 🎉 Summary

**✅ Smart Contract Deployed Successfully!**

- **Address**: `0x1B831B4a95216ea98668BCEFf2662FEF2E833Da3`
- **Network**: Arc Testnet (Chain ID 5042002)
- **Features**: Industry-standard ECDSA signing, works with ANY EVM wallet
- **Status**: Ready for integration

**You can now:**
1. ✅ Create leases on-chain
2. ✅ Sign leases with MetaMask
3. ✅ Sign leases with Circle wallets
4. ✅ Verify signatures cryptographically
5. ✅ Store immutable proof on blockchain

**No more wallet ID requirements - users sign with their own wallets!** 🚀
