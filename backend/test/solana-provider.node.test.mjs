import assert from 'node:assert/strict';
import test from 'node:test';

import { PublicKey, SystemProgram } from '@solana/web3.js';
import {
  findEscrowPda,
  getInstructionDiscriminator,
} from '@trato/trato-client';
import bs58 from 'bs58';

import { SolanaEscrowProvider } from '../dist/src/milestones/solana-escrow.provider.js';

const key = (byte) =>
  new PublicKey(Uint8Array.from({ length: 32 }, () => byte));
const client = key(1);
const freelancer = key(2);
const mint = key(3);
const programId = key(4);
const tokenProgram = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);
const associatedProgram = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);
const milestoneId = 'f245c2c8-d5e0-45c4-a84b-f4c83be8f7db';
const [derivedEscrow] = await findEscrowPda(
  client.toBase58(),
  milestoneId,
  programId.toBase58(),
);
const escrow = new PublicKey(derivedEscrow.toBase58());
const context = {
  milestoneId,
  projectId: 'project',
  amountBaseUnits: 50n,
  escrowAddress: escrow.toBase58(),
  clientWallet: client.toBase58(),
  freelancerWallet: freelancer.toBase58(),
  actorWallet: client.toBase58(),
};

function providerWithRpc(rpc) {
  const config = {
    get(name) {
      return {
        SOLANA_RPC_URL: 'http://127.0.0.1:8899',
        SOLANA_PROGRAM_ID: programId.toBase58(),
        SOLANA_TOKEN_MINT: mint.toBase58(),
      }[name];
    },
  };
  const provider = new SolanaEscrowProvider(config);
  Object.assign(provider.connection, rpc);
  return provider;
}

function responseFor(action, accounts, tokenBalances = {}) {
  const keys = [...accounts, programId];
  return {
    transaction: {
      message: {
        header: { numRequiredSignatures: 1 },
        accountKeys: keys,
        instructions: [
          {
            programIdIndex: keys.length - 1,
            accounts: accounts.map((_, index) => index),
            data: bs58.encode(Buffer.from(getInstructionDiscriminator(action))),
          },
        ],
      },
    },
    meta: { err: null, ...tokenBalances },
  };
}

test('prepare submit bloqueia escrow encerrado fora do site', async () => {
  const provider = providerWithRpc({ getAccountInfo: async () => null });
  await assert.rejects(
    provider.prepare('submit', {
      ...context,
      actorWallet: freelancer.toBase58(),
    }),
    /Escrow não encontrado on-chain/,
  );
});

test('sync encontra refund direto on-chain da mesma etapa', async () => {
  const response = responseFor('refund', [
    client,
    mint,
    escrow,
    key(5),
    key(6),
    tokenProgram,
  ]);
  const provider = providerWithRpc({
    getAccountInfo: async () => null,
    getSignaturesForAddress: async () => [
      { signature: 'refund-signature', err: null },
    ],
    getTransaction: async () => response,
  });
  assert.deepEqual(await provider.findUnconfirmedAction(context, 'funded'), {
    action: 'refund',
    signature: 'refund-signature',
  });
});

test('release exige crédito exato na conta do freelancer', async () => {
  const [recipient] = await PublicKey.findProgramAddress(
    [freelancer.toBytes(), tokenProgram.toBytes(), mint.toBytes()],
    associatedProgram,
  );
  const accounts = [
    client,
    freelancer,
    mint,
    escrow,
    key(5),
    recipient,
    tokenProgram,
    associatedProgram,
    SystemProgram.programId,
  ];
  let response = responseFor('release', accounts, {
    preTokenBalances: [
      {
        accountIndex: 5,
        mint: mint.toBase58(),
        uiTokenAmount: { amount: '10' },
      },
    ],
    postTokenBalances: [
      {
        accountIndex: 5,
        mint: mint.toBase58(),
        uiTokenAmount: { amount: '49' },
      },
    ],
  });
  const provider = providerWithRpc({
    getTransaction: async () => response,
    getAccountInfo: async () => null,
  });
  await assert.rejects(
    provider.confirm('release', 'release-signature', context),
    /valor exato/,
  );

  response = responseFor('release', accounts, {
    preTokenBalances: [
      {
        accountIndex: 5,
        mint: mint.toBase58(),
        uiTokenAmount: { amount: '10' },
      },
    ],
    postTokenBalances: [
      {
        accountIndex: 5,
        mint: mint.toBase58(),
        uiTokenAmount: { amount: '60' },
      },
    ],
  });
  assert.deepEqual(
    await provider.confirm('release', 'release-signature', context),
    {
      signature: 'release-signature',
      status: 'released',
      escrowAddress: escrow.toBase58(),
    },
  );
});
