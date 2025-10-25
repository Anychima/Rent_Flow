use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod rentflow_core {
    use super::*;

    pub fn initialize_lease(
        ctx: Context<InitializeLease>,
        lease_id: String,
        monthly_rent: u64,
    ) -> Result<()> {
        let lease = &mut ctx.accounts.lease;
        lease.lease_id = lease_id;
        lease.manager_wallet = ctx.accounts.manager.key();
        lease.monthly_rent = monthly_rent;
        lease.manager_signed = false;
        lease.tenant_signed = false;
        lease.is_active = false;
        Ok(())
    }

    pub fn sign_lease(ctx: Context<SignLease>) -> Result<()> {
        let lease = &mut ctx.accounts.lease;
        let signer = ctx.accounts.signer.key();

        if signer == lease.manager_wallet {
            lease.manager_signed = true;
        } else {
            lease.tenant_signed = true;
        }

        if lease.manager_signed && lease.tenant_signed {
            lease.is_active = true;
        }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(lease_id: String)]
pub struct InitializeLease<'info> {
    #[account(
        init,
        payer = manager,
        space = 8 + 32 + 32 + 8 + 1 + 1 + 1,
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

#[account]
pub struct Lease {
    pub lease_id: String,
    pub manager_wallet: Pubkey,
    pub monthly_rent: u64,
    pub manager_signed: bool,
    pub tenant_signed: bool,
    pub is_active: bool,
}
