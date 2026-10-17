import {
  hasExactTokenCredit,
  validateTransactionEvidence,
} from './solana-confirmation';

const expected = {
  actorWallet: 'client',
  programId: 'trato-program',
  discriminator: Uint8Array.from([1, 2, 3, 4]),
  escrowAddress: 'escrow-a',
  escrowAccountIndex: 3,
};

const validEvidence = {
  failed: false,
  requiredSigners: ['client'],
  instructions: [
    {
      programId: 'trato-program',
      data: Uint8Array.from([1, 2, 3, 4, 99]),
      accounts: ['client', 'freelancer', 'mint', 'escrow-a'],
    },
  ],
};

describe('validateTransactionEvidence', () => {
  it('aceita signer, programa e discriminator esperados', () => {
    expect(validateTransactionEvidence(validEvidence, expected)).toBeNull();
  });

  it('rejeita uma transação que falhou on-chain', () => {
    expect(
      validateTransactionEvidence({ ...validEvidence, failed: true }, expected),
    ).toBe('TRANSACTION_FAILED');
  });

  it('rejeita signer diferente', () => {
    expect(
      validateTransactionEvidence(
        { ...validEvidence, requiredSigners: ['attacker'] },
        expected,
      ),
    ).toBe('WRONG_SIGNER');
  });

  it('rejeita programa diferente', () => {
    expect(
      validateTransactionEvidence(
        {
          ...validEvidence,
          instructions: [
            { ...validEvidence.instructions[0], programId: 'attacker' },
          ],
        },
        expected,
      ),
    ).toBe('WRONG_INSTRUCTION');
  });

  it('rejeita discriminator de outra ação', () => {
    expect(
      validateTransactionEvidence(
        {
          ...validEvidence,
          instructions: [
            {
              ...validEvidence.instructions[0],
              data: Uint8Array.from([9, 9, 9, 9]),
            },
          ],
        },
        expected,
      ),
    ).toBe('WRONG_INSTRUCTION');
  });

  it('rejeita instrução certa com escrow de outra etapa', () => {
    expect(
      validateTransactionEvidence(
        {
          ...validEvidence,
          instructions: [
            {
              ...validEvidence.instructions[0],
              accounts: ['client', 'freelancer', 'mint', 'escrow-b'],
            },
          ],
        },
        expected,
      ),
    ).toBe('WRONG_INSTRUCTION');
  });
});

describe('hasExactTokenCredit', () => {
  const balance = (accountIndex: number, amount: string, mint = 'usdc') => ({
    accountIndex,
    mint,
    uiTokenAmount: { amount },
  });

  it('confere o aumento exato em unidades base', () => {
    expect(
      hasExactTokenCredit(
        [balance(5, '10')],
        [balance(5, '25')],
        5,
        'usdc',
        15n,
      ),
    ).toBe(true);
  });

  it('aceita conta de token criada na mesma transação', () => {
    expect(hasExactTokenCredit([], [balance(5, '15')], 5, 'usdc', 15n)).toBe(
      true,
    );
  });

  it('rejeita pagamento em conta, mint ou valor diferentes', () => {
    expect(hasExactTokenCredit([], [balance(6, '15')], 5, 'usdc', 15n)).toBe(
      false,
    );
    expect(
      hasExactTokenCredit([], [balance(5, '15', 'other')], 5, 'usdc', 15n),
    ).toBe(false);
    expect(hasExactTokenCredit([], [balance(5, '14')], 5, 'usdc', 15n)).toBe(
      false,
    );
  });
});
