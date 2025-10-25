# 🚀 Solana Program Deployment Guide

**Status:** ✅ Phase 1 Complete (TypeScript Client Library)  
**Next:** Deploy Custom Anchor Program

---

## 📊 Current Implementation

### ✅ What's Working Now

1. **TypeScript Client Library**
   - Location: `/programs/rentflow-solana/leaseProgram.ts`
   - Uses Solana Web3.js for blockchain interaction
   - Implements lease hash creation and storage
   - Ready for integration with custom program

2. **Backend Service Updated**
   - Location: `/backend/src/services/solanaLeaseService.ts`
   - Integrated with RPC connection
   - Hash-based lease verification
   - Wallet balance checking

3. **On-Chain Storage Strategy**
   - Using Solana Memo program for MVP
   - Stores lease hashes as transaction memos
   - Immutable, verifiable lease records
   - Low cost (~0.000005 SOL per transaction)

---

## 🎯 Phase 1: TypeScript Client (COMPLETE)

### Features Implemented
- ✅ Lease hash generation (SHA-256)
- ✅ On-chain storage via Memo program
- ✅ Signature recording
- ✅ Transaction verification
- ✅ Lease history retrieval
- ✅ RPC connection management

### Usage Example

```typescript
import leaseProgram from './programs/rentflow-solana/leaseProgram';
import { Connection, Keypair } from '@solana/web3.js';

// Initialize connection
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Create lease on-chain
const result = await leaseProgram.storLeaseOnChain(
  connection,
  payerKeypair, // Requires keypair for signing
  {
    leaseId: 'lease-123',
    propertyId: 'prop-456',
    managerWallet: '8kr6b3uuYx4MgvY8BW9ETogd3cc5ibTj3g8oVZCkKyiz',
    tenantWallet: 'CqQT3otUUcvpvsUCkWzfebanHZeGqKEJprjw5NPLwx4m',
    // ... other lease data
  }
);

console.log('Transaction:', result.transactionSignature);
console.log('Explorer:', `https://explorer.solana.com/tx/${result.transactionSignature}?cluster=devnet`);
```

---

## 🚧 Phase 2: Custom Anchor Program (NEXT)

### Why We Need It

**Current Limitation:**
- Memo program only stores text data
- No state management or verification logic
- Can't enforce business rules on-chain

**Custom Program Benefits:**
- ✅ Program Derived Addresses (PDAs) for lease accounts
- ✅ On-chain signature verification
- ✅ State management (pending → signed → active)
- ✅ Multi-signature enforcement
- ✅ Lease status updates
- ✅ Security deposit escrow

### Architecture

```
┌─────────────────────────────────────────────┐
│         Solana Blockchain (Devnet)          │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │   RentFlow Program (Custom Anchor)    │  │
│  │                                       │  │
│  │  ┌─────────────────────────────┐     │  │
│  │  │  Lease Account (PDA)        │     │  │
│  │  │  - Lease Hash               │     │  │
│  │  │  - Manager Signature        │     │  │
│  │  │  - Tenant Signature         │     │  │
│  │  │  - Status (pending/active)  │     │  │
│  │  │  - Timestamp                │     │  │
│  │  └─────────────────────────────┘     │  │
│  │                                       │  │
│  │  Instructions:                        │  │
│  │  - initialize_lease()                 │  │
│  │  - sign_lease()                       │  │
│  │  - verify_signatures()                │  │
│  │  - update_status()                    │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Program Structure

```rust
// programs/rentflow-core/src/lib.rs

use anchor_lang::prelude::*;

declare_id!("RentF1ow11111111111111111111111111111111111");

#[program]
pub mod rentflow_core {
    use super::*;

    pub fn initialize_lease(
        ctx: Context<InitializeLease>,
        lease_id: String,
        lease_hash: [u8; 32],
        manager_wallet: Pubkey,
        tenant_wallet: Pubkey,
        monthly_rent: u64,
        security_deposit: u64,
    ) -> Result<()> {
        let lease = &mut ctx.accounts.lease;
        lease.lease_id = lease_id;
        lease.lease_hash = lease_hash;
        lease.manager_wallet = manager_wallet;
        lease.tenant_wallet = tenant_wallet;
        lease.monthly_rent = monthly_rent;
        lease.security_deposit = security_deposit;
        lease.manager_signed = false;
        lease.tenant_signed = false;
        lease.status = LeaseStatus::Pending;
        lease.created_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn sign_lease(
        ctx: Context<SignLease>,
        signature_hash: [u8; 32],
    ) -> Result<()> {
        let lease = &mut ctx.accounts.lease;
        let signer = ctx.accounts.signer.key();

        if signer == lease.manager_wallet {
            lease.manager_signed = true;
            lease.manager_signature = signature_hash;
        } else if signer == lease.tenant_wallet {
            lease.tenant_signed = true;
            lease.tenant_signature = signature_hash;
        } else {
            return Err(ErrorCode::UnauthorizedSigner.into());
        }

        // Auto-activate if both signed
        if lease.manager_signed && lease.tenant_signed {
            lease.status = LeaseStatus::Active;
            lease.activated_at = Clock::get()?.unix_timestamp;
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeLease<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + Lease::INIT_SPACE,
        seeds = [b"lease", lease_id.as_bytes()],
        bump
    )]
    pub lease: Account<'info, Lease>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SignLease<'info> {
    #[account(mut)]
    pub lease: Account<'info, Lease>,
    pub signer: Signer<'info>,
}

#[account]
pub struct Lease {
    pub lease_id: String,
    pub lease_hash: [u8; 32],
    pub manager_wallet: Pubkey,
    pub tenant_wallet: Pubkey,
    pub monthly_rent: u64,
    pub security_deposit: u64,
    pub manager_signed: bool,
    pub tenant_signed: bool,
    pub manager_signature: [u8; 32],
    pub tenant_signature: [u8; 32],
    pub status: LeaseStatus,
    pub created_at: i64,
    pub activated_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum LeaseStatus {
    Pending,
    Active,
    Terminated,
    Completed,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized signer")]
    UnauthorizedSigner,
}
```

---

## 🛠️ Deployment Steps

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli

# Verify installations
solana --version
anchor --version
```

### Step 1: Initialize Anchor Project

```bash
cd programs
anchor init rentflow-core
cd rentflow-core
```

### Step 2: Configure Anchor.toml

```toml
[programs.devnet]
rentflow_core = "RentF1ow11111111111111111111111111111111111"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### Step 3: Build Program

```bash
anchor build
```

This generates:
- `target/deploy/rentflow_core.so` (program binary)
- `target/idl/rentflow_core.json` (interface definition)

### Step 4: Get Program ID

```bash
solana address -k target/deploy/rentflow_core-keypair.json
```

Update `declare_id!()` in `lib.rs` with this address.

### Step 5: Deploy to Devnet

```bash
# Set cluster to devnet
solana config set --url devnet

# Airdrop SOL for deployment (costs ~2-5 SOL)
solana airdrop 5

# Deploy program
anchor deploy
```

### Step 6: Verify Deployment

```bash
solana program show <PROGRAM_ID>
```

Visit Solana Explorer:
```
https://explorer.solana.com/address/<PROGRAM_ID>?cluster=devnet
```

---

## 🧪 Testing

### Unit Tests

```bash
cd programs/rentflow-core
anchor test
```

### Integration Test Example

```typescript
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { RentflowCore } from '../target/types/rentflow_core';

describe('rentflow-core', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.RentflowCore as Program<RentflowCore>;

  it('Creates a lease', async () => {
    const leaseId = 'lease-test-123';
    const leaseHash = Buffer.from('a'.repeat(64), 'hex');
    
    const [leasePDA] = await PublicKey.findProgramAddress(
      [Buffer.from('lease'), Buffer.from(leaseId)],
      program.programId
    );

    await program.methods
      .initializeLease(
        leaseId,
        Array.from(leaseHash),
        managerWallet,
        tenantWallet,
        new anchor.BN(2500000000), // 2500 USDC
        new anchor.BN(5000000000)  // 5000 USDC
      )
      .accounts({
        lease: leasePDA,
        payer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const leaseAccount = await program.account.lease.fetch(leasePDA);
    assert.equal(leaseAccount.leaseId, leaseId);
  });
});
```

---

## 📦 Environment Variables

Add to `.env`:

```env
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
SOLANA_PROGRAM_ID=RentF1ow11111111111111111111111111111111111
SOLANA_PROGRAM_KEYPAIR=[...] # JSON array of secret key bytes
```

---

## 🔄 Migration Plan

### Phase 1 → Phase 2 Transition

1. **Deploy Custom Program** (1-2 weeks)
   - Write Anchor program
   - Test on devnet
   - Deploy to mainnet

2. **Update Backend Service** (3-5 days)
   - Replace memo calls with program instructions
   - Add PDA derivation
   - Update signature verification

3. **Frontend Integration** (2-3 days)
   - No changes needed (transparent to users)
   - Backend handles all blockchain interaction

4. **Data Migration** (1 day)
   - Existing leases remain in database
   - New leases use on-chain program
   - Gradual migration of historical data

---

## 💰 Cost Estimates

### Development
- Solana Devnet: **FREE** (use airdrops)
- Testing: **FREE**

### Production (Mainnet)
- Program deployment: **~2-5 SOL** (one-time, ~$200-500)
- Per lease creation: **~0.00001 SOL** (~$0.002)
- Per signature: **~0.000005 SOL** (~$0.001)
- Storage rent: **~0.002 SOL per account** (rent-exempt, one-time)

**Monthly cost for 1000 leases:** ~$10-20 in SOL

---

## 🎯 Success Metrics

- [ ] Program deployed to Devnet
- [ ] All tests passing
- [ ] 100 test leases created on-chain
- [ ] Signature verification working
- [ ] Transaction time < 5 seconds
- [ ] Gas costs < $0.01 per transaction
- [ ] 99.9% uptime on Devnet

---

## 📚 Resources

- [Anchor Book](https://book.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Solana Program Library](https://spl.solana.com/)
- [RentFlow Solana Docs](./programs/rentflow-solana/README.md)

---

## 🚀 Next Steps

1. ✅ **Complete Phase 1** - TypeScript client library
2. ⏳ **Start Phase 2** - Custom Anchor program development
3. 📝 Write comprehensive tests
4. 🚀 Deploy to Devnet
5. 🔍 Security audit
6. 🎉 Production deployment

---

**Ready to proceed with Phase 2? Let me know and I'll create the full Anchor program structure!** 🎯
