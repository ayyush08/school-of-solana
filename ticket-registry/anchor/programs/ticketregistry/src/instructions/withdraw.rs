use anchor_lang::prelude::*;


use crate::{ state::{Event, Ticket}};



pub fn _withdraw(
    ctx: Context<WithdrawContext>,
    amount: u64
) -> Result<()> {
    

    let event = &mut ctx.accounts.event;
    let event_organizer = &mut ctx.accounts.event_organizer;

    //Since event account is owned by our program , we do not need to use the cpi
    //simply update lamports manually


    event.sub_lamports(amount)?;
    event_organizer.add_lamports(amount)?;


    Ok(())
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct WithdrawContext<'info> {
    #[account(mut)]
    pub event_organizer: Signer<'info>,


    pub ticket: Account<'info,Ticket>,
    #[account(
        mut,
        has_one = event_organizer
    )]
    pub event: Account<'info, Event>,
}
