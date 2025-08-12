//-------------------------------------------------------------------------------
///
/// TASK: Implement the remove comment functionality for the Twitter program
/// 
/// Requirements:
/// - Close the comment account and return rent to comment author
/// 
/// NOTE: No implementation logic is needed in the function body - this 
/// functionality is achieved entirely through account constraints!
/// 
///-------------------------------------------------------------------------------

use anchor_lang::prelude::*;
use crate::states::*;

pub fn remove_comment(_ctx: Context<RemoveCommentContext>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct RemoveCommentContext<'info> {
    /// who must sign and who will receive the refunded rent
    #[account(mut)]
    pub comment_author: Signer<'info>,

    /// close = comment_author returns rent to the author
    /// has_one = comment_author ensures only the author can close it
    #[account(mut, close = comment_author, has_one = comment_author)]

    pub comment: Account<'info, Comment>,
}
