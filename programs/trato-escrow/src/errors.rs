use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("O valor do escrow precisa ser maior que zero")]
    InvalidAmount,
    #[msg("Cliente e freelancer precisam ser wallets diferentes")]
    SameParty,
    #[msg("O estado atual do escrow não permite esta ação")]
    InvalidStatus,
    #[msg("O mint informado não corresponde ao mint do escrow")]
    InvalidMint,
    #[msg("O vault possui saldo menor que o valor acordado")]
    InvalidVaultBalance,
    #[msg("Uma operação aritmética excedeu o limite permitido")]
    ArithmeticOverflow,
}
