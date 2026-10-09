use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("973yrLGt8Jro3ak66GxTyBXBYens5di54txDxJFGJNxG");

#[program]
pub mod trato_escrow {
    use super::*;

    pub fn fund(ctx: Context<Fund>, milestone_id: [u8; 16], amount: u64) -> Result<()> {
        instructions::fund::handler(ctx, milestone_id, amount)
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
}
