use anchor_lang::prelude::*;

declare_id!("CAHqQrxwprPF7PvuTR3z8c7vWQJA7VWovjKjeQ13UCjX");

#[program]
pub mod hello_solana {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
