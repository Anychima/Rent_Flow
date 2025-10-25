# RentFlow Solana Program

## Overview
This directory contains the Solana program for RentFlow's on-chain lease storage and verification system.

## Architecture

### Program Accounts
- **Lease Account**: Stores lease hash, signatures, and metadata
- **Signature Account**: Records individual signatures from manager and tenant

### Instructions
1. `initialize_lease` - Create new lease account with hash
2. `sign_lease` - Record signature from manager or tenant
3. `verify_lease` - Check if both parties have signed
4. `update_lease_status` - Update lease state (active, terminated, etc.)

## Development Approach

Since we're using TypeScript/Node.js ecosystem, we'll use Solana's Web3.js SDK to interact with deployed programs on Solana Devnet.

### For Full Rust Program Development (Future)
1. Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2. Install Solana CLI: `sh -c "$(curl -sSfL https://release.solana.com/stable/install)"`
3. Install Anchor: `cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli`
4. Build program: `anchor build`
5. Deploy: `anchor deploy`

## Current Implementation

We're using a hybrid approach:
1. TypeScript client library for interaction
2. Leveraging Solana's Memo program for simple on-chain storage
3. Future migration path to custom Anchor program

## Environment Variables Required

```env
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
PROGRAM_ID=<deployed-program-id>
```

## Testing

```bash
npm run test:solana
```

## Deployment

Deployment will be handled through Solana Playground or pre-deployed program addresses.
