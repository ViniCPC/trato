use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{
    constants::ESCROW_SEED,
    errors::EscrowError,
    events::EscrowFunded,
    state::{Escrow, EscrowStatus},
};

pub fn handler(ctx: Context<Fund>, milestone_id: [u8; 16], amount: u64) -> Result<()> {
    require!(amount > 0, EscrowError::InvalidAmount);

    let escrow = &mut ctx.accounts.escrow;
    escrow.client = ctx.accounts.client.key();
    escrow.freelancer = ctx.accounts.freelancer.key();
    escrow.mint = ctx.accounts.mint.key();
    escrow.milestone_id = milestone_id;
    escrow.amount = amount;
    escrow.status = EscrowStatus::Funded;
    escrow.bump = ctx.bumps.escrow;

    let transfer_accounts = TransferChecked {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.client_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.client.to_account_info(),
    };
    let transfer_context = CpiContext::new(ctx.accounts.token_program.key(), transfer_accounts);
    token_interface::transfer_checked(transfer_context, amount, ctx.accounts.mint.decimals)?;

    emit!(EscrowFunded {
        escrow: escrow.key(),
        client: escrow.client,
        freelancer: escrow.freelancer,
        mint: escrow.mint,
        milestone_id,
        amount,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(milestone_id: [u8; 16], amount: u64)]
pub struct Fund<'info> {
    #[account(mut)]
    pub client: Signer<'info>,
    /// CHECK: the address is stored in the escrow and cannot equal the client.
    #[account(constraint = freelancer.key() != client.key() @ EscrowError::SameParty)]
    pub freelancer: UncheckedAccount<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = client,
        token::token_program = token_program,
    )]
    pub client_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = client,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [ESCROW_SEED, client.key().as_ref(), milestone_id.as_ref()],
        bump,
    )]
    pub escrow: Account<'info, Escrow>,
    #[account(
        init,
        payer = client,
        associated_token::mint = mint,
        associated_token::authority = escrow,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
