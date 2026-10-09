use anchor_lang::prelude::*;

use crate::{
    constants::ESCROW_SEED,
    errors::EscrowError,
    events::EscrowSubmitted,
    state::{Escrow, EscrowStatus},
};

pub fn handler(ctx: Context<MarkSubmitted>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    escrow.status = EscrowStatus::Submitted;

    emit!(EscrowSubmitted {
        escrow: escrow.key(),
        freelancer: escrow.freelancer,
        milestone_id: escrow.milestone_id,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct MarkSubmitted<'info> {
    pub freelancer: Signer<'info>,
    #[account(
        mut,
        has_one = freelancer,
        seeds = [ESCROW_SEED, escrow.client.as_ref(), escrow.milestone_id.as_ref()],
        bump = escrow.bump,
        constraint = escrow.status == EscrowStatus::Funded @ EscrowError::InvalidStatus,
    )]
    pub escrow: Account<'info, Escrow>,
}
