import { randomUUID } from 'node:crypto';
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { LedgerService } from '../ledger/ledger.service';
import { PrismaService } from '../prisma/prisma.service';
import type { Tx } from '../prisma/prisma.service';
import type { ConfirmWithdrawalDto } from './dto/confirm-withdrawal.dto';
import type { ListWithdrawalsQueryDto } from './dto/list-withdrawals-query.dto';
import type { QuoteWithdrawalDto } from './dto/quote-withdrawal.dto';
import {
  PAYOUT_PROVIDER,
  PayoutProviderError,
  type PayoutProvider,
  type PayoutQuote,
  type PayoutProviderStatus,
  type PreparedPayout,
} from './payout.provider';
import {
  transitionWithdrawal,
  WithdrawalTransitionError,
  type WithdrawalAction,
  type WithdrawalStatus,
} from './withdrawal-state-machine';

const MAX_BIGINT = 9_223_372_036_854_775_807n;

interface CursorValue {
  createdAt: string;
  id: string;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'sqlState' in error &&
    error.sqlState === '23505'
  );
}

@Injectable()
export class WithdrawalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    @Inject(PAYOUT_PROVIDER) private readonly provider: PayoutProvider,
  ) {}

  async quote(
    userId: string,
    dto: QuoteWithdrawalDto,
    requestedIdempotencyKey?: string,
  ) {
    const amountBaseUnits = this.parseAmount(dto.amountBaseUnits);
    const idempotencyKey = this.idempotencyKey(requestedIdempotencyKey);

    const existing = await this.prisma.orm.public.Withdrawal.where({
      userId,
      idempotencyKey,
    }).first();
    if (
      existing &&
      (existing.amountBaseUnits - existing.feeBaseUnits !== amountBaseUnits ||
        existing.pixKey !== dto.pixKey)
    ) {
      throw new ConflictException(
        'Idempotency-Key já foi usado com outro pedido de saque',
      );
    }
    if (existing && existing.status !== 'created') {
      return this.toResponse(existing);
    }

    const withdrawalId = existing?.id ?? randomUUID();
    const initial =
      existing ??
      (await this.createInitialWithdrawal(
        withdrawalId,
        userId,
        idempotencyKey,
        amountBaseUnits,
        dto.pixKey,
      ));
    if (
      initial.amountBaseUnits - initial.feeBaseUnits !== amountBaseUnits ||
      initial.pixKey !== dto.pixKey
    ) {
      throw new ConflictException(
        'Idempotency-Key já foi usado com outro pedido de saque',
      );
    }

    let quote: PayoutQuote;
    try {
      quote = await this.provider.quote({
        withdrawalId,
        userId,
        amountBaseUnits: initial.amountBaseUnits,
        asset: 'BRLP',
        fiatCurrency: 'BRL',
        pixKey: initial.pixKey,
        walletAddress: initial.walletAddress,
      });
      if (quote.amountBaseUnits < initial.amountBaseUnits) {
        throw new PayoutProviderError(
          'PAYOUT_QUOTE_AMOUNT_MISMATCH',
          'A cotação retornou menos ativo que o valor solicitado',
          false,
        );
      }
      if (
        quote.feeBaseUnits < 0n ||
        quote.fiatAmountMinor < 0n ||
        quote.amountBaseUnits > MAX_BIGINT ||
        quote.feeBaseUnits > MAX_BIGINT ||
        quote.fiatAmountMinor > MAX_BIGINT
      ) {
        throw new PayoutProviderError(
          'PAYOUT_QUOTE_AMOUNT_OUT_OF_RANGE',
          'A cotação retornou um valor acima do limite permitido',
          false,
        );
      }
      if (Date.parse(quote.expiresAt) <= Date.now()) {
        throw new PayoutProviderError(
          'PAYOUT_QUOTE_EXPIRED',
          'A cotação retornada já está expirada',
          true,
        );
      }
    } catch (error) {
      await this.markInitialFailure(withdrawalId, error);
      this.throwProviderError(error);
    }

    const result = await this.prisma.db.transaction(async (tx) => {
      const balance = await this.ledger.getAvailableBalance(
        tx,
        userId,
        'BRLP',
        true,
      );
      const current = await tx.orm.public.Withdrawal.where({
        id: withdrawalId,
      }).first();
      if (!current) throw new NotFoundException('Saque não encontrado');
      if (current.status !== 'created') return current;

      if (balance < quote.amountBaseUnits) {
        await tx.orm.public.Withdrawal.where({
          id: withdrawalId,
          status: 'created',
        }).update({
          status: 'failed',
          failureCode: 'INSUFFICIENT_BALANCE',
          failureReason: 'Saldo consumido por outra operação concorrente',
          failedAt: new Date().toISOString(),
        });
        return null;
      }

      const status = this.transition('created', 'quote_created');
      const updated = await tx.orm.public.Withdrawal.where({
        id: withdrawalId,
        status: 'created',
      }).update({
        status,
        amountBaseUnits: quote.amountBaseUnits,
        providerQuoteReference: quote.quoteReference,
        feeBaseUnits: quote.feeBaseUnits,
        fiatAmountMinor: quote.fiatAmountMinor,
        quoteExpiresAt: quote.expiresAt,
      });
      if (!updated) {
        throw new ConflictException('O saque foi alterado durante a cotação');
      }

      await this.ledger.withdrawalRequested(tx, {
        withdrawalId,
        userId,
        amountBaseUnits: quote.amountBaseUnits,
      });
      return updated;
    });

    if (!result) throw new ConflictException('Saldo insuficiente para o saque');
    return this.toResponse(result);
  }

  private async createInitialWithdrawal(
    withdrawalId: string,
    userId: string,
    idempotencyKey: string,
    amountBaseUnits: bigint,
    pixKey: string,
  ) {
    try {
      return await this.prisma.db.transaction(async (tx) => {
        const user = await tx.orm.public.User.where({ id: userId }).first();
        if (!user) throw new NotFoundException('Usuário não encontrado');
        if (!user.walletAddress) {
          throw new ConflictException('Vincule sua carteira antes de sacar');
        }

        const balance = await this.ledger.getAvailableBalance(
          tx,
          userId,
          'BRLP',
          true,
        );
        if (balance < amountBaseUnits) {
          throw new ConflictException('Saldo insuficiente para o saque');
        }

        return tx.orm.public.Withdrawal.create({
          id: withdrawalId,
          userId,
          idempotencyKey,
          amountBaseUnits,
          feeBaseUnits: 0n,
          fiatAmountMinor: amountBaseUnits,
          pixKey,
          walletAddress: user.walletAddress,
          provider: this.provider.name,
          status: 'created',
        });
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const concurrent = await this.prisma.orm.public.Withdrawal.where({
        userId,
        idempotencyKey,
      }).first();
      if (concurrent) return concurrent;
      throw error;
    }
  }

  async prepare(id: string, userId: string) {
    let withdrawal = await this.loadOwned(id, userId);
    if (this.isQuoteExpired(withdrawal)) {
      await this.finishLocally(withdrawal, 'expired');
      throw new ConflictException('A cotação expirou');
    }
    if (
      withdrawal.status !== 'quoted' &&
      withdrawal.status !== 'awaiting_signature'
    ) {
      throw new ConflictException('O saque não está pronto para preparação');
    }
    if (!withdrawal.providerQuoteReference) {
      throw new ConflictException('O saque não possui referência de cotação');
    }

    let prepared: PreparedPayout;
    try {
      prepared = await this.provider.prepare({
        withdrawalId: withdrawal.id,
        userId: withdrawal.userId,
        amountBaseUnits: withdrawal.amountBaseUnits,
        asset: 'BRLP',
        fiatCurrency: 'BRL',
        pixKey: withdrawal.pixKey,
        walletAddress: withdrawal.walletAddress,
        quoteReference: withdrawal.providerQuoteReference,
      });
    } catch (error) {
      this.throwProviderError(error);
    }

    if (
      withdrawal.providerReference &&
      withdrawal.providerReference !== prepared.providerReference
    ) {
      throw new BadGatewayException(
        'A PagFinance retornou outra referência para o saque',
      );
    }

    if (withdrawal.status === 'quoted') {
      const nextStatus = this.transition('quoted', 'payment_created');
      const updated = await this.prisma.orm.public.Withdrawal.where({
        id,
        userId,
        status: 'quoted',
      }).update({
        status: nextStatus,
        providerReference: prepared.providerReference,
      });
      if (!updated) {
        throw new ConflictException(
          'O saque foi alterado durante a preparação',
        );
      }
      withdrawal = updated;
    }

    return {
      withdrawal: this.toResponse(withdrawal),
      transactionBase64: prepared.transactionBase64,
      mockSignature: prepared.mockSignature,
      lastValidBlockHeight: prepared.lastValidBlockHeight,
    };
  }

  async confirm(id: string, userId: string, dto: ConfirmWithdrawalDto) {
    const withdrawal = await this.loadOwned(id, userId);
    if (
      (withdrawal.status === 'submitted' ||
        withdrawal.status === 'processing' ||
        withdrawal.status === 'paid') &&
      withdrawal.txSignature === dto.signature
    ) {
      return this.toResponse(withdrawal);
    }
    if (withdrawal.status !== 'awaiting_signature') {
      throw new ConflictException('O saque não aguarda assinatura');
    }
    if (!withdrawal.providerReference) {
      throw new ConflictException('O saque não possui referência externa');
    }

    let providerStatus: PayoutProviderStatus;
    try {
      providerStatus = await this.provider.confirm({
        withdrawalId: id,
        userId: withdrawal.userId,
        walletAddress: withdrawal.walletAddress,
        providerReference: withdrawal.providerReference,
        signature: dto.signature,
      });
    } catch (error) {
      this.throwProviderError(error);
    }

    return this.applyProviderStatus(withdrawal, providerStatus, dto.signature);
  }

  async sync(id: string, userId: string) {
    const withdrawal = await this.loadOwned(id, userId);
    if (this.isTerminal(withdrawal.status)) return this.toResponse(withdrawal);
    if (this.isQuoteExpired(withdrawal)) {
      return this.finishLocally(withdrawal, 'expired');
    }
    if (!withdrawal.providerReference) {
      throw new ConflictException('O saque ainda não foi enviado à PagFinance');
    }

    let providerStatus: PayoutProviderStatus;
    try {
      providerStatus = await this.provider.getStatus({
        providerReference: withdrawal.providerReference,
        userId: withdrawal.userId,
        walletAddress: withdrawal.walletAddress,
      });
    } catch (error) {
      this.throwProviderError(error);
    }
    return this.applyProviderStatus(withdrawal, providerStatus);
  }

  async listMine(userId: string, query: ListWithdrawalsQueryDto) {
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined;
    let builder = this.prisma.orm.public.Withdrawal.where({ userId }).orderBy([
      (withdrawal) => withdrawal.createdAt.desc(),
      (withdrawal) => withdrawal.id.desc(),
    ]);
    if (cursor) builder = builder.cursor(cursor);

    const rows = await builder.limit(query.limit + 1).all();
    const hasMore = rows.length > query.limit;
    const page = rows.slice(0, query.limit);
    const last = hasMore ? page.at(-1) : undefined;
    return {
      items: page.map((withdrawal) => this.toResponse(withdrawal)),
      nextCursor: last
        ? this.encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null,
    };
  }

  async findMine(id: string, userId: string) {
    return this.toResponse(await this.loadOwned(id, userId));
  }

  private async applyProviderStatus(
    withdrawal: Awaited<ReturnType<WithdrawalService['loadOwned']>>,
    providerStatus: PayoutProviderStatus,
    signature?: string,
  ) {
    if (this.isTerminal(withdrawal.status)) return this.toResponse(withdrawal);
    const nextStatus = this.statusAfterProvider(
      withdrawal.status,
      providerStatus.status,
    );
    const now = new Date().toISOString();

    return this.prisma.db.transaction(async (tx) => {
      const updated = await tx.orm.public.Withdrawal.where({
        id: withdrawal.id,
        userId: withdrawal.userId,
        status: withdrawal.status,
      }).update({
        status: nextStatus,
        providerReference: providerStatus.providerReference,
        ...(signature && { txSignature: signature }),
        ...(nextStatus === 'submitted' || nextStatus === 'processing'
          ? { submittedAt: withdrawal.submittedAt ?? now }
          : {}),
        ...(nextStatus === 'paid' ? { paidAt: now } : {}),
        ...(nextStatus === 'failed'
          ? {
              failedAt: now,
              failureCode: providerStatus.failureCode ?? 'PAYOUT_FAILED',
              failureReason:
                providerStatus.failureReason ?? 'Saque recusado pelo provider',
            }
          : {}),
        ...(nextStatus === 'expired' ? { expiredAt: now } : {}),
        ...(nextStatus === 'cancelled' ? { cancelledAt: now } : {}),
      });

      if (!updated) {
        const latest = await tx.orm.public.Withdrawal.where({
          id: withdrawal.id,
        }).first();
        if (!latest) throw new NotFoundException('Saque não encontrado');
        return this.toResponse(latest);
      }

      await this.postTerminalLedger(tx, updated, nextStatus);
      return this.toResponse(updated);
    });
  }

  private async finishLocally(
    withdrawal: Awaited<ReturnType<WithdrawalService['loadOwned']>>,
    status: Extract<WithdrawalStatus, 'expired' | 'cancelled' | 'failed'>,
  ) {
    const nextStatus = this.statusAfterProvider(withdrawal.status, status);
    const now = new Date().toISOString();
    return this.prisma.db.transaction(async (tx) => {
      const updated = await tx.orm.public.Withdrawal.where({
        id: withdrawal.id,
        status: withdrawal.status,
      }).update({
        status: nextStatus,
        ...(status === 'expired' ? { expiredAt: now } : {}),
        ...(status === 'failed' ? { failedAt: now } : {}),
        ...(status === 'cancelled' ? { cancelledAt: now } : {}),
      });
      if (!updated) throw new ConflictException('O saque foi alterado');
      await this.postTerminalLedger(tx, updated, nextStatus);
      return this.toResponse(updated);
    });
  }

  private async postTerminalLedger(
    tx: Tx,
    withdrawal: { id: string; userId: string; amountBaseUnits: bigint },
    status: WithdrawalStatus,
  ) {
    if (status === 'paid') {
      await this.ledger.withdrawalPaid(tx, {
        withdrawalId: withdrawal.id,
        amountBaseUnits: withdrawal.amountBaseUnits,
      });
    } else if (
      status === 'failed' ||
      status === 'expired' ||
      status === 'cancelled'
    ) {
      await this.ledger.withdrawalReversed(tx, {
        withdrawalId: withdrawal.id,
        userId: withdrawal.userId,
        amountBaseUnits: withdrawal.amountBaseUnits,
      });
    }
  }

  private statusAfterProvider(
    current: WithdrawalStatus,
    target: PayoutProviderStatus['status'],
  ): WithdrawalStatus {
    if (current === target) return current;
    const actions: WithdrawalAction[] = [];

    if (
      current === 'awaiting_signature' &&
      target !== 'expired' &&
      target !== 'cancelled' &&
      target !== 'failed'
    ) {
      actions.push('submit');
      current = 'submitted';
    }
    if (target === 'processing' && current === 'submitted') {
      actions.push('mark_processing');
    } else if (target === 'paid') {
      actions.push('pay');
    } else if (target === 'failed') {
      actions.push('fail');
    } else if (target === 'expired') {
      actions.push('expire');
    } else if (target === 'cancelled') {
      actions.push('cancel');
    } else if (target === 'submitted' && current !== 'submitted') {
      actions.push('submit');
    }

    let status = current;
    for (const action of actions) status = this.transition(status, action);
    return status;
  }

  private transition(
    status: WithdrawalStatus,
    action: WithdrawalAction,
  ): WithdrawalStatus {
    try {
      return transitionWithdrawal({ currentStatus: status, action });
    } catch (error) {
      if (error instanceof WithdrawalTransitionError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  private async loadOwned(id: string, userId: string) {
    const withdrawal = await this.prisma.orm.public.Withdrawal.where({
      id,
    }).first();
    if (!withdrawal) throw new NotFoundException('Saque não encontrado');
    if (withdrawal.userId !== userId) {
      throw new ForbiddenException('Este saque pertence a outro usuário');
    }
    return withdrawal;
  }

  private async markInitialFailure(id: string, error: unknown): Promise<void> {
    const providerError =
      error instanceof PayoutProviderError
        ? error
        : new PayoutProviderError(
            'PAYOUT_PROVIDER_ERROR',
            'Falha ao obter cotação do provider',
            true,
          );
    await this.prisma.orm.public.Withdrawal.where({
      id,
      status: 'created',
    }).update({
      status: 'failed',
      failureCode: providerError.code,
      failureReason: providerError.message,
      failedAt: new Date().toISOString(),
    });
  }

  private throwProviderError(error: unknown): never {
    if (error instanceof PayoutProviderError) {
      if (error.retryable) {
        throw new ServiceUnavailableException(error.message);
      }
      throw new BadGatewayException(error.message);
    }
    throw new BadGatewayException('O provider de saque retornou um erro');
  }

  private parseAmount(value: string): bigint {
    if (!/^[1-9]\d{0,18}$/.test(value)) {
      throw new BadRequestException(
        'amountBaseUnits deve ser um inteiro positivo enviado como string',
      );
    }
    const amount = BigInt(value);
    if (amount > MAX_BIGINT) {
      throw new BadRequestException(
        'amountBaseUnits excede o limite permitido',
      );
    }
    return amount;
  }

  private idempotencyKey(value?: string): string {
    if (value === undefined) return randomUUID();
    const normalized = value.trim();
    if (!/^[\x21-\x7E]{8,128}$/.test(normalized)) {
      throw new BadRequestException(
        'Idempotency-Key deve ter entre 8 e 128 caracteres ASCII',
      );
    }
    return normalized;
  }

  private isQuoteExpired(withdrawal: {
    status: string;
    quoteExpiresAt: string | null;
  }): boolean {
    return (
      withdrawal.status === 'quoted' &&
      withdrawal.quoteExpiresAt !== null &&
      Date.parse(withdrawal.quoteExpiresAt) <= Date.now()
    );
  }

  private isTerminal(status: string): boolean {
    return (
      status === 'paid' ||
      status === 'failed' ||
      status === 'expired' ||
      status === 'cancelled'
    );
  }

  private toResponse<
    T extends {
      amountBaseUnits: bigint;
      feeBaseUnits: bigint;
      fiatAmountMinor: bigint;
    },
  >(withdrawal: T) {
    return {
      ...withdrawal,
      amountBaseUnits: withdrawal.amountBaseUnits.toString(),
      feeBaseUnits: withdrawal.feeBaseUnits.toString(),
      fiatAmountMinor: withdrawal.fiatAmountMinor.toString(),
    };
  }

  private encodeCursor(cursor: CursorValue): string {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
  }

  private decodeCursor(value: string): CursorValue {
    try {
      const parsed = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      ) as Partial<CursorValue>;
      if (
        typeof parsed.createdAt !== 'string' ||
        Number.isNaN(Date.parse(parsed.createdAt)) ||
        typeof parsed.id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          parsed.id,
        )
      ) {
        throw new Error('cursor inválido');
      }
      return { createdAt: parsed.createdAt, id: parsed.id };
    } catch {
      throw new BadRequestException('Cursor inválido');
    }
  }
}
