use anchor_lang::prelude::*;

declare_id!("AEdM5f7PX9L8Mk6CFTWA7z3sHL77KdzZqer5hbm3jH4J");

#[program]
pub mod program_b {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: program B");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    pub pda_account : Signer<'info>
}
