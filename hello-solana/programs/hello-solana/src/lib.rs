use anchor_lang::prelude::*;

declare_id!("56uCAgue7K9kT5RR5iphmxMCVgn5na6c7W6hxiVW5GNA");

#[program]
pub mod hello_solana {
    use super::*;

    //Initialize is an instruction containing context that expects the accounts defined in the Initialize struct.
    //This function is an instruction that our program supports.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
    pub fn update(ctx: Context<Update>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

//In structs, like these we define what account the instructions withinn our program expect or use.
#[derive(Accounts)]
pub struct Initialize {}    

#[derive(Accounts)]
pub struct Update{}
