#!/bin/bash

# RentFlow Solana Program Deployment Script
# Deploys the custom Anchor program to Solana Devnet

set -e

echo "🚀 RentFlow Solana Program Deployment"
echo "======================================="
echo ""

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust is not installed"
    echo "Install Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI is not installed"
    echo "Install Solana: sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    exit 1
fi

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor is not installed"
    echo "Install Anchor: cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli"
    exit 1
fi

echo "✅ All dependencies installed"
echo ""

# Set cluster to devnet
echo "📡 Configuring Solana CLI for Devnet..."
solana config set --url devnet
echo ""

# Check wallet balance
echo "💰 Checking wallet balance..."
BALANCE=$(solana balance | awk '{print $1}')
echo "Current balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 5" | bc -l) )); then
    echo "⚠️  Low balance detected. Requesting airdrop..."
    solana airdrop 5
    echo "✅ Airdrop complete"
else
    echo "✅ Sufficient balance for deployment"
fi
echo ""

# Build the program
echo "🔨 Building Anchor program..."
cd programs/rentflow-core
anchor build
echo "✅ Build complete"
echo ""

# Get program ID
echo "🔑 Program Information:"
PROGRAM_ID=$(solana address -k ../../target/deploy/rentflow_core-keypair.json)
echo "Program ID: $PROGRAM_ID"
echo ""

# Update program ID in lib.rs if needed
echo "📝 Updating program ID in source code..."
sed -i "s/declare_id!(\".*\")/declare_id!(\"$PROGRAM_ID\")/" src/lib.rs
echo "✅ Program ID updated"
echo ""

# Rebuild with correct program ID
echo "🔨 Rebuilding with updated program ID..."
anchor build
echo "✅ Rebuild complete"
echo ""

# Deploy to devnet
echo "🚀 Deploying to Solana Devnet..."
anchor deploy
echo "✅ Deployment complete!"
echo ""

# Save program ID to environment file
echo "💾 Saving configuration..."
cd ../..
echo "SOLANA_PROGRAM_ID=$PROGRAM_ID" >> .env
echo "✅ Configuration saved to .env"
echo ""

# Verify deployment
echo "🔍 Verifying deployment..."
solana program show $PROGRAM_ID
echo ""

# Run tests
echo "🧪 Running tests..."
cd programs/rentflow-core
anchor test --skip-local-validator
echo "✅ Tests passed!"
echo ""

echo "========================================="
echo "🎉 Deployment Complete!"
echo "========================================="
echo ""
echo "Program ID: $PROGRAM_ID"
echo "Network: Devnet"
echo "Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo ""
echo "Next steps:"
echo "1. Update backend/.env with SOLANA_PROGRAM_ID=$PROGRAM_ID"
echo "2. Restart backend server"
echo "3. Test lease creation through UI"
echo ""
