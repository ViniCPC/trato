export type ConfirmationFailure =
  'TRANSACTION_FAILED' | 'WRONG_SIGNER' | 'WRONG_INSTRUCTION';

export interface TransactionEvidence {
  failed: boolean;
  requiredSigners: readonly string[];
  instructions: ReadonlyArray<{ programId: string; data: Uint8Array }>;
}

export function validateTransactionEvidence(
  evidence: TransactionEvidence,
  expected: {
    actorWallet: string;
    programId: string;
    discriminator: Uint8Array;
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
        .equals(Buffer.from(expected.discriminator)),
  );
  return instructionFound ? null : 'WRONG_INSTRUCTION';
}
