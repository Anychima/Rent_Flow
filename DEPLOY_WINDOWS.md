# 🪟 Solana Program Deployment on Windows

**Recommended Approach:** Use Solana Playground (browser-based) for easiest deployment on Windows.

---

## 🎯 Option 1: Solana Playground (RECOMMENDED for Windows)

### Why Solana Playground?
- ✅ No local installation required
- ✅ Browser-based IDE
- ✅ Automatic wallet creation
- ✅ Free SOL airdrops for devnet
- ✅ One-click build & deploy
- ✅ Works on Windows without issues

### Steps:

#### 1. Open Solana Playground
Navigate to: **https://beta.solpg.io/**

#### 2. Create New Anchor Project
- Click "Create a new project"
- Choose "Anchor" framework
- Name it: `rentflow-core`

#### 3. Replace lib.rs
- Delete the default code in `src/lib.rs`
- Copy the contents from: `programs/rentflow-core/src/lib.rs`
- Paste into Solana Playground

#### 4. Update Cargo.toml
- Replace the dependencies section with:
```toml
[dependencies]
anchor-lang = "0.29.0"
anchor-spl = "0.29.0"
solana-program = "~1.16"
```

#### 5. Build Program
- Click "Build" button (🔨 icon)
- Wait for compilation (30-60 seconds)
- Check for any errors in console

#### 6. Get Program ID
- After successful build, note the **Program ID** shown
- Example: `RentF1ow11111111111111111111111111111111111`

#### 7. Update declare_id!
- In `src/lib.rs`, update line 13:
```rust
declare_id!("YOUR_PROGRAM_ID_HERE");
```
- Replace with the actual Program ID from step 6

#### 8. Rebuild
- Click "Build" again with updated Program ID

#### 9. Deploy to Devnet
- Click "Deploy" button
- Select "Devnet" cluster
- Confirm deployment
- Wait for confirmation (10-20 seconds)

#### 10. Verify Deployment
- Copy the transaction signature
- Visit: `https://explorer.solana.com/tx/YOUR_TX_SIGNATURE?cluster=devnet`
- Confirm program is deployed

#### 11. Get Deployed Program Address
- Go to: `https://explorer.solana.com/address/YOUR_PROGRAM_ID?cluster=devnet`
- Verify program account exists

---

## 🔧 Option 2: Windows Subsystem for Linux (WSL)

If you prefer local development:

### Install WSL
```powershell
# Run in PowerShell as Administrator
wsl --install
```

### Then in WSL Terminal:
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli

# Navigate to project
cd /mnt/c/Users/olumbach/Documents/Rent_Flow

# Deploy
./scripts/deploy-solana-program.sh
```

---

## 🔧 Option 3: Native Windows Installation

### Install Rust for Windows
1. Download: https://www.rust-lang.org/tools/install
2. Run `rustup-init.exe`
3. Follow installer prompts
4. Restart terminal

### Install Solana CLI for Windows
1. Download: https://github.com/solana-labs/solana/releases
2. Extract to `C:\solana`
3. Add to PATH:
   - Open System Environment Variables
   - Add `C:\solana\bin` to PATH
4. Verify: `solana --version`

### Install Anchor for Windows
```powershell
# Install via Cargo
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked

# Verify
anchor --version
```

### Deploy
```powershell
cd C:\Users\olumbach\Documents\Rent_Flow\programs\rentflow-core
anchor build
anchor deploy --provider.cluster devnet
```

---

## 📋 After Deployment (All Options)

### 1. Update Backend .env

Add to `backend/.env`:
```env
SOLANA_PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install @coral-xyz/anchor @project-serum/anchor
```

### 3. Restart Backend
```bash
npm run dev
```

### 4. Verify Integration
```bash
curl http://localhost:3001/api/blockchain/info
```

Should return:
```json
{
  "success": true,
  "data": {
    "solanaProgram": true,
    "programId": "YOUR_PROGRAM_ID"
  }
}
```

---

## 🧪 Testing

### Run Tests (Solana Playground)
- Click "Test" button in Solana Playground
- All 7 tests should pass

### Run Tests (Local)
```bash
cd programs/rentflow-core
anchor test
```

---

## 📊 Deployment Checklist

- [ ] Program built successfully
- [ ] Program ID obtained
- [ ] declare_id! updated in source
- [ ] Program deployed to devnet
- [ ] Deployment verified on Solana Explorer
- [ ] Program ID added to backend/.env
- [ ] Backend dependencies installed
- [ ] Backend restarted
- [ ] Integration verified via API

---

## 🎯 Recommended: Solana Playground

For the fastest deployment on Windows, use **Solana Playground**:
1. Go to https://beta.solpg.io/
2. Copy `programs/rentflow-core/src/lib.rs` into playground
3. Build & Deploy
4. Copy Program ID to backend/.env
5. Done! ✅

**Total time: 5-10 minutes**

---

## 📞 Troubleshooting

### Build Errors
- Ensure Anchor version is 0.29.0
- Check Rust version >= 1.70
- Verify all dependencies in Cargo.toml

### Deployment Errors
- Ensure sufficient SOL in wallet (request airdrop)
- Check network connection
- Verify cluster is set to devnet

### Backend Integration Errors
- Verify SOLANA_PROGRAM_ID is correct
- Check @coral-xyz/anchor is installed
- Ensure backend .env is loaded correctly

---

## 🎉 Success Indicators

✅ Program shows on Solana Explorer  
✅ Backend API returns program ID  
✅ Tests pass in Solana Playground  
✅ No errors in backend logs  

---

**Next: Choose Option 1 (Solana Playground) for fastest deployment!**
