use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct EscrowConfig {
    pub admin: Pubkey,
    pub freelancer: Pubkey,
    pub allowed_mint: Pubkey,
    pub max_amount: u64,
    pub claim_delay_seconds: i64,
    pub paused: bool,
    pub bump: u8,
}
