export type ConfirmationFailure =
  'TRANSACTION_FAILED' | 'WRONG_SIGNER' | 'WRONG_INSTRUCTION';

export interface TransactionEvidence {
  failed: boolean;
  requiredSigners: readonly string[];
  instructions: ReadonlyArray<{
    programId: string;
    data: Uint8Array;
    accounts: readonly string[];
  }>;
}

export function validateTransactionEvidence(
  evidence: TransactionEvidence,
  expected: {
    actorWallet: string;
    programId: string;
    discriminator: Uint8Array;
    escrowAddress: string;
    escrowAccountIndex: number;
  },
): ConfirmationFailure | null {
  if (evidence.failed) return 'TRANSACTION_FAILED';
  if (!evidence.requiredSigners.includes(expected.actorWallet))
    return 'WRONG_SIGNER';

  const instructionFound = evidence.instructions.some(
    (instruction) =>
      instruction.programId === expected.programId &&
      Buffer.from(instruction.data)
        .subarray(0, expected.discriminator.length)
        .equals(Buffer.from(expected.discriminator)) &&
      instruction.accounts[expected.escrowAccountIndex] ===
        expected.escrowAddress,
  );
  return instructionFound ? null : 'WRONG_INSTRUCTION';
}

interface TokenBalanceEvidence {
  accountIndex: number;
  mint: string;
  uiTokenAmount: { amount: string };
}

export function hasExactTokenCredit(
  preBalances: readonly TokenBalanceEvidence[] | null | undefined,
  postBalances: readonly TokenBalanceEvidence[] | null | undefined,
  accountIndex: number,
  mint: string,
  expectedAmount: bigint,
): boolean {
  const post = postBalances?.find(
    (balance) => balance.accountIndex === accountIndex && balance.mint === mint,
  );
  if (!post) return false;
  const pre = preBalances?.find(
    (balance) => balance.accountIndex === accountIndex && balance.mint === mint,
  );
  try {
    return (
      BigInt(post.uiTokenAmount.amount) -
        BigInt(pre?.uiTokenAmount.amount ?? '0') ===
      expectedAmount
    );
  } catch {
    return false;
  }
}
