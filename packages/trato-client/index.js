import { PublicKey } from '@solana/web3.js';

import escrowIdl from './idl/trato_escrow.json' with { type: 'json' };

export const TRATO_ESCROW_PROGRAM_ID = new PublicKey(escrowIdl.address);
export const ESCROW_SEED = new TextEncoder().encode('escrow');
export const IDL = Object.freeze(escrowIdl);

const ACTION_INSTRUCTION_NAMES = Object.freeze({
  fund: 'fund',
  submit: 'mark_submitted',
  release: 'release',
  refund: 'refund',
});

export function uuidToBytes(uuid) {
  const normalized = uuid.trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalized)) {
    throw new TypeError('milestoneId precisa ser um UUID canônico');
  }

  const hex = normalized.replaceAll('-', '');
  return Uint8Array.from({ length: 16 }, (_, index) =>
    Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16),
  );
}

export async function findEscrowPda(client, milestoneId, programId = TRATO_ESCROW_PROGRAM_ID) {
  const clientPublicKey = client instanceof PublicKey ? client : new PublicKey(client);
  const programPublicKey = programId instanceof PublicKey ? programId : new PublicKey(programId);

  return PublicKey.findProgramAddress(
    [ESCROW_SEED, clientPublicKey.toBytes(), uuidToBytes(milestoneId)],
    programPublicKey,
  );
}

export function getInstructionDiscriminator(action) {
  const instructionName = ACTION_INSTRUCTION_NAMES[action];
  const instruction = IDL.instructions.find((candidate) => candidate.name === instructionName);
  if (!instruction) {
    throw new Error(`Instruction ${instructionName} não encontrada no IDL`);
  }

  return Uint8Array.from(instruction.discriminator);
}

export function getEscrowAccountDiscriminator() {
  const account = IDL.accounts.find((candidate) => candidate.name === 'Escrow');
  if (!account) throw new Error('Conta escrow não encontrada no IDL');
  return Uint8Array.from(account.discriminator);
}
