//-------------------------------------------------------------------------------
///
/// TASK: Implement the deposit functionality for the on-chain vault
/// 
/// Requirements:
/// - Verify that the user has enough balance to deposit
/// - Verify that the vault is not locked
/// - Transfer lamports from user to vault using CPI (Cross-Program Invocation)
/// - Emit a deposit event after successful transfer
/// 
///-------------------------------------------------------------------------------

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction::transfer;
use crate::state::Vault;
use crate::errors::VaultError;
use crate::events::DepositEvent;

#[derive(Accounts)]
pub struct Deposit<'info> {
    // TODO: Add required accounts and constraints
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault", vault.vault_authority.key().as_ref()],
        bump
    )]
    pub vault: Account<'info,Vault>,
    pub system_program: Program<'info, System>,
}

pub fn _deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // TODO: Implement deposit functionality
    let vault = &mut ctx.accounts.vault;
    
    if vault.locked {
        return Err(VaultError::VaultLocked.into());
    }

    let user_lamports = ctx.accounts.user.lamports();

    if user_lamports < amount{
        return Err(VaultError::InsufficientBalance.into());
    }

    let transaction = transfer(
        &ctx.accounts.user.key(),
        &ctx.accounts.vault.key(),
        amount,
    );

    invoke(&transaction, 
        &[
            ctx.accounts.user.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ]
    )?;

    emit!(DepositEvent {
        vault: ctx.accounts.vault.key(),
        user: ctx.accounts.user.key(),
        amount,
    });

    Ok(())
}