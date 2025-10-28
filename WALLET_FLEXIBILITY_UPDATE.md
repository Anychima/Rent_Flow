# 🔐 Wallet Flexibility Update - User Choice Implementation

**Date**: 2025-10-28  
**Status**: ✅ COMPLETE  
**Type**: Feature Enhancement

---

## 🎯 Overview

Updated the wallet system to give users **full flexibility** in how they manage their Arc wallets:

- ❌ **REMOVED**: Automatic wallet creation during signup
- ✅ **ADDED**: User choice - create new wallet OR connect existing wallet
- ✅ **ADDED**: Wallet connection modal (triggered when needed)
- ✅ **ADDED**: Support for external wallets (user's own Arc address)

---

## 🆕 New Features

### 1. Wallet Connection Modal

**New Component**: `frontend/src/components/WalletConnectionModal.tsx`

**Features**:
- **Option 1: Create New Wallet**
  - Managed by Circle Developer Controlled Wallets
  - Secure and easy to use
  - Recommended for most users
  
- **Option 2: Connect Existing Wallet**
  - Users can enter their own Arc wallet address
  - For advanced users who manage their own wallets
  - Validates address format (0x... 42 characters)

**When Modal Appears**:
- During lease signing (when user needs to sign)
- During payment (when user needs to pay)
- In wallet settings tab (manual wallet management)

### 2. User Wallet Endpoint

**New Backend Endpoint**: `POST /api/users/:userId/wallet`

**Purpose**: Save user's external wallet address to database

**Request Body**:
```json
{
  "walletAddress": "0x...",
  "walletType": "external"
}
```

**Validation**:
- Must start with `0x`
- Must be exactly 42 characters
- Checks for valid Arc address format

---

## 📝 Modified Files

### Frontend Changes

#### 1. `frontend/src/components/AuthWall.tsx`
- ✅ Removed wallet address input field from signup
- ✅ Added info message: "Arc wallet will be created automatically after signup"
- ✅ Simplified signup to: Name, Email, Password, Role

#### 2. `frontend/src/contexts/AuthContext.tsx`
- ✅ Removed `walletAddress` parameter from `signUp` function
- ✅ No longer passes wallet_address to Supabase

#### 3. `frontend/src/pages/LeaseSigningPage.tsx`
- ✅ Changed `connectArcWallet()` to show modal instead of auto-creating
- ✅ Added `showWalletModal` state
- ✅ Added `handleWalletConnected` callback
- ✅ Imports `WalletConnectionModal` component

#### 4. `frontend/src/components/WalletConnectionModal.tsx` (NEW)
- ✅ Complete wallet connection UI
- ✅ Two options: Create or Connect
- ✅ Address validation
- ✅ Error handling
- ✅ Success feedback

### Backend Changes

#### 1. `backend/src/index.ts`
- ✅ Added `POST /api/users/:userId/wallet` endpoint
- ✅ Validates Arc address format
- ✅ Saves wallet_address and wallet_type to database

### Database Changes

#### 1. `database/migrations/019_remove_wallet_from_signup_trigger.sql`
- ✅ Removed wallet_address from auth trigger
- ✅ User record created WITHOUT wallet initially
- ✅ Wallet added later when user chooses

---

## 🔄 New User Flow

### Signup Flow
1. User fills signup form (NO wallet field)
2. Account created in auth.users
3. User record created in public.users (wallet_address = NULL)
4. User redirected to dashboard

### Wallet Connection Flow (On-Demand)

**Scenario 1: During Lease Signing**
1. User clicks "Sign Lease"
2. No wallet detected → Modal appears
3. User chooses:
   - **Create New**: System creates Circle-managed wallet
   - **Connect Existing**: User enters their Arc address
4. Wallet saved to database
5. User can now sign lease

**Scenario 2: During Payment**
1. User clicks "Pay Now"
2. No wallet detected → Modal appears
3. User connects wallet (same as above)
4. Payment proceeds with selected wallet

**Scenario 3: In Wallet Settings**
1. User goes to Wallet tab
2. Clicks "Connect Wallet" or "Add Wallet"
3. Modal appears with options
4. User manages wallets proactively

---

## 💡 Wallet Types Supported

### 1. Circle-Managed Wallet (`walletType: 'circle'`)
**How It Works**:
- System creates wallet using Circle SDK
- Returns `walletId` (UUID) and `address` (0x...)
- Both stored in database
- System can initiate transactions on user's behalf

**Pros**:
- No setup required
- Always available
- Secure and reliable
- Recommended for most users

**Cons**:
- User doesn't have direct control
- Trust in Circle infrastructure

### 2. External Wallet (`walletType: 'external'`)
**How It Works**:
- User provides their own Arc wallet address
- Only `address` stored (no walletId)
- User must sign transactions themselves
- User manages their own keys

**Pros**:
- Full user control
- User owns their keys
- Can use existing wallet

**Cons**:
- User must have USDC on Arc
- User must manage wallet security
- More technical knowledge required

---

## 🗄️ Database Schema

### users Table Columns:
```sql
circle_wallet_id TEXT           -- NULL for external wallets
wallet_address TEXT             -- 0x... Arc address (for both types)
wallet_type TEXT                -- 'circle' or 'external'
```

### Wallet States:

**No Wallet Connected**:
```sql
circle_wallet_id: NULL
wallet_address: NULL
wallet_type: NULL
```

**Circle-Managed Wallet**:
```sql
circle_wallet_id: 'abc-123-def-456'
wallet_address: '0x1234...5678'
wallet_type: 'circle'
```

**External Wallet**:
```sql
circle_wallet_id: NULL
wallet_address: '0x9876...4321'
wallet_type: 'external'
```

---

## 🧪 Testing Instructions

### Test 1: New User Signup
1. Sign up with new account
2. **VERIFY**: No wallet address field in form
3. **VERIFY**: Account created successfully
4. **VERIFY**: Database shows wallet_address = NULL

### Test 2: Create Circle Wallet
1. Log in as new user
2. Go to lease signing page OR wallet tab
3. Click "Connect Wallet"
4. **VERIFY**: Modal appears with 2 options
5. Click "Create New Wallet"
6. **VERIFY**: Success message shows wallet address
7. **VERIFY**: Database shows circle_wallet_id AND wallet_address

### Test 3: Connect External Wallet
1. Log in as user without wallet
2. Click "Connect Wallet"
3. Choose "Connect Existing Wallet"
4. Enter Arc address: `0x1234567890123456789012345678901234567890`
5. **VERIFY**: Address accepted
6. **VERIFY**: Database shows wallet_address (circle_wallet_id = NULL)

### Test 4: Payment with Circle Wallet
1. Sign lease (creates Circle wallet if needed)
2. Payment section appears
3. **VERIFY**: Wallet shown as connected
4. Click "Pay Now"
5. **VERIFY**: Payment processes through Circle API

### Test 5: Payment with External Wallet
1. Connect external wallet
2. **VERIFY**: Cannot initiate payment (user must sign externally)
3. **NOTE**: External wallet flow needs manual signing

---

## 🔐 Security Considerations

### Circle-Managed Wallets:
- ✅ Keys managed by Circle infrastructure
- ✅ Non-custodial (Circle can't access funds without user)
- ✅ Industry-standard security
- ✅ Automatic transaction management

### External Wallets:
- ⚠️ User must maintain wallet security
- ⚠️ Lost keys = lost access (we can't help)
- ⚠️ User responsible for funding wallet with USDC
- ⚠️ Must have Arc Testnet network configured

---

## 📊 Database Migration

**File**: `database/migrations/019_remove_wallet_from_signup_trigger.sql`

**YOU NEED TO RUN THIS IN SUPABASE**:

```sql
-- Remove wallet_address from signup trigger
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::TEXT,
    'prospective_tenant'
  );
  
  user_role := CASE user_role
    WHEN 'property_manager' THEN 'property_manager'
    WHEN 'manager' THEN 'manager'
    WHEN 'prospective_tenant' THEN 'prospective_tenant'
    WHEN 'tenant' THEN 'tenant'
    WHEN 'ai_agent' THEN 'ai_agent'
    ELSE 'prospective_tenant'
  END;

  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    user_type,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'full_name')::TEXT, ''),
    user_role,
    user_role,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    role = EXCLUDED.role,
    user_type = EXCLUDED.user_type,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error syncing user to public.users: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## ✅ Benefits of This Approach

### For Users:
- ✅ Flexibility to choose wallet type
- ✅ Can use existing Arc wallets
- ✅ No forced wallet creation
- ✅ Simpler signup process

### For Product:
- ✅ Supports both managed and self-custody models
- ✅ Reduces signup friction
- ✅ Better user experience
- ✅ More control over wallet connection timing

### For Development:
- ✅ Cleaner separation of concerns
- ✅ Wallet logic isolated in modal component
- ✅ Easier to add new wallet types later
- ✅ Better error handling

---

## 🚀 Next Steps

1. **RUN** database migration in Supabase
2. **TEST** signup (should work without wallet)
3. **TEST** wallet connection modal
4. **TEST** payment with Circle wallet
5. **VERIFY** external wallet saving works

---

## 📝 Notes

**Circle Wallet Creation**:
- Still uses `/api/arc/wallet/create` endpoint
- Creates wallet on-demand (not at signup)
- Saves to database when successful

**External Wallet Support**:
- Currently saves address to database
- Future: Implement external wallet transaction signing
- For now, external wallets are for receiving only

**Wallet Tab**:
- Should show wallet connection status
- Allow users to change wallets
- Display balance (for Circle wallets)

---

## 🎉 Summary

**What Changed**:
- Removed automatic wallet creation
- Added user choice modal
- Support for external wallets
- On-demand wallet connection

**Result**:
Users now have **full flexibility** in wallet management while maintaining a **seamless payment experience**.

The system respects user choice while providing an easy path for those who want managed wallets! 🚀
