use anchor_lang::prelude::*;


#[error_code]

pub enum TicketRegistryError {
    #[msg("Event name is too long")]
    NameTooLong,
    #[msg("Event description is too long")]
    DescriptionTooLong,
    #[msg("Start date is in the past")]
    StartDateInThePast,
    #[msg("Available tickets is too low")]
    AvailableTicketsTooLow,
    #[msg("All tickets sold out")]
    AllTicketsSoldOut,
}