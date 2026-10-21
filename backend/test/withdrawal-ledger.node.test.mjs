import assert from 'node:assert/strict';
import test from 'node:test';

import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

import { LedgerService } from '../dist/src/ledger/ledger.service.js';
import { MockPayoutProvider } from '../dist/src/withdrawals/mock-payout.provider.js';
import { PagFinancePayoutProvider } from '../dist/src/withdrawals/pagfinance-payout.provider.js';
import { WithdrawalService } from '../dist/src/withdrawals/withdrawal.service.js';

const input = {
  withdrawalId: '11111111-1111-4111-8111-111111111111',
  userId: '22222222-2222-4222-8222-222222222222',
  amountBaseUnits: 100_000_000n,
  asset: 'BRLP',
  fiatCurrency: 'BRL',
  pixKey: 'freelancer@example.com',
  walletAddress: '11111111111111111111111111111111',
};

test('PagFinance serializa dinheiro sem number e converte a resposta para bigint', async () => {
  let received;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    received = { url, options };
    if (url.endsWith('/auth/token')) {
      return new Response(
        JSON.stringify({
          success: true,
          error: null,
          data: { token: 'user-jwt' },
        }),
        { status: 200 },
      );
    }
    return new Response(
      JSON.stringify({
        success: true,
        error: null,
        data: {
          quoteId: 'quote-1',
          expiresAt: '2026-10-21T23:30:00.000Z',
          valuesAndFees: {
            paymentInFiat: 100,
            totalFiat: 102.5,
            totalCrypto: 102.5,
          },
        },
      }),
      { status: 200 },
    );
  };

  try {
    const provider = new PagFinancePayoutProvider({
      get(name) {
        return {
          PAGFINANCE_BASE_URL: 'https://sandbox.pagfinance.test',
          PAGFINANCE_API_TOKEN: 'secret-token',
          PAGFINANCE_BRLP_ASSET_ID: '7',
          PAGFINANCE_APP_NAME: 'trato',
          PAGFINANCE_APP_DOMAIN: 'trato.test',
          PAGFINANCE_APP_VERSION: '1.0.0',
          SOLANA_RPC_URL: 'http://127.0.0.1:8899',
          SOLANA_TOKEN_MINT: '11111111111111111111111111111111',
          PAGFINANCE_TIMEOUT_MS: 1000,
        }[name];
      },
    });
    const mintData = Buffer.alloc(82);
    mintData[44] = 6;
    Object.assign(provider.connection, {
      getAccountInfo: async () => ({
        owner: new (await import('@solana/web3.js')).PublicKey(
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        ),
        data: mintData,
      }),
    });
    const quote = await provider.quote(input);

    assert.equal(quote.amountBaseUnits, 102_500_000n);
    assert.equal(quote.feeBaseUnits, 2_500_000n);
    assert.equal(quote.fiatAmountMinor, 10_000n);
    assert.equal(received.options.headers.Authorization, 'Bearer user-jwt');
    assert.match(received.options.body, /"amount":100(?:,|})/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('PagFinance traduz erro HTTP para erro controlado sem vazar o token', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) =>
    url.endsWith('/auth/token')
      ? new Response(
          JSON.stringify({
            success: true,
            error: null,
            data: { token: 'user-jwt' },
          }),
          { status: 200 },
        )
      : new Response(
          JSON.stringify({
            success: false,
            code: 'PIX_KEY_INVALID',
            error: 'Chave inválida',
          }),
          { status: 422 },
        );
  try {
    const provider = new PagFinancePayoutProvider({
      get(name) {
        return {
          PAGFINANCE_BASE_URL: 'https://sandbox.pagfinance.test',
          PAGFINANCE_API_TOKEN: 'secret-token',
          PAGFINANCE_BRLP_ASSET_ID: '7',
          PAGFINANCE_APP_NAME: 'trato',
          PAGFINANCE_APP_DOMAIN: 'trato.test',
          PAGFINANCE_APP_VERSION: '1.0.0',
          SOLANA_RPC_URL: 'http://127.0.0.1:8899',
          SOLANA_TOKEN_MINT: '11111111111111111111111111111111',
          PAGFINANCE_TIMEOUT_MS: 1000,
        }[name];
      },
    });
    await assert.rejects(
      provider.getStatus({
        providerReference: 'payout-1',
        userId: input.userId,
        walletAddress: input.walletAddress,
      }),
      (error) => {
        assert.equal(error.code, 'PIX_KEY_INVALID');
        assert.equal(error.retryable, false);
        assert.equal(error.message.includes('secret-token'), false);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('PagFinance confirma somente a transferência Solana exata da intenção', async () => {
  const originalFetch = globalThis.fetch;
  const wallet = new PublicKey(input.walletAddress);
  const receiver = new PublicKey('Vote111111111111111111111111111111111111111');
  const mint = new PublicKey('11111111111111111111111111111111');
  const tokenProgram = new PublicKey(
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  );
  const associatedTokenProgram = new PublicKey(
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  );
  const memoProgram = new PublicKey(
    'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
  );
  const [source] = await PublicKey.findProgramAddress(
    [wallet.toBytes(), tokenProgram.toBytes(), mint.toBytes()],
    associatedTokenProgram,
  );
  const [destination] = await PublicKey.findProgramAddress(
    [receiver.toBytes(), tokenProgram.toBytes(), mint.toBytes()],
    associatedTokenProgram,
  );
  const transferData = Buffer.alloc(10);
  transferData[0] = 12;
  transferData.writeBigUInt64LE(100_000_000n, 1);
  transferData[9] = 6;
  const mintData = Buffer.alloc(82);
  mintData[44] = 6;

  globalThis.fetch = async (url) =>
    url.endsWith('/auth/token')
      ? new Response(
          JSON.stringify({
            success: true,
            data: { token: 'user-jwt' },
          }),
          { status: 200 },
        )
      : new Response(
          JSON.stringify({
            success: true,
            data: {
              intentId: 'payout-1',
              status: 'PENDING',
              receiver: receiver.toBase58(),
              amount: 100,
              memo: 'cashout:payout-1',
            },
          }),
          { status: 200 },
        );

  try {
    const provider = new PagFinancePayoutProvider({
      get(name) {
        return {
          PAGFINANCE_BASE_URL: 'https://sandbox.pagfinance.test',
          PAGFINANCE_API_TOKEN: 'secret-token',
          PAGFINANCE_BRLP_ASSET_ID: '7',
          PAGFINANCE_APP_NAME: 'trato',
          PAGFINANCE_APP_DOMAIN: 'trato.test',
          PAGFINANCE_APP_VERSION: '1.0.0',
          SOLANA_RPC_URL: 'http://127.0.0.1:8899',
          SOLANA_TOKEN_MINT: mint.toBase58(),
          PAGFINANCE_TIMEOUT_MS: 1000,
        }[name];
      },
    });
    Object.assign(provider.connection, {
      getAccountInfo: async () => ({ owner: tokenProgram, data: mintData }),
      getTransaction: async () => ({
        meta: { err: null },
        transaction: {
          message: {
            accountKeys: [
              wallet,
              source,
              mint,
              destination,
              tokenProgram,
              memoProgram,
            ],
            header: { numRequiredSignatures: 1 },
            instructions: [
              {
                programIdIndex: 4,
                accounts: [1, 2, 3, 0],
                data: bs58.encode(transferData),
              },
              {
                programIdIndex: 5,
                accounts: [],
                data: bs58.encode(Buffer.from('cashout:payout-1')),
              },
            ],
          },
        },
      }),
    });

    const status = await provider.confirm({
      withdrawalId: input.withdrawalId,
      userId: input.userId,
      walletAddress: input.walletAddress,
      providerReference: 'payout-1',
      signature: bs58.encode(Buffer.alloc(64, 1)),
    });
    assert.equal(status.status, 'submitted');

    transferData.writeBigUInt64LE(99_000_000n, 1);
    await assert.rejects(
      provider.confirm({
        withdrawalId: input.withdrawalId,
        userId: input.userId,
        walletAddress: input.walletAddress,
        providerReference: 'payout-1',
        signature: bs58.encode(Buffer.alloc(64, 2)),
      }),
      (error) => {
        assert.equal(error.code, 'SOLANA_TRANSACTION_MISMATCH');
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ledger rejeita transação desbalanceada antes de tocar no banco', async () => {
  const service = new LedgerService({});
  await assert.rejects(
    service.post(
      {},
      {
        eventType: 'test',
        idempotencyKey: 'test:1',
        referenceType: 'test',
        referenceId: input.withdrawalId,
        entries: [
          {
            account: { type: 'external', asset: 'BRLP' },
            direction: 'debit',
            amountBaseUnits: 100n,
          },
          {
            account: { type: 'escrow', asset: 'BRLP' },
            direction: 'credit',
            amountBaseUnits: 99n,
          },
        ],
      },
    ),
    ConflictException,
  );
});

test('serviço impede acesso ao saque de outro usuário', async () => {
  const prisma = {
    orm: {
      public: {
        Withdrawal: {
          where: () => ({
            first: async () => ({
              id: input.withdrawalId,
              userId: '22222222-2222-4222-8222-222222222222',
              amountBaseUnits: 100n,
              feeBaseUnits: 0n,
              fiatAmountMinor: 100n,
            }),
          }),
        },
      },
    },
  };
  const service = new WithdrawalService(prisma, {}, new MockPayoutProvider());

  await assert.rejects(
    service.findMine(
      input.withdrawalId,
      '33333333-3333-4333-8333-333333333333',
    ),
    ForbiddenException,
  );
});
