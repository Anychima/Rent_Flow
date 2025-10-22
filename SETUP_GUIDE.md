# 🚀 RentFlow AI Setup Guide

This guide will help you set up and run the RentFlow AI platform locally.

## ✅ Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher  
- **Git**: Latest version
- **MetaMask** or another Web3 wallet (for testing)

## 📦 Installation Status

### ✅ Completed Steps

1. ✅ **Repository Cloned**
   - Project successfully cloned from GitHub
   - Git configured with your credentials

2. ✅ **Dependencies Installed**
   - Root dependencies (Hardhat, TypeScript, etc.)
   - Backend dependencies (Express, OpenAI, Supabase, etc.)
   - Frontend dependencies (React, ethers.js, etc.)

3. ✅ **Configuration Files Created**
   - TypeScript configurations for backend and frontend
   - Tailwind CSS configuration
   - Jest testing configuration
   - Environment variable templates

## 🔧 Required Configuration

### 1. Environment Variables

You need to configure the following services and add their credentials to `.env` files:

#### **Backend Environment** (`backend/.env`)

```bash
# Copy the example file
cp backend/.env.example backend/.env
```

Then fill in these values:

**Required API Keys:**
- `OPENAI_API_KEY` - Get from https://platform.openai.com/api-keys
- `ELEVENLABS_API_KEY` - Get from https://elevenlabs.io/
- `SUPABASE_URL` - Create project at https://supabase.com/
- `SUPABASE_KEY` - From your Supabase project settings
- `JWT_SECRET` - Generate a random 256-bit secret

**Blockchain Configuration:**
- `ARC_RPC_URL` - Arc network RPC endpoint
- `ARC_CHAIN_ID` - Arc network chain ID
- `DEPLOYER_PRIVATE_KEY` - Your wallet private key (for deploying contracts)
- `AI_WALLET_PRIVATE_KEY` - Separate wallet for AI agent operations

#### **Frontend Environment** (`frontend/.env`)

```bash
# Copy the example file
cp frontend/.env.example frontend/.env
```

Fill in these values:
- `REACT_APP_SUPABASE_URL` - Same as backend
- `REACT_APP_SUPABASE_KEY` - Same as backend
- `REACT_APP_ARC_RPC_URL` - Arc network RPC
- `REACT_APP_ARC_CHAIN_ID` - Arc chain ID
- `REACT_APP_CONTRACT_ADDRESS` - Will be set after deploying contracts

### 2. Database Setup (Supabase)

1. **Create Supabase Project**
   - Go to https://supabase.com/
   - Create a new project
   - Copy the URL and anon key to your `.env` files

2. **Run Database Schema**
   - Open Supabase SQL Editor
   - Run the schema from `database/schema.sql` (to be populated)
   - Run migrations from `database/migrations.sql` (to be populated)
   - Optionally run seed data from `database/seed.sql` (to be populated)

### 3. Smart Contract Deployment

Before running the application, deploy the smart contracts to Arc network:

```bash
# Compile contracts
npx hardhat compile

# Run tests
npm run test:contracts

# Deploy to Arc network (ensure .env is configured)
npm run deploy:contracts
```

After deployment, copy the contract address to:
- `backend/.env` → `CONTRACT_ADDRESS`
- `frontend/.env` → `REACT_APP_CONTRACT_ADDRESS`

## 🏃 Running the Application

### Option 1: Run Full Stack (Recommended)

```bash
npm run dev
```

This starts both backend (port 3001) and frontend (port 3000) simultaneously.

### Option 2: Run Separately

**Backend Only:**
```bash
npm run dev:backend
# Server runs at http://localhost:3001
```

**Frontend Only:**
```bash
npm run dev:frontend
# App runs at http://localhost:3000
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run contract tests only
npm run test:contracts

# Run backend tests only
npm run test:backend

# Run frontend tests
cd frontend && npm test
```

## 📋 Next Steps Checklist

- [ ] **Sign up for OpenAI API** (https://platform.openai.com/)
- [ ] **Sign up for ElevenLabs** (https://elevenlabs.io/)
- [ ] **Create Supabase project** (https://supabase.com/)
- [ ] **Get Arc network RPC endpoint**
- [ ] **Create two separate wallets** (deployer & AI agent)
- [ ] **Fund wallets with Arc testnet tokens**
- [ ] **Configure all environment variables**
- [ ] **Run database schema on Supabase**
- [ ] **Deploy smart contracts to Arc**
- [ ] **Start development servers**
- [ ] **Connect MetaMask to Arc network**
- [ ] **Test the application**

## 🔑 Getting API Keys

### OpenAI API Key
1. Visit https://platform.openai.com/
2. Sign up or log in
3. Go to API Keys section
4. Create new secret key
5. Copy to `OPENAI_API_KEY`

### ElevenLabs API Key
1. Visit https://elevenlabs.io/
2. Sign up for account
3. Go to Profile → API Keys
4. Copy your API key
5. Add to `ELEVENLABS_API_KEY`

### Supabase Setup
1. Visit https://supabase.com/
2. Create new project
3. Get URL from Settings → API
4. Get anon key from Settings → API
5. Copy both to your `.env` files

### Arc Network Configuration
1. Get Arc RPC URL from Arc documentation
2. Get Chain ID from Arc documentation
3. Add to both `.env` files

## 🔐 Wallet Setup

### Create Wallets
```bash
# You can use MetaMask or generate programmatically
# For development, you can use Hardhat accounts
npx hardhat node
# This will display test accounts with private keys
```

**Important:** Never commit actual private keys! The `.env` files are gitignored for security.

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3001 (backend)
npx kill-port 3001

# Kill process on port 3000 (frontend)
npx kill-port 3000
```

### Dependencies Issues
```bash
# Clean install
rm -rf node_modules backend/node_modules frontend/node_modules
npm run install:all
```

### Compilation Errors
```bash
# Clean Hardhat cache
npx hardhat clean
npx hardhat compile
```

## 📚 Additional Resources

- [RentFlow AI Documentation](https://deepwiki.com/SIFU-john/rentflow-ai)
- [Hardhat Documentation](https://hardhat.org/docs)
- [React Documentation](https://react.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)

## 💬 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the full documentation
3. Check GitHub issues
4. Reach out to the team

---

**Happy Building! 🏗️**
