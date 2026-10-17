import assert from 'node:assert/strict';
import test from 'node:test';

import { MilestoneActionService } from '../dist/src/milestones/milestone-action.service.js';

test('sync persiste refund on-chain mesmo quando chamado pelo freelancer', async () => {
  const milestone = {
    id: 'milestone',
    projectId: 'project',
    amountBaseUnits: 50n,
    status: 'funded',
    escrowAddress: 'escrow',
    fundTxSignature: 'fund-signature',
    submitTxSignature: null,
    releaseTxSignature: null,
    refundTxSignature: null,
  };
  const project = {
    id: 'project',
    status: 'active',
    clientId: 'client',
    freelancerId: 'freelancer',
  };
  const users = {
    client: { walletAddress: 'client-wallet' },
    freelancer: { walletAddress: 'freelancer-wallet' },
  };
  let confirmedContext;
  let saved;
  const prisma = {
    orm: {
      public: {
        Milestone: { where: () => ({ first: async () => milestone }) },
        Project: { where: () => ({ first: async () => project }) },
        User: { where: ({ id }) => ({ first: async () => users[id] }) },
      },
    },
    db: {
      transaction: async (run) =>
        run({
          orm: {
            public: {
              EscrowConfirmation: {
                where: () => ({ first: async () => null }),
                create: async () => ({}),
              },
              Milestone: {
                where: () => ({
                  update: async (fields) => {
                    saved = { ...milestone, ...fields };
                    return saved;
                  },
                }),
              },
            },
          },
        }),
    },
  };
  const escrow = {
    findUnconfirmedAction: async () => ({
      action: 'refund',
      signature: 'refund-signature',
    }),
    confirm: async (action, signature, context) => {
      assert.equal(action, 'refund');
      assert.equal(signature, 'refund-signature');
      confirmedContext = context;
      return { status: 'refunded', escrowAddress: 'escrow' };
    },
  };
  const service = new MilestoneActionService(
    prisma,
    { get: () => 'solana' },
    escrow,
  );

  const result = await service.sync('milestone', 'freelancer');
  assert.equal(confirmedContext.actorWallet, 'client-wallet');
  assert.equal(saved.status, 'refunded');
  assert.equal(saved.refundTxSignature, 'refund-signature');
  assert.equal(result.status, 'refunded');
  assert.equal(result.amountBaseUnits, '50');
});
