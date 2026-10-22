import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type AccountMeta,
  type TransactionResponse,
  type VersionedTransactionResponse,
} from '@solana/web3.js';
import bs58 from 'bs58';

import type { Environment } from '../config/environment';
import type {
  ConfirmPayoutInput,
  GetPayoutStatusInput,
  PayoutProvider,
  PayoutProviderStatus,
  PayoutQuote,
  PayoutQuoteInput,
  PreparedPayout,
  PreparePayoutInput,
} from './payout.provider';
import { PayoutProviderError } from './payout.provider';

type JsonRecord = Record<string, unknown>;

const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);
const TOKEN_2022_PROGRAM_ID = new PublicKey(
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);
const MEMO_PROGRAM_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
);

@Injectable()
export class PagFinancePayoutProvider implements PayoutProvider {
  readonly name = 'pagfinance' as const;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly assetId: string;
  private readonly appHeaders: Record<string, string>;
  private readonly connection: Connection;
  private readonly mint: PublicKey;
  private mintDetails: { tokenProgram: PublicKey; decimals: number } | null =
    null;

  constructor(config: ConfigService<Environment, true>) {
    this.baseUrl = (
      config.get('PAGFINANCE_BASE_URL', { infer: true }) ?? ''
    ).replace(/\/$/, '');
    this.apiKey = config.get('PAGFINANCE_API_TOKEN', { infer: true }) ?? '';
    this.timeoutMs = config.get('PAGFINANCE_TIMEOUT_MS', { infer: true });
    this.assetId =
      config.get('PAGFINANCE_BRLP_ASSET_ID', { infer: true }) ?? '';
    this.appHeaders = {
      'x-app-name': config.get('PAGFINANCE_APP_NAME', { infer: true }) ?? '',
      'x-app-domain':
        config.get('PAGFINANCE_APP_DOMAIN', { infer: true }) ?? '',
      'x-app-version':
        config.get('PAGFINANCE_APP_VERSION', { infer: true }) ?? '',
    };
    this.connection = new Connection(
      config.get('SOLANA_RPC_URL', { infer: true }) ?? 'http://127.0.0.1:8899',
      'confirmed',
    );
    this.mint = new PublicKey(
      config.get('SOLANA_TOKEN_MINT', { infer: true }) ??
        '11111111111111111111111111111111',
    );
  }

  async quote(input: PayoutQuoteInput): Promise<PayoutQuote> {
    const { tokenProgram, decimals } = await this.getMintDetails();
    await this.assertWalletBalance(
      input.walletAddress,
      tokenProgram,
      input.amountBaseUnits,
    );
    const token = await this.issueUserToken(input.userId, input.walletAddress);
    const amount = this.formatUnits(input.amountBaseUnits, decimals);
    const data = await this.request('/cashout/quote', {
      method: 'POST',
      authorization: token,
      idempotencyKey: `withdrawal:${input.withdrawalId}:quote`,
      body: this.jsonWithRawNumbers(
        {
          sender: input.walletAddress,
          invoiceCode: input.pixKey,
          externalId: input.withdrawalId,
          fiatCurrency: input.fiatCurrency,
        },
        { assetId: this.assetId, amount },
      ),
    });

    const values = this.recordField(data, 'valuesAndFees', 'values_and_fees');
    const totalCrypto = this.optionalStringField(
      values,
      'totalCrypto',
      'total_crypto',
    );
    const paymentInFiat = this.optionalStringField(
      values,
      'paymentInFiat',
      'payment_in_fiat',
    );
    const quotedBaseUnits = totalCrypto
      ? this.parseDecimal(totalCrypto, decimals)
      : input.amountBaseUnits;
    const fiatAmountMinor = paymentInFiat
      ? this.parseDecimal(paymentInFiat, 2)
      : this.convertDecimals(input.amountBaseUnits, decimals, 2);

    return {
      quoteReference: this.stringField(data, 'quoteId', 'quote_id'),
      amountBaseUnits: quotedBaseUnits,
      feeBaseUnits:
        quotedBaseUnits > input.amountBaseUnits
          ? quotedBaseUnits - input.amountBaseUnits
          : 0n,
      fiatAmountMinor,
      expiresAt: this.dateField(data, 'expiresAt', 'expires_at'),
    };
  }

  async prepare(input: PreparePayoutInput): Promise<PreparedPayout> {
    const token = await this.issueUserToken(input.userId, input.walletAddress);
    const data = await this.request('/cashout/intent', {
      method: 'POST',
      authorization: token,
      idempotencyKey: `withdrawal:${input.withdrawalId}:prepare`,
      body: {
        quoteId: input.quoteReference,
        sender: input.walletAddress,
      },
    });
    const providerReference = this.stringField(data, 'intentId', 'intent_id');
    const receiver = this.stringField(data, 'receiver');
    const memo = this.stringField(data, 'memo');
    const intentAmount = this.stringField(data, 'amount');
    const expiresAt = this.dateField(data, 'expiresAt', 'expires_at');
    const prepared = await this.buildSolanaTransaction(
      input.walletAddress,
      receiver,
      memo,
      intentAmount,
    );

    if (Date.parse(expiresAt) <= Date.now()) {
      throw new PayoutProviderError(
        'PAGFINANCE_INTENT_EXPIRED',
        'A intenção de saque retornada já está expirada',
        true,
      );
    }

    return {
      providerReference,
      transactionBase64: prepared.transactionBase64,
      mockSignature: null,
      lastValidBlockHeight: prepared.lastValidBlockHeight,
    };
  }

  async confirm(input: ConfirmPayoutInput): Promise<PayoutProviderStatus> {
    const data = await this.getIntent(
      input.userId,
      input.walletAddress,
      input.providerReference,
    );
    await this.assertSolanaTransfer(input.signature, input.walletAddress, data);
    return this.statusFrom(data, input.providerReference);
  }

  async getStatus(input: GetPayoutStatusInput): Promise<PayoutProviderStatus> {
    const data = await this.getIntent(
      input.userId,
      input.walletAddress,
      input.providerReference,
    );
    return this.statusFrom(data, input.providerReference);
  }

  private async getIntent(
    userId: string,
    walletAddress: string,
    providerReference: string,
  ): Promise<JsonRecord> {
    const token = await this.issueUserToken(userId, walletAddress);
    const reference = encodeURIComponent(providerReference);
    const data = await this.request(`/cashout/intent/${reference}`, {
      method: 'GET',
      authorization: token,
    });
    return data;
  }

  private async issueUserToken(
    userId: string,
    walletAddress: string,
  ): Promise<string> {
    const data = await this.request('/auth/token', {
      method: 'POST',
      authorization: this.apiKey,
      body: {
        pubkey: walletAddress,
        uid: userId,
        expiresIn: '15m',
      },
    });
    return this.stringField(data, 'token');
  }

  private async buildSolanaTransaction(
    senderValue: string,
    receiverValue: string,
    memo: string,
    amountValue: string,
  ): Promise<{ transactionBase64: string; lastValidBlockHeight: string }> {
    try {
      const sender = new PublicKey(senderValue);
      const receiver = new PublicKey(receiverValue);
      const { tokenProgram, decimals } = await this.getMintDetails();
      const amount = this.parseDecimal(amountValue, decimals);
      const senderToken = await this.findAssociatedTokenAddress(
        sender,
        tokenProgram,
      );
      const receiverToken = await this.findAssociatedTokenAddress(
        receiver,
        tokenProgram,
      );
      const latest = await this.connection.getLatestBlockhash('confirmed');
      const transaction = new Transaction({
        feePayer: sender,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      });

      const receiverAccount = await this.connection.getAccountInfo(
        receiverToken,
        'confirmed',
      );
      if (!receiverAccount) {
        transaction.add(
          this.createAssociatedTokenInstruction(
            sender,
            receiverToken,
            receiver,
            tokenProgram,
          ),
        );
      }
      transaction.add(
        this.createTransferCheckedInstruction(
          senderToken,
          receiverToken,
          sender,
          tokenProgram,
          amount,
          decimals,
        ),
        new TransactionInstruction({
          keys: [],
          programId: MEMO_PROGRAM_ID,
          data: Buffer.from(memo, 'utf8'),
        }),
      );

      const serialized = await transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
      return {
        transactionBase64: Buffer.from(serialized).toString('base64'),
        lastValidBlockHeight: latest.lastValidBlockHeight.toString(),
      };
    } catch (error) {
      if (error instanceof PayoutProviderError) throw error;
      throw new PayoutProviderError(
        'SOLANA_PREPARE_FAILED',
        'Não foi possível montar a transação Solana do saque',
        true,
      );
    }
  }

  private createAssociatedTokenInstruction(
    payer: PublicKey,
    associatedToken: PublicKey,
    owner: PublicKey,
    tokenProgram: PublicKey,
  ): TransactionInstruction {
    const keys: AccountMeta[] = [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: this.mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({
      keys,
      programId: ASSOCIATED_TOKEN_PROGRAM_ID,
      data: Buffer.from([1]),
    });
  }

  private createTransferCheckedInstruction(
    source: PublicKey,
    destination: PublicKey,
    authority: PublicKey,
    tokenProgram: PublicKey,
    amount: bigint,
    decimals: number,
  ): TransactionInstruction {
    if (amount <= 0n || amount > 18_446_744_073_709_551_615n) {
      throw new PayoutProviderError(
        'PAGFINANCE_INVALID_AMOUNT',
        'Valor da intenção fora do limite do token Solana',
        false,
      );
    }
    const data = Buffer.alloc(10);
    data[0] = 12;
    data.writeBigUInt64LE(amount, 1);
    data[9] = decimals;
    return new TransactionInstruction({
      keys: [
        { pubkey: source, isSigner: false, isWritable: true },
        { pubkey: this.mint, isSigner: false, isWritable: false },
        { pubkey: destination, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: false },
      ],
      programId: tokenProgram,
      data,
    });
  }

  private async assertSolanaTransfer(
    signature: string,
    walletValue: string,
    intent: JsonRecord,
  ): Promise<void> {
    try {
      const validSignature = (() => {
        try {
          return bs58.decode(signature).length === 64;
        } catch {
          return false;
        }
      })();
      if (!validSignature) {
        throw new PayoutProviderError(
          'SOLANA_INVALID_SIGNATURE',
          'A assinatura Solana informada é inválida',
          false,
        );
      }
      const wallet = new PublicKey(walletValue);
      const receiver = new PublicKey(this.stringField(intent, 'receiver'));
      const memo = this.stringField(intent, 'memo');
      const { tokenProgram, decimals } = await this.getMintDetails();
      const expectedAmount = this.parseDecimal(
        this.stringField(intent, 'amount'),
        decimals,
      );
      const expectedSource = await this.findAssociatedTokenAddress(
        wallet,
        tokenProgram,
      );
      const expectedDestination = await this.findAssociatedTokenAddress(
        receiver,
        tokenProgram,
      );
      const response = await this.findConfirmedTransaction(signature);

      if (!response.meta || response.meta.err) {
        throw new PayoutProviderError(
          'SOLANA_TRANSACTION_FAILED',
          'A transação de saque falhou na Solana',
          false,
        );
      }

      const message = response.transaction.message;
      const accountKeys =
        'accountKeys' in message
          ? message.accountKeys
          : (() => {
              const keys =
                message.version === 0
                  ? message.getAccountKeys({
                      accountKeysFromLookups: response.meta?.loadedAddresses,
                    })
                  : message.getAccountKeys();
              return Array.from({ length: keys.length }, (_, index) =>
                keys.get(index)!,
              );
            })();
      const instructions =
        'instructions' in message
          ? message.instructions.map((instruction) => ({
              programIdIndex: instruction.programIdIndex,
              accountIndices: instruction.accounts,
              data: Buffer.from(bs58.decode(instruction.data)),
            }))
          : message.compiledInstructions.map((instruction) => ({
              programIdIndex: instruction.programIdIndex,
              accountIndices: instruction.accountKeyIndexes,
              data: Buffer.from(instruction.data),
            }));
      const requiredSigners = accountKeys
        .slice(0, message.header.numRequiredSignatures)
        .map((key) => key.toBase58());

      if (!requiredSigners.includes(wallet.toBase58())) {
        throw new PayoutProviderError(
          'SOLANA_WRONG_SIGNER',
          'A carteira do saque não assinou a transação',
          false,
        );
      }

      const transferMatches = instructions.some((instruction) => {
        const accounts = instruction.accountIndices.map(
          (index) => accountKeys[index],
        );
        return (
          accountKeys[instruction.programIdIndex]?.equals(tokenProgram) ===
            true &&
          instruction.data.length === 10 &&
          instruction.data[0] === 12 &&
          accounts[0]?.equals(expectedSource) === true &&
          accounts[1]?.equals(this.mint) === true &&
          accounts[2]?.equals(expectedDestination) === true &&
          accounts[3]?.equals(wallet) === true &&
          instruction.data.readBigUInt64LE(1) === expectedAmount &&
          instruction.data[9] === decimals
        );
      });
      const memoMatches = instructions.some(
        (instruction) =>
          accountKeys[instruction.programIdIndex]?.equals(MEMO_PROGRAM_ID) ===
            true && instruction.data.toString('utf8') === memo,
      );

      if (!transferMatches || !memoMatches) {
        throw new PayoutProviderError(
          'SOLANA_TRANSACTION_MISMATCH',
          'A transação não corresponde ao saque preparado',
          false,
        );
      }
    } catch (error) {
      if (error instanceof PayoutProviderError) throw error;
      throw new PayoutProviderError(
        'SOLANA_RPC_UNAVAILABLE',
        'Não foi possível confirmar a transação na Solana',
        true,
      );
    }
  }

  private async findConfirmedTransaction(
    signature: string,
  ): Promise<TransactionResponse | VersionedTransactionResponse> {
    for (const delay of [0, 250, 500, 1_000]) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        const response = await this.connection.getTransaction(signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        });
        if (response) return response;
      } catch {
        if (delay === 1_000) {
          throw new PayoutProviderError(
            'SOLANA_RPC_UNAVAILABLE',
            'Não foi possível confirmar a transação na Solana',
            true,
          );
        }
      }
    }
    throw new PayoutProviderError(
      'SOLANA_TRANSACTION_PENDING',
      'A transação ainda não foi encontrada na Solana',
      true,
    );
  }

  private async getMintDetails(): Promise<{
    tokenProgram: PublicKey;
    decimals: number;
  }> {
    if (this.mintDetails) return this.mintDetails;
    try {
      const account = await this.connection.getAccountInfo(
        this.mint,
        'confirmed',
      );
      if (!account || account.data.length < 45) {
        throw new Error('mint ausente');
      }
      if (
        !account.owner.equals(TOKEN_PROGRAM_ID) &&
        !account.owner.equals(TOKEN_2022_PROGRAM_ID)
      ) {
        throw new Error('token program inválido');
      }
      this.mintDetails = {
        tokenProgram: account.owner,
        decimals: account.data[44],
      };
      return this.mintDetails;
    } catch {
      throw new PayoutProviderError(
        'SOLANA_MINT_UNAVAILABLE',
        'Não foi possível validar o mint BRLP na Solana',
        true,
      );
    }
  }

  private async assertWalletBalance(
    walletValue: string,
    tokenProgram: PublicKey,
    requiredAmount: bigint,
  ): Promise<void> {
    try {
      const wallet = new PublicKey(walletValue);
      const tokenAccount = await this.findAssociatedTokenAddress(
        wallet,
        tokenProgram,
      );
      const account = await this.connection.getAccountInfo(
        tokenAccount,
        'confirmed',
      );
      if (!account) {
        throw this.insufficientWalletBalance();
      }

      const accountData: unknown = account.data;
      if (!(accountData instanceof Uint8Array)) {
        throw new PayoutProviderError(
          'SOLANA_INVALID_TOKEN_ACCOUNT',
          'A conta BRLP da carteira vinculada é inválida',
          false,
        );
      }
      const data = Buffer.from(accountData);
      const accountMint = data.subarray(0, 32);
      const accountWallet = data.subarray(32, 64);
      if (
        !account.owner.equals(tokenProgram) ||
        data.length < 72 ||
        !this.bytesEqual(accountMint, this.mint.toBytes()) ||
        !this.bytesEqual(accountWallet, wallet.toBytes())
      ) {
        throw new PayoutProviderError(
          'SOLANA_INVALID_TOKEN_ACCOUNT',
          'A conta BRLP da carteira vinculada é inválida',
          false,
        );
      }

      if (data.readBigUInt64LE(64) < requiredAmount) {
        throw this.insufficientWalletBalance();
      }
    } catch (error) {
      if (error instanceof PayoutProviderError) throw error;
      throw new PayoutProviderError(
        'SOLANA_RPC_UNAVAILABLE',
        'Não foi possível consultar o saldo BRLP na Solana',
        true,
      );
    }
  }

  private insufficientWalletBalance(): PayoutProviderError {
    return new PayoutProviderError(
      'PAYOUT_INSUFFICIENT_ONCHAIN_BALANCE',
      'Saldo BRLP insuficiente na carteira vinculada para este saque',
      false,
    );
  }

  private bytesEqual(actual: Uint8Array, expected: Uint8Array): boolean {
    return (
      actual.length === expected.length &&
      actual.every((value, index) => value === expected[index])
    );
  }

  private async findAssociatedTokenAddress(
    owner: PublicKey,
    tokenProgram: PublicKey,
  ): Promise<PublicKey> {
    const [address] = await PublicKey.findProgramAddress(
      [owner.toBytes(), tokenProgram.toBytes(), this.mint.toBytes()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    return address;
  }

  private async request(
    path: string,
    options: {
      method: 'GET' | 'POST';
      body?: JsonRecord | string;
      idempotencyKey?: string;
      authorization?: string;
    },
  ): Promise<JsonRecord> {
    if (!this.baseUrl || !this.apiKey) {
      throw new PayoutProviderError(
        'PAGFINANCE_NOT_CONFIGURED',
        'Integração PagFinance não configurada',
        false,
      );
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: options.method,
        headers: {
          Accept: 'application/json',
          Authorization: this.bearer(options.authorization ?? this.apiKey),
          ...this.appHeaders,
          ...(options.body && { 'Content-Type': 'application/json' }),
          ...(options.idempotencyKey && {
            'Idempotency-Key': options.idempotencyKey,
          }),
        },
        body:
          typeof options.body === 'string'
            ? options.body
            : options.body
              ? JSON.stringify(options.body)
              : undefined,
        signal: controller.signal,
      });
      const payload = await this.readJson(response);
      if (!response.ok || payload.success === false) {
        throw new PayoutProviderError(
          this.errorCode(payload, response.status),
          this.errorMessage(payload),
          response.status === 408 ||
            response.status === 409 ||
            response.status === 429 ||
            response.status >= 500,
        );
      }
      const data = payload.data;
      return this.isRecord(data) ? data : payload;
    } catch (error) {
      if (error instanceof PayoutProviderError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new PayoutProviderError(
          'PAGFINANCE_TIMEOUT',
          'A PagFinance não respondeu dentro do prazo',
          true,
        );
      }
      throw new PayoutProviderError(
        'PAGFINANCE_UNAVAILABLE',
        'Não foi possível comunicar com a PagFinance',
        true,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readJson(response: Response): Promise<JsonRecord> {
    const text = await response.text();
    if (!text) return {};
    try {
      // Monetary JSON numbers become strings before parsing, so no financial
      // value ever enters the application as a floating-point number.
      const safeText = text.replace(
        /("(?:amount|fee|netAmount|paymentInFiat|totalFiat|totalCrypto)"\s*:\s*)(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
        '$1"$2"',
      );
      const parsed: unknown = JSON.parse(safeText);
      return this.isRecord(parsed) ? parsed : {};
    } catch {
      if (response.ok) {
        throw new PayoutProviderError(
          'PAGFINANCE_INVALID_RESPONSE',
          'A PagFinance retornou uma resposta inválida',
          true,
        );
      }
      return {};
    }
  }

  private statusFrom(
    data: JsonRecord,
    fallbackReference: string,
  ): PayoutProviderStatus {
    const rawStatus = this.stringField(data, 'status').toUpperCase();
    const statusMap: Record<string, PayoutProviderStatus['status']> = {
      PENDING: 'submitted',
      SUBMITTED: 'submitted',
      PROCESSING: 'processing',
      CONFIRMED: 'processing',
      COMPLETED: 'paid',
      PAID: 'paid',
      SETTLED: 'paid',
      FAILED: 'failed',
      REJECTED: 'failed',
      EXPIRED: 'expired',
      CANCELLED: 'cancelled',
      CANCELED: 'cancelled',
    };
    const status = statusMap[rawStatus];
    if (!status) {
      throw new PayoutProviderError(
        'PAGFINANCE_UNKNOWN_STATUS',
        `Status desconhecido retornado pela PagFinance: ${rawStatus}`,
        false,
      );
    }
    return {
      providerReference:
        this.optionalStringField(data, 'intentId', 'intent_id', 'withdrawId') ??
        fallbackReference,
      status,
      failureCode:
        this.optionalStringField(data, 'failureCode', 'failure_code', 'code') ??
        undefined,
      failureReason:
        this.optionalStringField(
          data,
          'failureReason',
          'failure_reason',
          'error',
        ) ?? undefined,
    };
  }

  private jsonWithRawNumbers(
    fields: JsonRecord,
    rawNumbers: Record<string, string>,
  ): string {
    const placeholders = Object.fromEntries(
      Object.keys(rawNumbers).map((key) => [key, `__RAW_${key}__`]),
    );
    let body = JSON.stringify({ ...fields, ...placeholders });
    for (const [key, raw] of Object.entries(rawNumbers)) {
      if (!/^\d+(?:\.\d+)?$/.test(raw)) {
        throw new PayoutProviderError(
          'PAGFINANCE_INVALID_AMOUNT',
          `Valor inválido para ${key}`,
          false,
        );
      }
      body = body.replace(JSON.stringify(`__RAW_${key}__`), raw);
    }
    return body;
  }

  private formatUnits(value: bigint, decimals: number): string {
    if (value < 0n) throw new Error('negative amount');
    const scale = 10n ** BigInt(decimals);
    const whole = value / scale;
    const fraction = (value % scale).toString().padStart(decimals, '0');
    return decimals === 0
      ? whole.toString()
      : `${whole}.${fraction}`.replace(/\.?0+$/, '');
  }

  private parseDecimal(value: string, decimals: number): bigint {
    const match = /^(\d+)(?:\.(\d+))?$/.exec(value);
    if (!match || (match[2]?.length ?? 0) > decimals) {
      throw new PayoutProviderError(
        'PAGFINANCE_INVALID_RESPONSE',
        'A PagFinance retornou um valor monetário inválido',
        true,
      );
    }
    const fraction = (match[2] ?? '').padEnd(decimals, '0');
    return BigInt(match[1]) * 10n ** BigInt(decimals) + BigInt(fraction || '0');
  }

  private convertDecimals(
    value: bigint,
    fromDecimals: number,
    toDecimals: number,
  ): bigint {
    if (toDecimals >= fromDecimals) {
      return value * 10n ** BigInt(toDecimals - fromDecimals);
    }
    return value / 10n ** BigInt(fromDecimals - toDecimals);
  }

  private stringField(data: JsonRecord, ...fields: string[]): string {
    const value = this.optionalStringField(data, ...fields);
    if (value === null) {
      throw new PayoutProviderError(
        'PAGFINANCE_INVALID_RESPONSE',
        `Campo ausente na resposta da PagFinance: ${fields[0]}`,
        true,
      );
    }
    return value;
  }

  private optionalStringField(
    data: JsonRecord,
    ...fields: string[]
  ): string | null {
    for (const field of fields) {
      const value = data[field];
      if (typeof value === 'string' && value.length > 0) return value;
    }
    return null;
  }

  private recordField(data: JsonRecord, ...fields: string[]): JsonRecord {
    for (const field of fields) {
      if (this.isRecord(data[field])) return data[field];
    }
    return {};
  }

  private dateField(data: JsonRecord, ...fields: string[]): string {
    const value = this.stringField(data, ...fields);
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      throw new PayoutProviderError(
        'PAGFINANCE_INVALID_RESPONSE',
        `Data inválida na resposta da PagFinance: ${fields[0]}`,
        true,
      );
    }
    return new Date(timestamp).toISOString();
  }

  private errorCode(payload: JsonRecord, status: number): string {
    return (
      this.optionalStringField(payload, 'code', 'errorCode', 'error_code') ??
      `PAGFINANCE_HTTP_${status}`
    );
  }

  private errorMessage(payload: JsonRecord): string {
    return (
      this.optionalStringField(payload, 'error', 'message', 'error_message') ??
      'A PagFinance recusou a operação'
    );
  }

  private bearer(token: string): string {
    return /^Bearer\s/i.test(token) ? token : `Bearer ${token}`;
  }

  private isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
