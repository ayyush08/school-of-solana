use anchor_lang::prelude::*;

declare_id!("56uCAgue7K9kT5RR5iphmxMCVgn5na6c7W6hxiVW5GNA");

#[program]
pub mod hello_solana {
    use super::*;

    //Initialize is an instruction containing context that expects the accounts defined in the Initialize struct.
    //This function is an instruction that our program supports.
    pub fn initialize(ctx: Context<Initialize>,hello:String) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);   

        let data_account = &mut ctx.accounts.data_account; // We get the data account from the context.
        
        data_account.hello = hello;
        Ok(())
    }
}

//In structs, like these we define what account the instructions withinn our program expect or use.
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer:Signer<'info>, // This is a signer, it pays the rent for the data stored in data accounts. (Balance in data accounts cannot be zero).
    #[account(
        init, // This means that the account will be created if it does not exist.
        payer = signer, // This means that the signer will pay for the rent of this account.
        space = 200, // This is the size of the account in bytes. It must be large enough to store the data we want to store.
    )]

    pub data_account:Account<'info, DataAccount>, // This is a data account, it stores data that our program can use.
    pub system_program: Program<'info, System>, // This is the system program, it is used to create accounts and transfer lamports.
}    

#[account]
pub struct DataAccount{
    pub hello: String, // This is a data account, it stores data that our program can use.
}


