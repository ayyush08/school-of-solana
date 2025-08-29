use anchor_lang::prelude::*;

use crate::state::{Event, MAX_DESCRIPTION_LEN, MAX_NAME_LEN};
use crate::errors::TicketRegistryError;
pub fn _initialize(
    ctx: Context<InitializeContext>,
    name: String,
    description: String,
    ticket_price: u64,
    available_tickets: u64,
    start_date: i64,
) -> Result<()> {
    

    let event = &mut ctx.accounts.event;

    require!(name.len() <= MAX_NAME_LEN,
    TicketRegistryError::NameTooLong);

    event.name = name;

    require!(description.len() <= MAX_DESCRIPTION_LEN,
    TicketRegistryError::DescriptionTooLong);

    event.description = description;
    
    require!(
        available_tickets > 0,
        TicketRegistryError::AvailableTicketsTooLow
    );
    
    event.available_tickets = available_tickets;

    require!(
        start_date > Clock::get()?.unix_timestamp,
        TicketRegistryError::StartDateInPast
    );
    event.start_date = start_date;
    
    event.ticket_price = ticket_price;
    event.event_organizer = ctx.accounts.event_organizer.key();

    Ok(())
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitializeContext<'info> {
    #[account(mut)]
    pub event_organizer: Signer<'info>,

    #[account(
        init,
        payer = event_organizer,
        space = 8 + Event::INIT_SPACE,
        seeds = [b"event", name.as_bytes(), event_organizer.key().as_ref()],//Since these seeds have both the name and the organizer's key, they are unique i.e., every event organizer can create only one event with a certain name. If we removed the organizer key, means we can only have one event with a certain name. If we also removed the name, then we have one event in total and whoever creates it first will have the only event
        bump
    )]
    pub event: Account<'info, Event>,
    pub system_program: Program<'info, System>,
}
