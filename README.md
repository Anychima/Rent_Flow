# 🏠 RentFlow AI

> AI-Powered Property Management System on Solana Devnet with USDC Payments

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)](https://soliditylang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0-61dafb)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)

**Built for the AI Agents on Arc with USDC Hackathon**

RentFlow AI is a comprehensive blockchain-based property management platform that leverages AI agents, smart contracts, and USDC payments to automate and streamline rental property operations on the Solana Devnet.

---

## ✨ Features

- 🤖 **AI-Powered Agents**: Automated property management with OpenAI and ElevenLabs integration
- ⛓️ **Smart Contracts**: Secure rental agreements and payment processing on Solana blockchain
- 💰 **USDC Payments**: Stablecoin-based rent collection and deposit management
- 🏦 **Supabase Integration**: Real-time database with Row Level Security (RLS)
- 📊 **Property Dashboard**: Comprehensive analytics and management interface
- 🔒 **Secure Authentication**: Multi-tenant architecture with role-based access control
- 📱 **Responsive UI**: Modern React frontend with Tailwind CSS

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- PostgreSQL (via Supabase)
- Solana CLI (optional, for wallet management)

### Installation

```bash
# Clone repository
git clone https://github.com/Anychima/Rent_Flow.git
cd Rent_Flow

# Install all dependencies (root, backend, frontend)
npm run install:all

# Configure environment variables
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit .env files with your API keys and configuration
```

### Environment Setup

You'll need the following API keys and configurations:

- **Supabase**: Project URL and API keys
- **OpenAI**: API key for AI agent functionality
- **ElevenLabs**: API key for voice/audio features
- **Circle API**: For USDC payment processing
- **Solana Wallet**: Deployer and agent wallet addresses (Devnet)

See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for detailed configuration instructions.

### Development

```bash
# Verify environment configuration
npm run verify:env

# Start backend and frontend concurrently
npm run dev

# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

### Deployment

```bash
# Deploy smart contracts to Solana Devnet
npm run deploy:contracts

# Deploy database schema to Supabase
npm run deploy:db

# Run all tests
npm test
```

---

## 📚 Documentation

- 📖 [Complete Walkthrough](./COMPLETE_WALKTHROUGH_SUMMARY.md)
- 🚀 [Setup Guide](./SETUP_GUIDE.md)
- 🌐 [Environment Setup](./ENVIRONMENT_SETUP.md)
- 🎯 [How to Use RentFlow](./HOW_TO_USE_RENTFLOW.md)
- 📱 [App Walkthrough](./APP_WALKTHROUGH.md)
- 🧪 [Testing Guide](./TESTING_GUIDE.md)
- ✅ [Configuration Complete](./CONFIGURATION_COMPLETE.md)
- 🚢 [Deployment Status](./DEPLOYMENT_STATUS.md)

---

## 🏗️ Project Structure

```
Rent_Flow/
├── 📁 frontend/              # React + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── App.tsx          # Main application component
│   │   ├── index.tsx        # Entry point
│   │   └── index.css        # Global styles
│   ├── public/
│   │   └── index.html       # HTML template
│   └── package.json
│
├── 📁 backend/               # Node.js + Express + TypeScript
│   ├── src/
│   │   └── index.ts         # Express server with API routes
│   ├── jest.config.js       # Jest testing configuration
│   └── package.json
│
├── 📁 contracts/             # Solidity Smart Contracts
│   ├── RentFlowCore.sol     # Main rental management contract
│   ├── MockUSDC.sol         # Mock USDC token for testing
│   └── hardhat.config.ts    # Hardhat configuration
│
├── 📁 database/              # PostgreSQL Schema & Seeds
│   ├── schema.sql           # Database schema with RLS
│   ├── seed.sql             # Initial data seeding
│   ├── seed-enhanced.sql    # Enhanced seed data
│   ├── seed-no-rls.sql      # Seed without RLS policies
│   └── fix-rls-policies.sql # RLS policy fixes
│
├── 📁 scripts/               # Deployment & Utility Scripts
│   ├── deploy.ts            # Smart contract deployment
│   ├── deploy-db.ts         # Database deployment
│   ├── verify-env.ts        # Environment validation
│   └── test/
│       └── RentFlowCore.test.ts  # Contract tests
│
├── 📄 hardhat.config.ts     # Root Hardhat configuration
├── 📄 tsconfig.json         # Root TypeScript configuration
├── 📄 package.json          # Root package with workspace scripts
└── 📄 .env.example          # Environment template
```

---

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript 5.3** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Supabase Client** - Real-time data & auth

### Backend
- **Node.js 18+** - Runtime
- **Express** - Web framework
- **TypeScript** - Language
- **Supabase** - PostgreSQL database
- **Jest** - Testing framework

### Blockchain
- **Solidity 0.8.20** - Smart contract language
- **Hardhat 2.19.4** - Development environment
- **Solana Devnet** - Blockchain network
- **USDC** - Payment token

### AI & Services
- **OpenAI API** - AI agent intelligence
- **ElevenLabs** - Voice/audio processing
- **Circle API** - USDC payment infrastructure

---

## 📦 Available Scripts

### Root Level
```bash
npm run install:all    # Install all dependencies
npm run dev            # Run backend + frontend concurrently
npm test               # Run contract + backend tests
npm run deploy:contracts  # Deploy smart contracts
npm run deploy:db      # Deploy database schema
npm run verify:env     # Validate environment setup
```

### Frontend
```bash
cd frontend
npm start              # Start development server
npm run build          # Build for production
npm test               # Run tests
```

### Backend
```bash
cd backend
npm run dev            # Start with nodemon
npm test               # Run Jest tests
npm run build          # Compile TypeScript
```

### Contracts
```bash
npx hardhat compile    # Compile contracts
npx hardhat test       # Run contract tests
npx hardhat node       # Start local node
```

---

## 🧪 Testing

RentFlow includes comprehensive testing across all layers:

- **Smart Contract Tests**: Hardhat testing framework
- **Backend API Tests**: Jest with integration tests
- **Frontend Tests**: React Testing Library (setup ready)

Run all tests:
```bash
npm test
```

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for detailed testing instructions.

---

## 🔐 Security

- Row Level Security (RLS) policies on database tables
- Environment variable protection
- Smart contract security with OpenZeppelin v5
- Secure API key management
- Role-based access control

**⚠️ Important**: Never commit `.env` files or expose API keys publicly.

---

## 🚢 Deployment

Refer to [DEPLOYMENT_STATUS.md](./DEPLOYMENT_STATUS.md) for:
- Current deployment status
- Network configurations
- Deployed contract addresses
- Production checklist

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

**Developer**: Anychima  
**Email**: olumba.chima.anya@ut.ee  
**GitHub**: [@Anychima](https://github.com/Anychima)

---

## 🙏 Acknowledgments

- Built for the **AI Agents on Arc with USDC Hackathon**
- Powered by **Solana Devnet** and **Circle USDC**
- AI capabilities by **OpenAI** and **ElevenLabs**
- Database infrastructure by **Supabase**
- Smart contract development with **Hardhat** and **OpenZeppelin**

---

## 📞 Support

For questions, issues, or support:
- Open an issue on [GitHub](https://github.com/Anychima/Rent_Flow/issues)
- Email: olumba.chima.anya@ut.ee

---

**⭐ Star this repository if you find it helpful!**
