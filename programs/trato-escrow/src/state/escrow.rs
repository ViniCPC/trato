use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub mint: Pubkey,
    pub milestone_id: [u8; 16],
    pub amount: u64,
    pub status: EscrowStatus,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, InitSpace, PartialEq, Eq)]
pub enum EscrowStatus {
    Funded,
    Submitted,
}
