# 📚 RentFlow AI - Repository Index

> **Complete Guide to Navigating the RentFlow AI Codebase**

---

## 📖 Table of Contents

1. [Project Overview](#project-overview)
2. [Quick Links](#quick-links)
3. [Directory Structure](#directory-structure)
4. [Documentation Map](#documentation-map)
5. [Key Files](#key-files)
6. [Getting Started Guide](#getting-started-guide)
7. [Development Workflows](#development-workflows)
8. [API Endpoints](#api-endpoints)
9. [Smart Contracts](#smart-contracts)
10. [Database Schema](#database-schema)

---

## 🎯 Project Overview

**RentFlow AI** is an AI-powered property management platform built on Solana Devnet with USDC payments. It combines blockchain technology, AI agents, and modern web development to automate rental property operations.

**Repository**: https://github.com/Anychima/Rent_Flow  
**Developer**: Anychima (olumba.chima.anya@ut.ee)  
**License**: MIT  
**Status**: Active Development

---

## 🔗 Quick Links

### Essential Documentation
- [📘 README](./README.md) - Main project documentation
- [🚀 Setup Guide](./SETUP_GUIDE.md) - Installation and configuration
- [🌐 Environment Setup](./ENVIRONMENT_SETUP.md) - Environment variables guide
- [📱 App Walkthrough](./APP_WALKTHROUGH.md) - User interface guide
- [🧪 Testing Guide](./TESTING_GUIDE.md) - Testing instructions

### Development
- [🤝 Contributing Guidelines](./CONTRIBUTING.md)
- [📝 Changelog](./CHANGELOG.md)
- [📄 License](./LICENSE)
- [🚢 Deployment Status](./DEPLOYMENT_STATUS.md)

### GitHub
- [🐛 Report Bug](https://github.com/Anychima/Rent_Flow/issues/new?template=bug_report.md)
- [💡 Request Feature](https://github.com/Anychima/Rent_Flow/issues/new?template=feature_request.md)
- [🔀 Pull Requests](https://github.com/Anychima/Rent_Flow/pulls)

---

## 📂 Directory Structure

```
Rent_Flow/
│
├── 📁 .github/                    # GitHub configuration
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md         # Bug report template
│   │   └── feature_request.md    # Feature request template
│   └── PULL_REQUEST_TEMPLATE.md  # PR template
│
├── 📁 frontend/                   # React Frontend Application
│   ├── public/
│   │   └── index.html            # HTML template
│   ├── src/
│   │   ├── App.tsx               # Main React component
│   │   ├── index.tsx             # Entry point
│   │   └── index.css             # Global styles (Tailwind)
│   ├── package.json              # Frontend dependencies
│   ├── tsconfig.json             # TypeScript config
│   ├── tailwind.config.js        # Tailwind CSS config
│   └── postcss.config.js         # PostCSS config
│
├── 📁 backend/                    # Express Backend API
│   ├── src/
│   │   └── index.ts              # Express server & routes
│   ├── package.json              # Backend dependencies
│   ├── tsconfig.json             # TypeScript config
│   └── jest.config.js            # Jest test config
│
├── 📁 contracts/                  # Solidity Smart Contracts
│   ├── RentFlowCore.sol          # Main rental contract
│   ├── MockUSDC.sol              # Test USDC token
│   ├── hardhat.config.ts         # Hardhat configuration
│   └── tsconfig.json             # TypeScript config
│
├── 📁 database/                   # PostgreSQL Database
│   ├── schema.sql                # Database schema with RLS
│   ├── seed.sql                  # Initial seed data
│   ├── seed-enhanced.sql         # Enhanced seed data
│   ├── seed-no-rls.sql           # Seed without RLS
│   └── fix-rls-policies.sql      # RLS policy fixes
│
├── 📁 scripts/                    # Utility & Deployment Scripts
│   ├── deploy.ts                 # Contract deployment
│   ├── deploy-db.ts              # Database deployment
│   ├── verify-env.ts             # Environment validator
│   └── test/
│       └── RentFlowCore.test.ts  # Contract tests
│
├── 📁 Documentation Files
│   ├── README.md                 # Main documentation
│   ├── SETUP_GUIDE.md            # Setup instructions
│   ├── ENVIRONMENT_SETUP.md      # Environment config
│   ├── APP_WALKTHROUGH.md        # App usage guide
│   ├── TESTING_GUIDE.md          # Testing guide
│   ├── CONTRIBUTING.md           # Contribution guide
│   ├── CHANGELOG.md              # Version history
│   ├── DEPLOYMENT_STATUS.md      # Deployment info
│   ├── CONFIGURATION_COMPLETE.md # Config checklist
│   └── HOW_TO_USE_RENTFLOW.md    # User manual
│
├── 📄 Configuration Files
│   ├── package.json              # Root package & scripts
│   ├── tsconfig.json             # Root TypeScript config
│   ├── hardhat.config.ts         # Root Hardhat config
│   ├── hardhat.tsconfig.json     # Hardhat TypeScript config
│   ├── .env.example              # Environment template
│   ├── .gitignore                # Git ignore rules
│   └── LICENSE                   # MIT License
│
└── 📜 setup-project.sh            # Setup script
```

---

## 📚 Documentation Map

### For New Users
1. Start with [README.md](./README.md) for project overview
2. Follow [SETUP_GUIDE.md](./SETUP_GUIDE.md) for installation
3. Configure environment with [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)
4. Learn the app with [APP_WALKTHROUGH.md](./APP_WALKTHROUGH.md)

### For Developers
1. Read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines
2. Review [TESTING_GUIDE.md](./TESTING_GUIDE.md) for testing
3. Check [DEPLOYMENT_STATUS.md](./DEPLOYMENT_STATUS.md) for deployment
4. Follow [CHANGELOG.md](./CHANGELOG.md) for version history

### For Advanced Users
1. [Smart Contracts](#smart-contracts) section below
2. [API Endpoints](#api-endpoints) reference
3. [Database Schema](#database-schema) documentation

---

## 🔑 Key Files

### Frontend Entry Points
- **`frontend/src/index.tsx`** - React application entry point
- **`frontend/src/App.tsx`** - Main application component
- **`frontend/public/index.html`** - HTML template

### Backend Entry Points
- **`backend/src/index.ts`** - Express server and API routes

### Smart Contracts
- **`contracts/RentFlowCore.sol`** - Main rental management logic
- **`contracts/MockUSDC.sol`** - Test USDC token implementation

### Configuration
- **`.env.example`** - Environment variable template
- **`package.json`** - Root package with workspace scripts
- **`hardhat.config.ts`** - Blockchain development config

### Database
- **`database/schema.sql`** - Complete database schema
- **`database/seed.sql`** - Initial data seeding

---

## 🚀 Getting Started Guide

### 1. Prerequisites
```bash
Node.js >= 18.0.0
npm >= 9.0.0
Git
```

### 2. Clone & Install
```bash
git clone https://github.com/Anychima/Rent_Flow.git
cd Rent_Flow
npm run install:all
```

### 3. Environment Setup
```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env files with your API keys
```

### 4. Run Development
```bash
npm run dev
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

### 5. Run Tests
```bash
npm test
```

---

## 🔄 Development Workflows

### Adding a New Feature
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit
3. Write tests for new functionality
4. Run `npm test` to verify
5. Push and create Pull Request

### Deploying Smart Contracts
```bash
npm run deploy:contracts
```

### Deploying Database Changes
```bash
npm run deploy:db
```

### Running Specific Tests
```bash
# Backend tests
cd backend && npm test

# Contract tests
npx hardhat test
```

---

## 🌐 API Endpoints

### Base URL
- **Development**: `http://localhost:5000`

### Authentication Endpoints
```
POST /api/auth/login       - User login
POST /api/auth/register    - User registration
POST /api/auth/logout      - User logout
```

### Property Endpoints
```
GET    /api/properties           - List all properties
GET    /api/properties/:id       - Get property details
POST   /api/properties           - Create new property
PUT    /api/properties/:id       - Update property
DELETE /api/properties/:id       - Delete property
```

### Rental Endpoints
```
GET    /api/rentals              - List all rentals
POST   /api/rentals              - Create rental agreement
PUT    /api/rentals/:id          - Update rental
GET    /api/rentals/:id/payments - Get payment history
```

### AI Agent Endpoints
```
POST   /api/ai/analyze           - AI property analysis
POST   /api/ai/recommend         - AI recommendations
POST   /api/ai/chat              - AI chatbot
```

*(Full API documentation available in backend/src/index.ts)*

---

## ⛓️ Smart Contracts

### RentFlowCore.sol
Main rental management contract with the following functions:

**Key Functions:**
- `createLease()` - Create new rental agreement
- `payRent()` - Process rent payment in USDC
- `terminateLease()` - End rental agreement
- `depositCollateral()` - Tenant deposit handling
- `releaseDeposit()` - Return deposit to tenant

**Events:**
- `LeaseCreated`
- `RentPaid`
- `LeaseTerminated`
- `DepositReleased`

### MockUSDC.sol
Test USDC token for development:
- Standard ERC20 implementation
- Mintable for testing
- Compatible with Circle USDC interface

**Contract Addresses (Solana Devnet):**
- Deployer Wallet: `8kr6b3uuYx4MgvY8BW9ETogd3cc5ibTj3g8oVZCkKyiz`
- Agent Wallet: `CqQT3otUUcvpvsUCkWzfebanHZeGqKEJprjw5NPLwx4m`

---

## 🗄️ Database Schema

### Main Tables

**users** - User accounts and authentication
```sql
- id (uuid, primary key)
- email (text, unique)
- name (text)
- role (text)
- created_at (timestamp)
```

**properties** - Property listings
```sql
- id (uuid, primary key)
- owner_id (uuid, foreign key → users)
- address (text)
- description (text)
- rent_amount (numeric)
- status (text)
- created_at (timestamp)
```

**rentals** - Active rental agreements
```sql
- id (uuid, primary key)
- property_id (uuid, foreign key → properties)
- tenant_id (uuid, foreign key → users)
- start_date (date)
- end_date (date)
- rent_amount (numeric)
- status (text)
```

**payments** - Payment records
```sql
- id (uuid, primary key)
- rental_id (uuid, foreign key → rentals)
- amount (numeric)
- paid_at (timestamp)
- transaction_hash (text)
- status (text)
```

**Row Level Security (RLS)**: Enabled on all tables for multi-tenant data isolation.

---

## 🛠️ Technology Stack Reference

### Frontend Stack
- React 18
- TypeScript 5.3
- Tailwind CSS 3
- Supabase Client

### Backend Stack
- Node.js 18+
- Express 4
- TypeScript 5.3
- Jest Testing

### Blockchain Stack
- Solidity 0.8.20
- Hardhat 2.19.4
- OpenZeppelin v5
- Solana Devnet

### Database & Services
- PostgreSQL (Supabase)
- OpenAI API
- ElevenLabs API
- Circle USDC API

---

## 📊 Project Statistics

- **Total Lines of Code**: 40,000+
- **Languages**: TypeScript, Solidity, SQL
- **Test Coverage**: Backend & Contracts
- **Documentation Files**: 12+
- **Components**: Frontend, Backend, Smart Contracts, Database

---

## 🤝 Community & Support

### Get Help
- 📧 Email: olumba.chima.anya@ut.ee
- 🐛 Issues: [GitHub Issues](https://github.com/Anychima/Rent_Flow/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/Anychima/Rent_Flow/discussions)

### Contribute
- Read [CONTRIBUTING.md](./CONTRIBUTING.md)
- Check [open issues](https://github.com/Anychima/Rent_Flow/issues)
- Submit Pull Requests

---

## 📜 Version Control

**Current Version**: v0.1.0  
**Last Updated**: October 22, 2025  
**Git Repository**: https://github.com/Anychima/Rent_Flow

---

**⭐ If you find this project helpful, please star the repository!**

---

*This index is automatically maintained. Last update: 2025-10-22*
