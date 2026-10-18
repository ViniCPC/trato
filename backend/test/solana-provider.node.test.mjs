import assert from 'node:assert/strict';
import test from 'node:test';

import { PublicKey, SystemProgram } from '@solana/web3.js';
import {
  findEscrowPda,
  getConfigAccountDiscriminator,
  getEscrowAccountDiscriminator,
  getInstructionDiscriminator,
  uuidToBytes,
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
const token2022Program = new PublicKey(
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
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

function providerWithRpc(rpc, mintOwner = tokenProgram, cluster = 'devnet') {
  const config = {
    get(name) {
      return {
        SOLANA_RPC_URL: 'http://127.0.0.1:8899',
        SOLANA_PROGRAM_ID: programId.toBase58(),
        SOLANA_TOKEN_MINT: mint.toBase58(),
        SOLANA_CLUSTER: cluster,
      }[name];
    },
  };
  const provider = new SolanaEscrowProvider(config);
  Object.assign(provider.connection, {
    ...rpc,
    getAccountInfo: async (address, commitment) =>
      address.equals(mint)
        ? { owner: mintOwner }
        : (rpc.getAccountInfo?.(address, commitment) ?? null),
  });
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

test('mainnet consulta transações com finalized', async () => {
  let commitment;
  const response = responseFor('refund', [
    client,
    mint,
    escrow,
    key(5),
    key(6),
    tokenProgram,
  ]);
  const provider = providerWithRpc(
    {
      getTransaction: async (_signature, options) => {
        commitment = options.commitment;
        return response;
      },
      getAccountInfo: async () => null,
    },
    tokenProgram,
    'mainnet-beta',
  );
  await provider.confirm('refund', 'signature', context);
  assert.equal(commitment, 'finalized');
});

test('lê teto, prazo e pausa da config on-chain', async () => {
  const data = Buffer.alloc(122);
  Buffer.from(getConfigAccountDiscriminator()).copy(data, 0);
  Buffer.from(freelancer.toBytes()).copy(data, 40);
  Buffer.from(mint.toBytes()).copy(data, 72);
  data.writeBigUInt64LE(12_000_000n, 104);
  data.writeBigInt64LE(604_800n, 112);
  data[120] = 1;
  const provider = providerWithRpc({
    getAccountInfo: async () => ({ owner: programId, data }),
  });
  assert.deepEqual(await provider.getRules(), {
    freelancerWallet: freelancer.toBase58(),
    mint: mint.toBase58(),
    maxAmountBaseUnits: '12000000',
    claimDelaySeconds: 604800,
    paused: true,
  });
});

test('prepare usa o token program dono do mint', async () => {
  const provider = providerWithRpc(
    {
      getLatestBlockhash: async () => ({
        blockhash: key(9).toBase58(),
        lastValidBlockHeight: 100,
      }),
    },
    token2022Program,
  );
  const prepared = await provider.prepare('fund', {
    ...context,
    escrowAddress: null,
  });
  const transaction = Buffer.from(prepared.transactionBase64, 'base64');
  assert.ok(transaction.length > 0);
  const { Transaction } = await import('@solana/web3.js');
  const decoded = Transaction.from(transaction);
  assert.equal(
    decoded.instructions[0].keys[6].pubkey.toBase58(),
    token2022Program.toBase58(),
  );
});

test('prepare claim bloqueia tentativa antes do prazo on-chain', async () => {
  const data = Buffer.alloc(146);
  Buffer.from(getEscrowAccountDiscriminator()).copy(data, 0);
  Buffer.from(client.toBytes()).copy(data, 8);
  Buffer.from(freelancer.toBytes()).copy(data, 40);
  Buffer.from(mint.toBytes()).copy(data, 72);
  Buffer.from(uuidToBytes(milestoneId)).copy(data, 104);
  data.writeBigUInt64LE(50n, 120);
  data[128] = 1;
  data.writeBigInt64LE(3600n, 130);
  data.writeBigInt64LE(BigInt(Math.floor(Date.now() / 1000)), 138);
  const provider = providerWithRpc({
    getAccountInfo: async () => ({ owner: programId, data }),
  });
  await assert.rejects(
    provider.prepare('claim', {
      ...context,
      actorWallet: freelancer.toBase58(),
    }),
    /prazo para sacar sozinho/,
  );
});

test('confirm aceita mensagem v0 e envia maxSupportedTransactionVersion', async () => {
  const keys = [client, mint, escrow, key(5), key(6), tokenProgram, programId];
  let options;
  const provider = providerWithRpc({
    getTransaction: async (_signature, receivedOptions) => {
      options = receivedOptions;
      return {
        transaction: {
          message: {
            version: 0,
            header: { numRequiredSignatures: 1 },
            getAccountKeys: () => ({
              length: keys.length,
              get: (index) => keys[index],
            }),
            compiledInstructions: [
              {
                programIdIndex: keys.length - 1,
                accountKeyIndexes: [0, 1, 2, 3, 4, 5],
                data: Buffer.from(getInstructionDiscriminator('refund')),
              },
            ],
          },
        },
        meta: { err: null },
      };
    },
    getAccountInfo: async () => null,
  });
  const confirmed = await provider.confirm('refund', 'v0-signature', context);
  assert.equal(confirmed.status, 'refunded');
  assert.equal(options.maxSupportedTransactionVersion, 0);
});

test('claim confirma somente crédito integral ao freelancer', async () => {
  const [recipient] = await PublicKey.findProgramAddress(
    [freelancer.toBytes(), tokenProgram.toBytes(), mint.toBytes()],
    associatedProgram,
  );
  const claimContext = { ...context, actorWallet: freelancer.toBase58() };
  const accounts = [
    freelancer,
    client,
    mint,
    escrow,
    key(5),
    recipient,
    tokenProgram,
    associatedProgram,
    SystemProgram.programId,
    key(6),
  ];
  const provider = providerWithRpc({
    getTransaction: async () =>
      responseFor('claim', accounts, {
        preTokenBalances: [
          {
            accountIndex: 5,
            mint: mint.toBase58(),
            uiTokenAmount: { amount: '0' },
          },
        ],
        postTokenBalances: [
          {
            accountIndex: 5,
            mint: mint.toBase58(),
            uiTokenAmount: { amount: '50' },
          },
        ],
      }),
    getAccountInfo: async () => null,
  });
  assert.deepEqual(
    await provider.confirm('claim', 'claim-signature', claimContext),
    {
      signature: 'claim-signature',
      status: 'released',
      escrowAddress: escrow.toBase58(),
    },
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
