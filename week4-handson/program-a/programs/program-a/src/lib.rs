use anchor_lang::prelude::*;
use program_b::program::ProgramB;
declare_id!("A8EUarsy4JuDR2EAvAggerP9gYvVV2G759qWSmzqPivn");

#[program]
pub mod program_a {


    use anchor_lang::solana_program::{program::invoke_signed, system_instruction};

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: program A");

        let pda_address = ctx.accounts.pda_account.key();
        let signer_address = ctx.accounts.signer.key();
        let bump = ctx.bumps.pda_account; //Get the bump from the context

        let instruction = &system_instruction::transfer(&pda_address, &signer_address, 1_000_000_000); 

        let account_infos = [
            ctx.accounts.pda_account.to_account_info(),
            ctx.accounts.signer.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ];

    let signer_seeds:&[&[&[u8]]] = &[&[b"pda",signer_address.as_ref(),&[bump]]];

        invoke_signed(instruction, &account_infos, signer_seeds)?;
        // invoke(instruction, &account_infos)?; //ERROR:  Cross-program invocation with unauthorized signer or writable account'


        //do not use new() as it will throw error for signer privilege escalated as it wont contain signer seeds marking the pda as signer
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.program_b.to_account_info(), 
            program_b::cpi::accounts::Initialize{pda_account: ctx.accounts.pda_account.to_account_info()},
             signer_seeds);


        program_b::cpi::initialize(cpi_context)?;


        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    //Add additional constraints to tell anchor to accept this account as mutable,specify seeds and all
    #[account(
        mut,
        seeds = [b"pda",signer.key().as_ref()],
        bump, //Canonical bump (starts from 255)
    )]
    ///CHECK: pda_account

    pub pda_account: AccountInfo<'info>,//not safe to use AccountInfo as it doe snot perform any checks
    #[account(mut)]
    //cannot be Signer or program, as PDA cannot have signers as they done't have corresponding private key
    //If it was Accounts with some type then the anchor will automatically check for ownership of the PDA, data can be deserialized into structure and so one
    //If it was Signer, anchor will check the corresponding private key signed the transaction

    pub signer: Signer<'info>, //To transfer(receiver)

    pub system_program: Program<'info, System>, 
    //For CPI to the system program

    pub program_b : Program<'info,ProgramB>,
}
