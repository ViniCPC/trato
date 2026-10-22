use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("5jqtbGSBvTACNYzjeWFsRnXLYFwZDMZ9qjV8Spt4jgqn");

#[program]
pub mod trato_escrow {
    use super::*;

    pub fn fund(ctx: Context<Fund>, milestone_id: [u8; 16], amount: u64) -> Result<()> {
        instructions::fund::handler(ctx, milestone_id, amount)
    }

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        admin: Pubkey,
        freelancer: Pubkey,
        allowed_mint: Pubkey,
        max_amount: u64,
        claim_delay_seconds: i64,
    ) -> Result<()> {
        instructions::config::initialize(
            ctx,
            admin,
            freelancer,
            allowed_mint,
            max_amount,
            claim_delay_seconds,
        )
    }

    pub fn update_config(
        ctx: Context<UpdateConfig>,
        max_amount: u64,
        claim_delay_seconds: i64,
        paused: bool,
    ) -> Result<()> {
        instructions::config::update(ctx, max_amount, claim_delay_seconds, paused)
    }

    pub fn mark_submitted(ctx: Context<MarkSubmitted>) -> Result<()> {
        instructions::mark_submitted::handler(ctx)
    }

    pub fn release(ctx: Context<Release>) -> Result<()> {
        instructions::release::handler(ctx)
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        instructions::refund::handler(ctx)
    }

    pub fn claim_after_deadline(ctx: Context<ClaimAfterDeadline>) -> Result<()> {
        instructions::claim_after_deadline::handler(ctx)
    }
}
