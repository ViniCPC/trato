import assert from 'node:assert/strict';
import test from 'node:test';

import bs58 from 'bs58';
import nacl from 'tweetnacl';

import { AuthService } from '../dist/src/auth/auth.service.js';

test('troca de carteira é bloqueada quando há etapa financiada', async () => {
  const oldWallet = nacl.sign.keyPair();
  const newWallet = nacl.sign.keyPair();
  let updated = false;
  const tx = {
    sql: { public: { users: { columns: { id: {} } } } },
    query: async () => [],
    orm: {
      public: {
        User: {
          where: () => ({
            first: async () => ({
              walletAddress: bs58.encode(oldWallet.publicKey),
            }),
          }),
          select: () => ({
            where: () => ({
              update: async () => {
                updated = true;
              },
            }),
          }),
        },
        Project: {
          where: (filter) => ({
            select: () => ({
              all: async () => (filter.clientId ? [{ id: 'project' }] : []),
            }),
          }),
        },
        Milestone: {
          where: () => ({
            select: () => ({ all: async () => [{ status: 'funded' }] }),
          }),
        },
      },
    },
  };
  const db = {
    transaction: async (run) => run(tx),
    raw: {
      sql: () => ({ returnsRow: () => ({ build: () => ({}) }) }),
    },
  };
  const service = new AuthService({ db }, {});
  const challenge = service.createWalletChallenge('user', {
    walletAddress: bs58.encode(newWallet.publicKey),
  });
  const signature = bs58.encode(
    nacl.sign.detached(
      new TextEncoder().encode(challenge.message),
      newWallet.secretKey,
    ),
  );

  await assert.rejects(
    service.verifyWallet('user', {
      challengeId: challenge.challengeId,
      signature,
    }),
    /etapas financiadas ou submetidas/,
  );
  assert.equal(updated, false);
});
