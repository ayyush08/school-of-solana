use anchor_lang::prelude::*;





use crate::{errors::TicketRegistryError, state::{Event, Ticket}};
pub fn _buy(
    ctx: Context<BuyContext>,
) -> Result<()> {
    

    let event = &mut ctx.accounts.event;


    Ok(())
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct BuyContext<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        init,
        payer = buyer,
        space = 8 + Ticket::INIT_SPACE,
        seeds = [b"ticket", event.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub ticket: Account<'info,Ticket>,
    #[account(mut)]
    pub event: Account<'info, Event>,
    pub system_program: Program<'info, System>,
}
