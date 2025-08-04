//-------------------------------------------------------------------------------
///
/// TASK: Implement the withdraw functionality for the on-chain vault
/// 
/// Requirements:
/// - Verify that the vault is not locked
/// - Verify that the vault has enough balance to withdraw
/// - Transfer lamports from vault to vault authority
/// - Emit a withdraw event after successful transfer
/// 
///-------------------------------------------------------------------------------

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction::transfer;
use crate::state::Vault;
use crate::errors::VaultError;
use crate::events::WithdrawEvent;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    // TODO: Add required accounts and constraints
    #[account(mut)]
    pub vault_authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault", vault_authority.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

pub fn _withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    
    

    if vault.locked {
        return Err(VaultError::VaultLocked.into());
    }

    if **vault.to_account_info().lamports.borrow() < amount {
        return Err(VaultError::InsufficientBalance.into());
    }

    **vault.to_account_info().lamports.borrow_mut() -= amount;
    **ctx.accounts.vault_authority.to_account_info().lamports.borrow_mut() += amount;

    // let transaction = transfer(
    //     &ctx.accounts.vault.key(),
    //     &ctx.accounts.vault_authority.key(),
    //     amount,
    // );
    

    // invoke(&transaction, &[
    //     ctx.accounts.vault.to_account_info(),
    //     ctx.accounts.vault_authority.to_account_info(),
    //     ctx.accounts.system_program.to_account_info(),
    // ])?;

    emit!(WithdrawEvent {
        amount,
        vault_authority: ctx.accounts.vault_authority.key(),
        vault: ctx.accounts.vault.key(),
    });
    Ok(())

}