import { validateTransactionEvidence } from './solana-confirmation';

const expected = {
  actorWallet: 'client',
  programId: 'trato-program',
  discriminator: Uint8Array.from([1, 2, 3, 4]),
};

const validEvidence = {
  failed: false,
  requiredSigners: ['client'],
  instructions: [
    { programId: 'trato-program', data: Uint8Array.from([1, 2, 3, 4, 99]) },
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
            { programId: 'trato-program', data: Uint8Array.from([9, 9, 9, 9]) },
          ],
        },
        expected,
      ),
    ).toBe('WRONG_INSTRUCTION');
  });
});
