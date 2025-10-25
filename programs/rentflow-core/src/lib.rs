/**
 * RentFlow Core - Solana Smart Contract
 * 
 * On-chain lease management with:
 * - Program Derived Addresses (PDAs) for lease accounts
 * - Multi-signature verification (manager + tenant)
 * - Atomic lease activation
 * - Security deposit escrow (future)
 * - Lease status management
 */

use anchor_lang::prelude::*;

declare_id!("RentF1ow11111111111111111111111111111111111");

#[program]
pub mod rentflow_core {
    use super::*;

    /**
     * Initialize a new lease on-chain
     * 
     * Creates a PDA account to store lease data
     * Requires manager's signature and rent payment
     */
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
        require!(
            lease_id.len() <= 64,
            LeaseError::LeaseIdTooLong
        );
        require!(
            monthly_rent > 0,
            LeaseError::InvalidRentAmount
        );
        require!(
            end_date > start_date,
            LeaseError::InvalidDateRange
        );

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

        msg!("✅ Lease initialized: {}", lease.lease_id);
        msg!("   Manager: {}", lease.manager_wallet);
        msg!("   Tenant: {}", lease.tenant_wallet);
        msg!("   Monthly Rent: {} USDC", monthly_rent);

        Ok(())
    }

    /**
     * Sign the lease (manager or tenant)
     * 
     * Records cryptographic signature from signer
     * Auto-activates lease when both parties have signed
     */
    pub fn sign_lease(
        ctx: Context<SignLease>,
        signature_hash: [u8; 32],
    ) -> Result<()> {
        let lease = &mut ctx.accounts.lease;
        let signer = ctx.accounts.signer.key();
        let clock = Clock::get()?;

        require!(
            lease.status == LeaseStatus::Pending,
            LeaseError::LeaseNotPending
        );

        // Determine which party is signing
        if signer == lease.manager_wallet {
            require!(
                !lease.manager_signed,
                LeaseError::AlreadySigned
            );
            lease.manager_signed = true;
            lease.manager_signature = signature_hash;
            msg!("✅ Manager signed lease: {}", lease.lease_id);
        } else if signer == lease.tenant_wallet {
            require!(
                !lease.tenant_signed,
                LeaseError::AlreadySigned
            );
            lease.tenant_signed = true;
            lease.tenant_signature = signature_hash;
            msg!("✅ Tenant signed lease: {}", lease.lease_id);
        } else {
            return Err(LeaseError::UnauthorizedSigner.into());
        }

        // Auto-activate if both parties have signed
        if lease.manager_signed && lease.tenant_signed {
            lease.status = LeaseStatus::Active;
            lease.activated_at = clock.unix_timestamp;
            msg!("🎉 Lease activated! Both parties signed.");
            msg!("   Lease ID: {}", lease.lease_id);
            msg!("   Activated at: {}", lease.activated_at);
        }

        Ok(())
    }

    /**
     * Update lease status
     * 
     * Allows manager to terminate or complete lease
     * Tenant can also request termination
     */
    pub fn update_lease_status(
        ctx: Context<UpdateLeaseStatus>,
        new_status: LeaseStatus,
    ) -> Result<()> {
        let lease = &mut ctx.accounts.lease;
        let signer = ctx.accounts.signer.key();
        let clock = Clock::get()?;

        // Only manager or tenant can update status
        require!(
            signer == lease.manager_wallet || signer == lease.tenant_wallet,
            LeaseError::UnauthorizedSigner
        );

        // Validate state transitions
        match (&lease.status, &new_status) {
            (LeaseStatus::Active, LeaseStatus::Terminated) => {
                // Allow termination from active
                msg!("⚠️  Lease terminated: {}", lease.lease_id);
            },
            (LeaseStatus::Active, LeaseStatus::Completed) => {
                // Require lease end date to be passed
                require!(
                    clock.unix_timestamp >= lease.end_date,
                    LeaseError::LeaseNotEnded
                );
                msg!("✅ Lease completed: {}", lease.lease_id);
            },
            _ => {
                return Err(LeaseError::InvalidStatusTransition.into());
            }
        }

        lease.status = new_status;
        Ok(())
    }

    /**
     * Verify lease signatures
     * 
     * Public read-only function to verify both signatures exist
     */
    pub fn verify_lease(
        ctx: Context<VerifyLease>,
    ) -> Result<bool> {
        let lease = &ctx.accounts.lease;
        
        let is_valid = lease.manager_signed 
            && lease.tenant_signed 
            && lease.status == LeaseStatus::Active;

        msg!("Lease verification: {}", is_valid);
        msg!("  Manager signed: {}", lease.manager_signed);
        msg!("  Tenant signed: {}", lease.tenant_signed);
        msg!("  Status: {:?}", lease.status);

        Ok(is_valid)
    }
}

// ============ Account Structures ============

#[derive(Accounts)]
#[instruction(lease_id: String)]
pub struct InitializeLease<'info> {
    #[account(
        init,
        payer = manager,
        space = 8 + Lease::INIT_SPACE,
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

// ============ Data Structures ============

#[account]
#[derive(InitSpace)]
pub struct Lease {
    #[max_len(64)]
    pub lease_id: String,          // Unique identifier
    pub lease_hash: [u8; 32],      // SHA-256 hash of lease terms
    pub manager_wallet: Pubkey,     // Landlord/property manager
    pub tenant_wallet: Pubkey,      // Tenant
    pub monthly_rent: u64,          // Rent in USDC (6 decimals)
    pub security_deposit: u64,      // Security deposit in USDC
    pub start_date: i64,            // Unix timestamp
    pub end_date: i64,              // Unix timestamp
    pub manager_signed: bool,       // Manager signature status
    pub tenant_signed: bool,        // Tenant signature status
    pub manager_signature: [u8; 32], // Manager's signature hash
    pub tenant_signature: [u8; 32],  // Tenant's signature hash
    pub status: LeaseStatus,        // Current lease status
    pub created_at: i64,            // Creation timestamp
    pub activated_at: i64,          // Activation timestamp
    pub bump: u8,                   // PDA bump seed
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum LeaseStatus {
    Pending,      // Awaiting signatures
    Active,       // Both signed, lease active
    Terminated,   // Ended early
    Completed,    // Ended normally
}

// ============ Error Codes ============

#[error_code]
pub enum LeaseError {
    #[msg("Lease ID cannot exceed 64 characters")]
    LeaseIdTooLong,
    
    #[msg("Rent amount must be greater than 0")]
    InvalidRentAmount,
    
    #[msg("End date must be after start date")]
    InvalidDateRange,
    
    #[msg("Unauthorized signer - must be manager or tenant")]
    UnauthorizedSigner,
    
    #[msg("Lease is not in pending status")]
    LeaseNotPending,
    
    #[msg("This party has already signed the lease")]
    AlreadySigned,
    
    #[msg("Lease has not ended yet")]
    LeaseNotEnded,
    
    #[msg("Invalid status transition")]
    InvalidStatusTransition,
}

// ============ Events ============

#[event]
pub struct LeaseCreated {
    pub lease_id: String,
    pub manager: Pubkey,
    pub tenant: Pubkey,
    pub monthly_rent: u64,
    pub timestamp: i64,
}

#[event]
pub struct LeaseSigned {
    pub lease_id: String,
    pub signer: Pubkey,
    pub signer_type: String,
    pub timestamp: i64,
}

#[event]
pub struct LeaseActivated {
    pub lease_id: String,
    pub timestamp: i64,
}

#[event]
pub struct LeaseStatusChanged {
    pub lease_id: String,
    pub old_status: LeaseStatus,
    pub new_status: LeaseStatus,
    pub timestamp: i64,
}
