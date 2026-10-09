use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    self, CloseAccount, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::{
    constants::ESCROW_SEED,
    errors::EscrowError,
    events::EscrowRefunded,
    state::{Escrow, EscrowStatus},
};

pub fn handler(ctx: Context<Refund>) -> Result<()> {
    let escrow = &ctx.accounts.escrow;
    let agreed_amount = escrow.amount;
    let vault_amount = ctx.accounts.vault.amount;
    let remainder = vault_amount
        .checked_sub(agreed_amount)
        .ok_or(EscrowError::InvalidVaultBalance)?;
    require_eq!(remainder, 0, EscrowError::InvalidVaultBalance);

    let client = escrow.client;
    let milestone_id = escrow.milestone_id;
    let bump = [escrow.bump];
    let signer_seeds: &[&[u8]] = &[
        ESCROW_SEED,
        client.as_ref(),
        milestone_id.as_ref(),
        bump.as_ref(),
    ];
    let signer = &[signer_seeds];

    let transfer_accounts = TransferChecked {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.client_token_account.to_account_info(),
        authority: escrow.to_account_info(),
    };
    let transfer_context =
        CpiContext::new_with_signer(ctx.accounts.token_program.key(), transfer_accounts, signer);
    token_interface::transfer_checked(transfer_context, agreed_amount, ctx.accounts.mint.decimals)?;

    let close_accounts = CloseAccount {
        account: ctx.accounts.vault.to_account_info(),
        destination: ctx.accounts.client.to_account_info(),
        authority: escrow.to_account_info(),
    };
    let close_context =
        CpiContext::new_with_signer(ctx.accounts.token_program.key(), close_accounts, signer);
    token_interface::close_account(close_context)?;

    emit!(EscrowRefunded {
        escrow: escrow.key(),
        client,
        milestone_id,
        amount: agreed_amount,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub client: Signer<'info>,
    #[account(constraint = escrow.mint == mint.key() @ EscrowError::InvalidMint)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        has_one = client,
        close = client,
        seeds = [ESCROW_SEED, escrow.client.as_ref(), escrow.milestone_id.as_ref()],
        bump = escrow.bump,
        constraint = escrow.status == EscrowStatus::Funded @ EscrowError::InvalidStatus,
    )]
    pub escrow: Account<'info, Escrow>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = escrow,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = client,
        token::token_program = token_program,
    )]
    pub client_token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}
