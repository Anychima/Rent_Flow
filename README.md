# 🏠 RentFlow AI

> AI-Powered Property Management System on Arc Testnet with USDC Payments

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)](https://soliditylang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0-61dafb)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Arc Testnet](https://img.shields.io/badge/Arc-Testnet-purple)](https://arc.network/)

RentFlow AI is a comprehensive blockchain-based property management platform that leverages AI agents, smart contracts on Arc Testnet, and USDC payments to automate and streamline rental property operations.

---

## ✨ Features

- 🤖 **AI-Powered Agents**: Automated property management with OpenAI and ElevenLabs integration
- ⛓️ **Smart Contracts**: Secure rental agreements and payment processing on Arc blockchain
- 💰 **USDC Payments**: Stablecoin-based rent collection and deposit management with gasless transactions
- 🌉 **Cross-Chain Capabilities**: CCTP integration for multi-chain property portfolios
- 🏦 **Supabase Integration**: Real-time database with Row Level Security (RLS)
- 📊 **Property Dashboard**: Comprehensive analytics and management interface
- 🔒 **Secure Authentication**: Multi-tenant architecture with role-based access control
- 📱 **Responsive UI**: Modern React frontend with Tailwind CSS
- 🌐 **Public Property Browsing**: Non-logged-in users can browse available properties
- 🔄 **Automated Systems**: AI analysis, voice notifications, payment scheduling, and blockchain sync
- 🧠 **AI Decision Making**: Autonomous payment processing and predictive maintenance scheduling
- 💸 **Micropayments**: Content creator features with small USDC transfers (limited to $1)

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- PostgreSQL (via Supabase)
- Arc Wallet Configuration

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
- **Arc Wallet**: Deployer and agent wallet addresses

See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for detailed configuration instructions.

### Development

```bash
# Verify environment configuration
npm run verify:env

# Set up demo user account (first time only)
npm run setup:demo

# Start backend and frontend concurrently
npm run dev

# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

### 🔐 Demo Credentials

After running `npm run setup:demo`, you can login with:

**Manager Account:**
- Email: `manager@rentflow.ai`
- Password: `RentFlow2024!`

**Tenant Accounts** (created via seed data):
- Email: `tenant1@example.com` (password setup required)
- Email: `tenant2@example.com` (password setup required)

💡 **Note**: The setup script creates the manager account automatically. For production, change these credentials immediately.

### 🔄 Automated Systems Setup

RentFlow AI includes several automated systems that can be set up individually or all at once:

```bash
# Set up all automation systems at once
npm run setup:all-automation

# Or set up individual systems:
npm run setup:ai-analysis          # AI analysis for maintenance requests
npm run setup:voice-notifications  # Voice notifications system
npm run setup:payment-scheduler    # Payment generation and tracking
npm run setup:blockchain-logging   # Blockchain event synchronization
```

### 🚀 Arc-Specific Features - FULLY IMPLEMENTED

RentFlow AI now fully supports Arc blockchain with all hackathon requirements implemented:

1. **Gasless Transactions**: USDC as native gas enables gasless transactions for small payments
2. **Cross-Chain Payments**: CCTP integration for multi-chain property portfolios
3. **AI Agent Autonomy**: Automated decision-making for payments and maintenance
4. **Micropayments**: Content creator features with small USDC transfers (limited to $1)

All Arc features are ready to use. To enable Arc features, set `BLOCKCHAIN_NETWORK=arc` in your environment variables.

### Deployment

```bash
# Deploy smart contracts to Arc
npm run deploy:contracts

# Deploy database schema to Supabase
npm run deploy:db

# Run database migrations
npm run migrate:db

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
- 📋 [Implementation Roadmap](./IMPLEMENTATION_ROADMAP.md)
- 📄 [Arc Enhancements](./ARC_ENHANCEMENTS.md)

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
│   ├── deploy-contracts.ts  # Smart contract deployment
│   ├── deploy-db.ts         # Database deployment
│   ├── verify-env.ts        # Environment validation
│   ├── setup-ai-analysis.ts # AI analysis automation
│   ├── setup-voice-notifications.ts # Voice notifications system
│   ├── setup-payment-scheduler.ts   # Payment scheduling system
│   ├── setup-blockchain-logging.ts  # Blockchain sync logging
│   ├── setup-all-automation.ts      # All automation systems
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
- **React Router** - Navigation
- **Axios** - HTTP client

### Backend
- **Node.js 18+** - Runtime environment
- **Express** - Web framework
- **TypeScript 5.3** - Type safety
- **Supabase Client** - Database integration
- **Circle API** - USDC payment processing
- **OpenAI API** - AI agent functionality
- **ElevenLabs API** - Voice/audio generation

### Blockchain
- **Arc Blockchain** - Primary network
- **Solidity 0.8.20** - Smart contracts
- **Hardhat** - Development environment
- **OpenZeppelin** - Security contracts
- **Web3.js** - Blockchain interaction
- **CCTP** - Cross-chain transfers

### Database
- **PostgreSQL** - Primary database (via Supabase)
- **Row Level Security** - Data protection
- **Realtime Subscriptions** - Live updates

### DevOps
- **GitHub** - Version control
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework
- **Concurrently** - Parallel execution

---

## 🏆 Hackathon Compliance

RentFlow AI fully complies with all hackathon requirements:

### ✅ On-chain Actions
- AI agents autonomously interact with payment protocols
- Smart contracts handle rental agreements and payments
- Real-time blockchain event synchronization

### ✅ Payments for Real-World Assets (RWA)
- Enable recurring USDC payments for tokenized real estate
- Gasless transactions for small payments using USDC as native gas
- Cross-chain payment capabilities for multi-chain portfolios

### ✅ Payments for Content
- Design AI-native payment flows for creators with micropayments
- Micropayment system for property listing services (limited to $1)
- Content creator features with small USDC transfers

### ✅ Arc Integration
- Full support for Arc blockchain with USDC as native gas
- Integration with Circle's Developer-Controlled Wallets
- Cross-Chain Transfer Protocol (CCTP) implementation

### ✅ Working Prototype
- All features are implemented and tested
- Comprehensive documentation and setup guides
- Demo accounts and seed data for testing

### ✅ Clear Problem-Solving Purpose
- Addresses real-world property management challenges
- Automates repetitive tasks with AI agents
- Streamlines payment processing with blockchain technology

### ✅ Clean, Maintainable Code
- Well-structured implementation with clear separation of concerns
- Comprehensive TypeScript typing
- Modular architecture with reusable components

### ✅ Simple, Usable Interfaces
- Intuitive UI with easy access to all features
- Responsive design for all device sizes
- Clear navigation and user flows

### ✅ Realistic Pathways for Adoption
- Practical features with clear business value
- Comprehensive onboarding and setup process
- Scalable architecture for production deployment

---

## 📞 Support

For issues, questions, or contributions, please:

1. Check the [Documentation](./docs/)
2. Review existing [Issues](https://github.com/Anychima/Rent_Flow/issues)
3. Open a new issue if needed
4. Contact the development team

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- Circle for their Developer-Controlled Wallets API
- Arc for their innovative blockchain platform
- OpenAI for powering our AI agents
- ElevenLabs for voice generation capabilities
- Supabase for the excellent database platform
- The open-source community for invaluable tools and libraries