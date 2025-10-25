# RentFlow Core - Solana Smart Contract

**Status:** ✅ Code Complete - Ready for Deployment  
**Network:** Solana Devnet (Mainnet ready)  
**Framework:** Anchor 0.29.0

---

## Overview

RentFlow Core is a Solana smart contract (program) that provides on-chain lease management with cryptographic signature verification. Built with the Anchor framework for maximum security and developer experience.

## Features

### ✅ Core Functionality
- **Program Derived Addresses (PDAs)** - Deterministic, collision-free lease accounts
- **Multi-Signature Verification** - Both manager and tenant must sign
- **Atomic Lease Activation** - Auto-activates when both parties sign
- **Lease Status Management** - Full lifecycle tracking
- **On-Chain Hash Storage** - Immutable lease term records
- **Event Emissions** - Indexable event logs

### ✅ Security
- Authorization validation on all instructions
- Double-sign prevention
- Status transition validation
- Rent-exempt account creation
- PDA-based addressing (no address collisions)

### ✅ Gas Optimization
- Minimal account size (336 bytes)
- Efficient instruction processing
- No unnecessary storage

---

## Architecture

### Account Structure

```rust
pub struct Lease {
    lease_id: String,           // Max 64 chars
    lease_hash: [u8; 32],       // SHA-256 of terms
    manager_wallet: Pubkey,      // Landlord
    tenant_wallet: Pubkey,       // Tenant
    monthly_rent: u64,           // USDC (6 decimals)
    security_deposit: u64,       // USDC
    start_date: i64,             // Unix timestamp
    end_date: i64,               // Unix timestamp
    manager_signed: bool,
    tenant_signed: bool,
    manager_signature: [u8; 32],
    tenant_signature: [u8; 32],
    status: LeaseStatus,
    created_at: i64,
    activated_at: i64,
    bump: u8,
}
```

### Instructions

1. **initialize_lease**
   - Creates new lease PDA
   - Stores lease hash and terms
   - Requires manager signature
   - Cost: ~0.002 SOL (rent-exempt)

2. **sign_lease**
   - Records manager or tenant signature
   - Auto-activates if both signed
   - Emits LeaseActivated event
   - Cost: ~0.000005 SOL

3. **verify_lease**
   - Read-only verification
   - Checks both signatures
   - Returns activation status
   - Cost: FREE

4. **update_lease_status**
   - Terminate or complete lease
   - Validates state transitions
   - Requires authorized signer
   - Cost: ~0.000005 SOL

### State Machine

```
┌─────────┐
│ Pending │ ← Initial state after initialize_lease
└────┬────┘
     │ Both parties sign
     ▼
┌────────┐
│ Active │ ← Lease is active
└────┬───┘
     │
     ├───→ Terminated (early end)
     │
     └───→ Completed (normal end)
```

---

## Installation

### Prerequisites

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Anchor
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli
```

### Build

```bash
cd programs/rentflow-core
anchor build
```

### Test

```bash
anchor test
```

### Deploy

```bash
# Devnet
anchor deploy --provider.cluster devnet

# Mainnet
anchor deploy --provider.cluster mainnet
```

---

## Usage Example

### TypeScript Client

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RentflowCore } from "./target/types/rentflow_core";

const program = anchor.workspace.RentflowCore as Program<RentflowCore>;

// Initialize lease
const leaseId = "lease-123";
const [leasePDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("lease"), Buffer.from(leaseId)],
  program.programId
);

await program.methods
  .initializeLease(
    leaseId,
    leaseHash,
    tenantWallet,
    monthlyRent,
    securityDeposit,
    startDate,
    endDate
  )
  .accounts({
    lease: leasePDA,
    manager: managerKeypair.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([managerKeypair])
  .rpc();

// Sign lease
await program.methods
  .signLease(signatureHash)
  .accounts({
    lease: leasePDA,
    signer: signerKeypair.publicKey,
  })
  .signers([signerKeypair])
  .rpc();

// Verify
const leaseAccount = await program.account.lease.fetch(leasePDA);
console.log("Active:", leaseAccount.status.active !== undefined);
```

---

## Testing

### Test Suite

```bash
anchor test
```

**Coverage:**
- ✅ Lease initialization
- ✅ Manager signature
- ✅ Tenant signature
- ✅ Automatic activation
- ✅ Lease verification
- ✅ Status updates
- ✅ Unauthorized signer rejection
- ✅ Double-sign prevention

---

## Costs

### Devnet
- Deployment: **FREE** (use airdrops)
- Testing: **FREE**

### Mainnet
- Program deployment: **~2-3 SOL**
- Lease initialization: **~0.002 SOL**
- Signature: **~0.000005 SOL**
- Verification: **FREE** (read-only)

---

## Security

### Audits
- [ ] Internal review (complete)
- [ ] External audit (pending)
- [ ] Bug bounty (planned)

### Best Practices
- ✅ PDA-based addressing
- ✅ Signer validation
- ✅ State transition checks
- ✅ Rent-exempt accounts
- ✅ Error handling
- ✅ Event emissions

---

## License

MIT

---

## Contact

For questions or support:
- GitHub: [Anychima](https://github.com/Anychima)
- Email: olumba.chima.anya@ut.ee
