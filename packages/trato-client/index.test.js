import assert from 'node:assert/strict';
import test from 'node:test';

import { PublicKey } from '@solana/web3.js';

import {
  ESCROW_SEED,
  TRATO_ESCROW_PROGRAM_ID,
  findEscrowPda,
  getEscrowAccountDiscriminator,
  getInstructionDiscriminator,
  uuidToBytes,
} from './index.js';

const CLIENT = new PublicKey('11111111111111111111111111111111');
const MILESTONE_ID = '550e8400-e29b-41d4-a716-446655440000';

test('uuidToBytes converte um UUID para exatamente 16 bytes', () => {
  assert.deepEqual(
    [...uuidToBytes(MILESTONE_ID)],
    [85, 14, 132, 0, 226, 155, 65, 212, 167, 22, 68, 102, 85, 68, 0, 0],
  );
});

test('uuidToBytes rejeita entradas não canônicas', () => {
  assert.throws(() => uuidToBytes('550e8400e29b41d4a716446655440000'), TypeError);
});

test('findEscrowPda usa a seed, o cliente e o UUID canônicos', async () => {
  const [actual, bump] = await findEscrowPda(CLIENT, MILESTONE_ID);
  const [expected, expectedBump] = await PublicKey.findProgramAddress(
    [ESCROW_SEED, CLIENT.toBytes(), uuidToBytes(MILESTONE_ID)],
    TRATO_ESCROW_PROGRAM_ID,
  );

  assert.equal(actual.toBase58(), expected.toBase58());
  assert.equal(bump, expectedBump);
});

test('getInstructionDiscriminator lê todos os discriminators do IDL', () => {
  assert.deepEqual([...getInstructionDiscriminator('fund')], [218, 188, 111, 221, 152, 113, 174, 7]);
  assert.deepEqual([...getInstructionDiscriminator('submit')], [18, 250, 191, 238, 240, 50, 213, 237]);
  assert.deepEqual([...getInstructionDiscriminator('release')], [253, 249, 15, 206, 28, 127, 193, 241]);
  assert.deepEqual([...getInstructionDiscriminator('refund')], [2, 96, 183, 251, 63, 208, 46, 46]);
});

test('getEscrowAccountDiscriminator lê o discriminator canônico do IDL', () => {
  assert.deepEqual([...getEscrowAccountDiscriminator()], [31, 213, 123, 187, 186, 22, 218, 155]);
});
