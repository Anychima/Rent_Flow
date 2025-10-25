# 🚀 Database Migration Instructions

## ✅ Status: Ready to Apply

Your frontend and backend are now running successfully!

- ✅ Frontend: http://localhost:3000
- ✅ Backend: http://localhost:3001

## 📋 Next Step: Run Database Migration

To enable the new **Chat Continuity** and **Wallet Tracking** features, you need to run the SQL migration.

### Option 1: Supabase SQL Editor (Recommended - Easy!)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Sign in to your account
   - Select your project: `saiceqyaootvkdenxbqx`

2. **Navigate to SQL Editor**
   - Click on **SQL Editor** in the left sidebar
   - Click **+ New query** button

3. **Run the Migration**
   - Copy the contents of `CHAT_CONTINUITY_MIGRATION.sql`
   - Paste it into the SQL editor
   - Click **Run** (or press Ctrl+Enter)

4. **Verify Success**
   - You should see output messages:
     ```
     ✅ lease_id column added to messages table
     ✅ Wallet columns added to leases table
     ✅ MIGRATION COMPLETE!
     ```

### Option 2: Using psql Command Line (Advanced)

If you prefer command line:

```bash
# Navigate to project directory
cd C:\Users\olumbach\Documents\Rent_Flow

# Run migration using psql (requires PostgreSQL client installed)
psql "postgresql://postgres:your-password@db.saiceqyaootvkdenxbqx.supabase.co:5432/postgres" -f CHAT_CONTINUITY_MIGRATION.sql
```

**Note:** You'll need to replace `your-password` with your actual database password.

## 🎯 What This Migration Does

### 1. Adds Chat Continuity
- Adds `lease_id` column to `messages` table
- Allows chat conversations to continue from application → lease
- Messages automatically migrate when lease is signed

### 2. Adds Wallet Tracking
- Adds wallet columns to `leases` table:
  - `manager_wallet_address`, `manager_wallet_type`, `manager_wallet_id`
  - `tenant_wallet_address`, `tenant_wallet_type`, `tenant_wallet_id`
- Stores wallet info used for signing and payments
- Supports both Phantom and Circle wallets

## 🧪 After Migration: Testing the Flow

Once the migration is complete, test the complete workflow:

### Test Scenario: Tenant Application → Lease Signing → Payments

1. **As Tenant (Prospective):**
   - Browse properties at http://localhost:3000
   - Sign up / Log in as prospective tenant
   - Apply to a property
   - Chat with property manager

2. **As Manager:**
   - Log in as manager
   - View application in dashboard
   - Approve application
   - Generate lease
   - Sign lease with wallet (Phantom or Circle)

3. **As Tenant:**
   - View approved application
   - Open lease signing page
   - Connect wallet (same as manager used for compatibility)
   - Sign lease
   - **NEW:** Payment section appears immediately!
   - Complete security deposit payment
   - Complete first month rent payment
   - Lease activates automatically
   - Role changes from `prospective_tenant` → `tenant`

4. **Verify Chat Continuity:**
   - Check that previous messages from application are visible in lease context
   - Send new messages in lease chat
   - Both manager and tenant should see complete conversation history

## 📚 Related Documentation

- `IMPLEMENTATION_SUMMARY.md` - Complete technical details
- `QUICK_START_WALLET_CHAT_FIX.md` - User-friendly guide
- `CHAT_CONTINUITY_MIGRATION.sql` - The actual migration script

## ⚠️ Important Notes

- The migration is **safe to run multiple times** (uses `IF NOT EXISTS` checks)
- No existing data will be lost or modified
- The changes are **backwards compatible** with existing code
- Payment implementation uses placeholder transactions - actual Circle API integration may need enhancement based on your requirements

## 🎉 You're Almost Done!

After running the migration:
1. Migration completes → ✅
2. Test the workflow → ✅
3. Enjoy seamless wallet continuity and chat migration → 🚀

---

**Questions?** Check `IMPLEMENTATION_SUMMARY.md` for troubleshooting and detailed technical information.
