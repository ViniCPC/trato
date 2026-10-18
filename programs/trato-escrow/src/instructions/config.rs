use anchor_lang::prelude::*;

use crate::{constants::CONFIG_SEED, errors::EscrowError, state::EscrowConfig};

fn valid_terms(max_amount: u64, claim_delay_seconds: i64) -> bool {
    max_amount > 0 && (1..=30 * 24 * 60 * 60).contains(&claim_delay_seconds)
}

pub fn initialize(
    ctx: Context<InitializeConfig>,
    admin: Pubkey,
    freelancer: Pubkey,
    allowed_mint: Pubkey,
    max_amount: u64,
    claim_delay_seconds: i64,
) -> Result<()> {
    require!(
        valid_terms(max_amount, claim_delay_seconds),
        EscrowError::InvalidConfig
    );
    require!(
        admin != Pubkey::default() && freelancer != Pubkey::default(),
        EscrowError::InvalidConfig
    );
    let config = &mut ctx.accounts.config;
    config.admin = admin;
    config.freelancer = freelancer;
    config.allowed_mint = allowed_mint;
    config.max_amount = max_amount;
    config.claim_delay_seconds = claim_delay_seconds;
    config.paused = false;
    config.bump = ctx.bumps.config;
    Ok(())
}

pub fn update(
    ctx: Context<UpdateConfig>,
    max_amount: u64,
    claim_delay_seconds: i64,
    paused: bool,
) -> Result<()> {
    require!(
        valid_terms(max_amount, claim_delay_seconds),
        EscrowError::InvalidConfig
    );
    let config = &mut ctx.accounts.config;
    config.max_amount = max_amount;
    config.claim_delay_seconds = claim_delay_seconds;
    config.paused = paused;
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + EscrowConfig::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, EscrowConfig>,
    #[account(constraint = program.programdata_address()? == Some(program_data.key()))]
    pub program: Program<'info, crate::program::TratoEscrow>,
    #[account(constraint = program_data.upgrade_authority_address == Some(authority.key()))]
    pub program_data: Account<'info, ProgramData>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = admin,
    )]
    pub config: Account<'info, EscrowConfig>,
}
