use anchor_lang::prelude::*;

#[event]
pub struct EscrowFunded {
    pub escrow: Pubkey,
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub mint: Pubkey,
    pub milestone_id: [u8; 16],
    pub amount: u64,
}

#[event]
pub struct EscrowSubmitted {
    pub escrow: Pubkey,
    pub freelancer: Pubkey,
    pub milestone_id: [u8; 16],
}

#[event]
pub struct EscrowReleased {
    pub escrow: Pubkey,
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub milestone_id: [u8; 16],
    pub amount: u64,
}

#[event]
pub struct EscrowRefunded {
    pub escrow: Pubkey,
    pub client: Pubkey,
    pub milestone_id: [u8; 16],
    pub amount: u64,
}

#[event]
pub struct EscrowClaimed {
    pub escrow: Pubkey,
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub milestone_id: [u8; 16],
    pub amount: u64,
}
