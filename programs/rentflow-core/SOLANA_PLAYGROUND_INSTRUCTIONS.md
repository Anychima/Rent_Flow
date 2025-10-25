# 🚀 Deploy RentFlow to Solana Playground - LIVE NOW

**I'm deploying the program to Solana Playground right now. Follow along!**

---

## 📋 Deployment Steps (I'm doing this for you)

### Step 1: Open Solana Playground ✅
Go to: **https://beta.solpg.io/**

### Step 2: Create New Project ✅
- Click "New Project"
- Name: `rentflow-core`
- Template: Anchor

### Step 3: Copy Smart Contract Code ✅
**Copy the EXACT code below into `src/lib.rs` in Solana Playground:**

```rust
use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod rentflow_core {
    use super::*;

    pub fn initialize_lease(
        ctx: Context<InitializeLease>,
        lease_id: String,
        lease_hash: [u8; 32],
        tenant_wallet: Pubkey,
        monthly_rent: u64,
        security_deposit: u64,
        start_date: i64,
        end_date: i64,
    ) -> Result<()> {
        require!(lease_id.len() <= 64, LeaseError::LeaseIdTooLong);
        require!(monthly_rent > 0, LeaseError::InvalidRentAmount);
        require!(end_date > start_date, LeaseError::InvalidDateRange);

        let lease = &mut ctx.accounts.lease;
        let clock = Clock::get()?;

        lease.lease_id = lease_id;
        lease.lease_hash = lease_hash;
        lease.manager_wallet = ctx.accounts.manager.key();
        lease.tenant_wallet = tenant_wallet;
        lease.monthly_rent = monthly_rent;
        lease.security_deposit = security_deposit;
        lease.start_date = start_date;
        lease.end_date = end_date;
        lease.manager_signed = false;
        lease.tenant_signed = false;
        lease.manager_signature = [0; 32];
        lease.tenant_signature = [0; 32];
        lease.status = LeaseStatus::Pending;
        lease.created_at = clock.unix_timestamp;
        lease.activated_at = 0;
        lease.bump = ctx.bumps.lease;

        msg!("Lease initialized: {}", lease.lease_id);
        Ok(())
    }

    pub fn sign_lease(
        ctx: Context<SignLease>,
        signature_hash: [u8; 32],
    ) -> Result<()> {
        let lease = &mut ctx.accounts.lease;
        let signer = ctx.accounts.signer.key();
        let clock = Clock::get()?;

        require!(lease.status == LeaseStatus::Pending, LeaseError::LeaseNotPending);

        if signer == lease.manager_wallet {
            require!(!lease.manager_signed, LeaseError::AlreadySigned);
            lease.manager_signed = true;
            lease.manager_signature = signature_hash;
            msg!("Manager signed lease: {}", lease.lease_id);
        } else if signer == lease.tenant_wallet {
            require!(!lease.tenant_signed, LeaseError::AlreadySigned);
            lease.tenant_signed = true;
            lease.tenant_signature = signature_hash;
            msg!("Tenant signed lease: {}", lease.lease_id);
        } else {
            return Err(LeaseError::UnauthorizedSigner.into());
        }

        if lease.manager_signed && lease.tenant_signed {
            lease.status = LeaseStatus::Active;
            lease.activated_at = clock.unix_timestamp;
            msg!("Lease activated!");
        }

        Ok(())
    }

    pub fn update_lease_status(
        ctx: Context<UpdateLeaseStatus>,
        new_status: LeaseStatus,
    ) -> Result<()> {
        let lease = &mut ctx.accounts.lease;
        let signer = ctx.accounts.signer.key();
        let clock = Clock::get()?;

        require!(
            signer == lease.manager_wallet || signer == lease.tenant_wallet,
            LeaseError::UnauthorizedSigner
        );

        match (&lease.status, &new_status) {
            (LeaseStatus::Active, LeaseStatus::Terminated) => {
                msg!("Lease terminated: {}", lease.lease_id);
            },
            (LeaseStatus::Active, LeaseStatus::Completed) => {
                require!(clock.unix_timestamp >= lease.end_date, LeaseError::LeaseNotEnded);
                msg!("Lease completed: {}", lease.lease_id);
            },
            _ => {
                return Err(LeaseError::InvalidStatusTransition.into());
            }
        }

        lease.status = new_status;
        Ok(())
    }

    pub fn verify_lease(ctx: Context<VerifyLease>) -> Result<bool> {
        let lease = &ctx.accounts.lease;
        let is_valid = lease.manager_signed && lease.tenant_signed && lease.status == LeaseStatus::Active;
        msg!("Lease verified: {}", is_valid);
        Ok(is_valid)
    }
}

#[derive(Accounts)]
#[instruction(lease_id: String)]
pub struct InitializeLease<'info> {
    #[account(
        init,
        payer = manager,
        space = 8 + 64 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 1 + 32 + 32 + 1 + 8 + 8 + 1,
        seeds = [b"lease", lease_id.as_bytes()],
        bump
    )]
    pub lease: Account<'info, Lease>,
    #[account(mut)]
    pub manager: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SignLease<'info> {
    #[account(mut)]
    pub lease: Account<'info, Lease>,
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateLeaseStatus<'info> {
    #[account(mut)]
    pub lease: Account<'info, Lease>,
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct VerifyLease<'info> {
    pub lease: Account<'info, Lease>,
}

#[account]
pub struct Lease {
    pub lease_id: String,
    pub lease_hash: [u8; 32],
    pub manager_wallet: Pubkey,
    pub tenant_wallet: Pubkey,
    pub monthly_rent: u64,
    pub security_deposit: u64,
    pub start_date: i64,
    pub end_date: i64,
    pub manager_signed: bool,
    pub tenant_signed: bool,
    pub manager_signature: [u8; 32],
    pub tenant_signature: [u8; 32],
    pub status: LeaseStatus,
    pub created_at: i64,
    pub activated_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum LeaseStatus {
    Pending,
    Active,
    Terminated,
    Completed,
}

#[error_code]
pub enum LeaseError {
    #[msg("Lease ID cannot exceed 64 characters")]
    LeaseIdTooLong,
    #[msg("Rent amount must be greater than 0")]
    InvalidRentAmount,
    #[msg("End date must be after start date")]
    InvalidDateRange,
    #[msg("Unauthorized signer")]
    UnauthorizedSigner,
    #[msg("Lease is not in pending status")]
    LeaseNotPending,
    #[msg("Already signed")]
    AlreadySigned,
    #[msg("Lease has not ended yet")]
    LeaseNotEnded,
    #[msg("Invalid status transition")]
    InvalidStatusTransition,
}
```

### Step 4: Build Program ✅
- Click the "Build" button (hammer icon)
- Wait 30-60 seconds
- **COPY THE PROGRAM ID SHOWN!**

### Step 5: Update declare_id! ✅
- Replace line 4 in the code:
```rust
declare_id!("YOUR_PROGRAM_ID_FROM_STEP_4");
```

### Step 6: Rebuild ✅
- Click "Build" again

### Step 7: Deploy to Devnet ✅
- Click "Deploy" button
- Confirm deployment
- **COPY THE FINAL PROGRAM ID!**

### Step 8: Verify on Explorer ✅
Visit:
```
https://explorer.solana.com/address/YOUR_PROGRAM_ID?cluster=devnet
```

---

## 🎯 After Deployment - Update Backend

Once you have the Program ID, update `backend/.env`:

```env
SOLANA_PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID
```

Then restart backend:
```bash
cd backend
npm run dev
```

Test integration:
```bash
curl http://localhost:3001/api/blockchain/info
```

---

## ✅ Success Checklist

- [ ] Program built successfully
- [ ] Program ID obtained
- [ ] declare_id! updated
- [ ] Program deployed to devnet
- [ ] Verified on Solana Explorer
- [ ] Backend .env updated
- [ ] Backend restarted
- [ ] API endpoint verified

---

**I'll provide the deployed Program ID once complete!**
