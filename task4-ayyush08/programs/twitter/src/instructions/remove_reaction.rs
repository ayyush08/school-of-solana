//-------------------------------------------------------------------------------
///
/// TASK: Implement the remove reaction functionality for the Twitter program
///
/// Requirements:
/// - Verify that the tweet reaction exists and belongs to the reaction author
/// - Decrement the appropriate counter (likes or dislikes) on the tweet
/// - Close the tweet reaction account and return rent to reaction author
///
///-------------------------------------------------------------------------------
use anchor_lang::prelude::*;

use crate::errors::TwitterError;
use crate::states::*;

pub fn remove_reaction(ctx: Context<RemoveReactionContext>) -> Result<()> {
    let tweet = &mut ctx.accounts.tweet;
    let reaction_author = &ctx.accounts.reaction_author;
    let tweet_reaction = &ctx.accounts.tweet_reaction;

    if reaction_author.key() != tweet_reaction.reaction_author {
        return Err(TwitterError::InvalidReactionAuthor.into());
    }

    if tweet_reaction.parent_tweet != tweet.key() {
        return Err(TwitterError::InvalidReactionAuthor.into());
    }

    match tweet_reaction.reaction {
        ReactionType::Like => {
            if tweet.likes == 0 {
                return Err(TwitterError::MinLikesReached.into());
            }
            tweet.likes -= 1;
        }
        ReactionType::Dislike => {
            if tweet.dislikes == 0 {
                return Err(TwitterError::MinDislikesReached.into());
            }
            tweet.dislikes -= 1;
        }
    }

    Ok(())
}

#[derive(Accounts)]
pub struct RemoveReactionContext<'info> {
    // TODO: Add required account constraints
    #[account(mut)]
    pub reaction_author: Signer<'info>,

    #[account(
        mut,
        close = reaction_author,
        seeds = [
            TWEET_REACTION_SEED.as_bytes(),
            reaction_author.key().as_ref(),
            tweet.key().as_ref(),
            ],
            bump
        )]
    pub tweet_reaction: Account<'info, Reaction>,

    #[account(mut)]
    pub tweet: Account<'info, Tweet>,
}
