use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{instruction::Instruction, program_option::COption, program_pack::Pack},
        AccountDeserialize, InstructionData, ToAccountMetas,
    },
    anchor_spl::{
        associated_token::{
            get_associated_token_address_with_program_id, ID as ASSOCIATED_TOKEN_ID,
        },
        token::spl_token::{
            state::{Account as TokenAccount, AccountState, Mint},
            ID as TOKEN_PROGRAM_ID,
        },
    },
    litesvm::LiteSVM,
    solana_account::Account,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
    trato_escrow::{constants::ESCROW_SEED, state::EscrowStatus},
};

const TOKEN_DECIMALS: u8 = 6;
const CLIENT_BALANCE: u64 = 50_000_000;
const ESCROW_AMOUNT: u64 = 7_500_000;
const AIRDROP_LAMPORTS: u64 = 10_000_000_000;

struct Fixture {
    svm: LiteSVM,
    client: Keypair,
    freelancer: Keypair,
    attacker: Keypair,
    mint: Pubkey,
    client_token_account: Pubkey,
    milestone_id: [u8; 16],
}

impl Fixture {
    fn new() -> Self {
        let mut svm = LiteSVM::new();
        svm.add_program(
            trato_escrow::id(),
            include_bytes!("../../../target/deploy/trato_escrow.so"),
        )
        .unwrap();

        let client = Keypair::new();
        let freelancer = Keypair::new();
        let attacker = Keypair::new();
        for wallet in [&client, &freelancer, &attacker] {
            svm.airdrop(&wallet.pubkey(), AIRDROP_LAMPORTS).unwrap();
        }

        let mint = Pubkey::new_unique();
        seed_mint(&mut svm, mint, client.pubkey());
        let client_token_account = get_associated_token_address_with_program_id(
            &client.pubkey(),
            &mint,
            &TOKEN_PROGRAM_ID,
        );
        seed_token_account(
            &mut svm,
            client_token_account,
            mint,
            client.pubkey(),
            CLIENT_BALANCE,
        );

        Self {
            svm,
            client,
            freelancer,
            attacker,
            mint,
            client_token_account,
            milestone_id: *b"milestone-test01",
        }
    }

    fn escrow(&self) -> Pubkey {
        Pubkey::find_program_address(
            &[
                ESCROW_SEED,
                self.client.pubkey().as_ref(),
                self.milestone_id.as_ref(),
            ],
            &trato_escrow::id(),
        )
        .0
    }

    fn vault(&self) -> Pubkey {
        get_associated_token_address_with_program_id(&self.escrow(), &self.mint, &TOKEN_PROGRAM_ID)
    }

    fn freelancer_token_account(&self) -> Pubkey {
        get_associated_token_address_with_program_id(
            &self.freelancer.pubkey(),
            &self.mint,
            &TOKEN_PROGRAM_ID,
        )
    }

    fn fund_instruction(&self, freelancer: Pubkey, amount: u64) -> Instruction {
        Instruction::new_with_bytes(
            trato_escrow::id(),
            &trato_escrow::instruction::Fund {
                milestone_id: self.milestone_id,
                amount,
            }
            .data(),
            trato_escrow::accounts::Fund {
                client: self.client.pubkey(),
                freelancer,
                mint: self.mint,
                client_token_account: self.client_token_account,
                escrow: self.escrow(),
                vault: self.vault(),
                token_program: TOKEN_PROGRAM_ID,
                associated_token_program: ASSOCIATED_TOKEN_ID,
                system_program: anchor_lang::system_program::ID,
            }
            .to_account_metas(None),
        )
    }

    fn mark_submitted_instruction(&self, signer: Pubkey) -> Instruction {
        Instruction::new_with_bytes(
            trato_escrow::id(),
            &trato_escrow::instruction::MarkSubmitted {}.data(),
            trato_escrow::accounts::MarkSubmitted {
                freelancer: signer,
                escrow: self.escrow(),
            }
            .to_account_metas(None),
        )
    }

    fn release_instruction(
        &self,
        client: Pubkey,
        freelancer_account: Pubkey,
        mint: Pubkey,
        vault: Pubkey,
    ) -> Instruction {
        Instruction::new_with_bytes(
            trato_escrow::id(),
            &trato_escrow::instruction::Release {}.data(),
            trato_escrow::accounts::Release {
                client,
                freelancer: freelancer_account,
                mint,
                escrow: self.escrow(),
                vault,
                freelancer_token_account: get_associated_token_address_with_program_id(
                    &self.freelancer.pubkey(),
                    &mint,
                    &TOKEN_PROGRAM_ID,
                ),
                token_program: TOKEN_PROGRAM_ID,
                associated_token_program: ASSOCIATED_TOKEN_ID,
                system_program: anchor_lang::system_program::ID,
            }
            .to_account_metas(None),
        )
    }

    fn refund_instruction(&self, client: Pubkey, mint: Pubkey) -> Instruction {
        Instruction::new_with_bytes(
            trato_escrow::id(),
            &trato_escrow::instruction::Refund {}.data(),
            trato_escrow::accounts::Refund {
                client,
                mint,
                escrow: self.escrow(),
                vault: self.vault(),
                client_token_account: self.client_token_account,
                token_program: TOKEN_PROGRAM_ID,
            }
            .to_account_metas(None),
        )
    }

    fn send_as_client(&mut self, instruction: Instruction) -> bool {
        send(&mut self.svm, &self.client, instruction)
    }

    fn fund(&mut self) {
        let instruction = self.fund_instruction(self.freelancer.pubkey(), ESCROW_AMOUNT);
        assert!(self.send_as_client(instruction));
    }

    fn mark_submitted(&mut self) {
        let instruction = self.mark_submitted_instruction(self.freelancer.pubkey());
        assert!(send(&mut self.svm, &self.freelancer, instruction));
    }

    fn escrow_state(&self) -> trato_escrow::state::Escrow {
        let account = self.svm.get_account(&self.escrow()).unwrap();
        trato_escrow::state::Escrow::try_deserialize(&mut account.data.as_slice()).unwrap()
    }

    fn token_balance(&self, address: Pubkey) -> u64 {
        let account = self.svm.get_account(&address).unwrap();
        TokenAccount::unpack(&account.data).unwrap().amount
    }
}

fn send(svm: &mut LiteSVM, signer: &Keypair, instruction: Instruction) -> bool {
    svm.expire_blockhash();
    let message = Message::new_with_blockhash(
        &[instruction],
        Some(&signer.pubkey()),
        &svm.latest_blockhash(),
    );
    let transaction =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[signer]).unwrap();
    svm.send_transaction(transaction).is_ok()
}

fn seed_mint(svm: &mut LiteSVM, address: Pubkey, authority: Pubkey) {
    let mint = Mint {
        mint_authority: COption::Some(authority),
        supply: CLIENT_BALANCE,
        decimals: TOKEN_DECIMALS,
        is_initialized: true,
        freeze_authority: COption::None,
    };
    let mut data = vec![0; Mint::LEN];
    Mint::pack(mint, &mut data).unwrap();
    svm.set_account(
        address,
        Account {
            lamports: svm.minimum_balance_for_rent_exemption(data.len()),
            data,
            owner: TOKEN_PROGRAM_ID,
            executable: false,
            rent_epoch: 0,
        },
    )
    .unwrap();
}

fn seed_token_account(
    svm: &mut LiteSVM,
    address: Pubkey,
    mint: Pubkey,
    owner: Pubkey,
    amount: u64,
) {
    let token_account = TokenAccount {
        mint,
        owner,
        amount,
        delegate: COption::None,
        state: AccountState::Initialized,
        is_native: COption::None,
        delegated_amount: 0,
        close_authority: COption::None,
    };
    let mut data = vec![0; TokenAccount::LEN];
    TokenAccount::pack(token_account, &mut data).unwrap();
    svm.set_account(
        address,
        Account {
            lamports: svm.minimum_balance_for_rent_exemption(data.len()),
            data,
            owner: TOKEN_PROGRAM_ID,
            executable: false,
            rent_epoch: 0,
        },
    )
    .unwrap();
}

#[test]
fn fund_stores_the_escrow_and_deposits_the_exact_amount() {
    let mut fixture = Fixture::new();
    fixture.fund();

    let escrow = fixture.escrow_state();
    assert_eq!(escrow.client, fixture.client.pubkey());
    assert_eq!(escrow.freelancer, fixture.freelancer.pubkey());
    assert_eq!(escrow.mint, fixture.mint);
    assert_eq!(escrow.milestone_id, fixture.milestone_id);
    assert_eq!(escrow.amount, ESCROW_AMOUNT);
    assert_eq!(escrow.status, EscrowStatus::Funded);
    assert_eq!(fixture.token_balance(fixture.vault()), ESCROW_AMOUNT);
    assert_eq!(
        fixture.token_balance(fixture.client_token_account),
        CLIENT_BALANCE - ESCROW_AMOUNT
    );
}

#[test]
fn fund_rejects_zero_amount() {
    let mut fixture = Fixture::new();
    let instruction = fixture.fund_instruction(fixture.freelancer.pubkey(), 0);
    assert!(!fixture.send_as_client(instruction));
    assert!(fixture.svm.get_account(&fixture.escrow()).is_none());
}

#[test]
fn fund_rejects_client_as_freelancer() {
    let mut fixture = Fixture::new();
    let instruction = fixture.fund_instruction(fixture.client.pubkey(), ESCROW_AMOUNT);
    assert!(!fixture.send_as_client(instruction));
}

#[test]
fn freelancer_can_submit_once_but_a_third_party_cannot() {
    let mut fixture = Fixture::new();
    fixture.fund();

    let attacker_instruction = fixture.mark_submitted_instruction(fixture.attacker.pubkey());
    assert!(!send(
        &mut fixture.svm,
        &fixture.attacker,
        attacker_instruction
    ));

    fixture.mark_submitted();
    assert_eq!(fixture.escrow_state().status, EscrowStatus::Submitted);

    let duplicate = fixture.mark_submitted_instruction(fixture.freelancer.pubkey());
    assert!(!send(&mut fixture.svm, &fixture.freelancer, duplicate));
}

#[test]
fn refund_after_submission_is_rejected() {
    let mut fixture = Fixture::new();
    fixture.fund();
    fixture.mark_submitted();

    let instruction = fixture.refund_instruction(fixture.client.pubkey(), fixture.mint);
    assert!(!fixture.send_as_client(instruction));
    assert!(fixture.svm.get_account(&fixture.escrow()).is_some());
}

#[test]
fn freelancer_cannot_release_or_refund() {
    let mut release_fixture = Fixture::new();
    release_fixture.fund();
    let release = release_fixture.release_instruction(
        release_fixture.freelancer.pubkey(),
        release_fixture.client.pubkey(),
        release_fixture.mint,
        release_fixture.vault(),
    );
    assert!(!send(
        &mut release_fixture.svm,
        &release_fixture.freelancer,
        release
    ));

    let mut refund_fixture = Fixture::new();
    refund_fixture.fund();
    let refund =
        refund_fixture.refund_instruction(refund_fixture.freelancer.pubkey(), refund_fixture.mint);
    assert!(!send(
        &mut refund_fixture.svm,
        &refund_fixture.freelancer,
        refund
    ));
}

#[test]
fn a_different_mint_is_rejected() {
    let mut fixture = Fixture::new();
    fixture.fund();
    let wrong_mint = Pubkey::new_unique();
    seed_mint(&mut fixture.svm, wrong_mint, fixture.client.pubkey());

    let instruction = fixture.release_instruction(
        fixture.client.pubkey(),
        fixture.freelancer.pubkey(),
        wrong_mint,
        fixture.vault(),
    );
    assert!(!fixture.send_as_client(instruction));
}

#[test]
fn release_pays_the_freelancer_and_closes_vault_and_escrow() {
    let mut fixture = Fixture::new();
    fixture.fund();
    fixture.mark_submitted();
    let client_lamports_before = fixture.svm.get_balance(&fixture.client.pubkey());

    let instruction = fixture.release_instruction(
        fixture.client.pubkey(),
        fixture.freelancer.pubkey(),
        fixture.mint,
        fixture.vault(),
    );
    assert!(fixture.send_as_client(instruction));

    assert_eq!(
        fixture.token_balance(fixture.freelancer_token_account()),
        ESCROW_AMOUNT
    );
    assert!(fixture.svm.get_account(&fixture.vault()).is_none());
    assert!(fixture.svm.get_account(&fixture.escrow()).is_none());
    assert!(fixture.svm.get_balance(&fixture.client.pubkey()) > client_lamports_before);
}

#[test]
fn client_can_release_early_while_funded() {
    let mut fixture = Fixture::new();
    fixture.fund();
    let instruction = fixture.release_instruction(
        fixture.client.pubkey(),
        fixture.freelancer.pubkey(),
        fixture.mint,
        fixture.vault(),
    );
    assert!(fixture.send_as_client(instruction));
    assert_eq!(
        fixture.token_balance(fixture.freelancer_token_account()),
        ESCROW_AMOUNT
    );
}

#[test]
fn release_rejects_a_vault_with_an_unexpected_balance() {
    let mut fixture = Fixture::new();
    fixture.fund();
    let vault = fixture.vault();
    let mint = fixture.mint;
    let escrow = fixture.escrow();
    seed_token_account(&mut fixture.svm, vault, mint, escrow, ESCROW_AMOUNT + 1);

    let instruction = fixture.release_instruction(
        fixture.client.pubkey(),
        fixture.freelancer.pubkey(),
        fixture.mint,
        fixture.vault(),
    );
    assert!(!fixture.send_as_client(instruction));
}

#[test]
fn refund_returns_tokens_and_closes_vault_and_escrow() {
    let mut fixture = Fixture::new();
    fixture.fund();
    let client_lamports_before = fixture.svm.get_balance(&fixture.client.pubkey());
    let instruction = fixture.refund_instruction(fixture.client.pubkey(), fixture.mint);

    assert!(fixture.send_as_client(instruction));
    assert_eq!(
        fixture.token_balance(fixture.client_token_account),
        CLIENT_BALANCE
    );
    assert!(fixture.svm.get_account(&fixture.vault()).is_none());
    assert!(fixture.svm.get_account(&fixture.escrow()).is_none());
    assert!(fixture.svm.get_balance(&fixture.client.pubkey()) > client_lamports_before);
}
