import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { ListLedgerQueryDto } from './dto/list-ledger-query.dto';
import type {
  LedgerAccountRef,
  LedgerTx,
  PostLedgerTransactionInput,
} from './ledger.types';

const MAX_BIGINT = 9_223_372_036_854_775_807n;

interface CursorValue {
  createdAt: string;
  id: string;
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async post(tx: LedgerTx, input: PostLedgerTransactionInput) {
    this.assertBalanced(input);

    const existing = await tx.orm.public.LedgerTransaction.where({
      idempotencyKey: input.idempotencyKey,
    }).first();
    if (existing) return existing;

    const accountRefs = new Map(
      input.entries.map((entry) => [
        this.accountKey(entry.account),
        entry.account,
      ]),
    );
    const accounts = new Map<string, { id: string }>();

    for (const [key, accountRef] of [...accountRefs.entries()].sort(
      ([a], [b]) => a.localeCompare(b),
    )) {
      const account = await this.getOrCreateAccount(tx, accountRef);
      await this.lockAccount(tx, account.id);
      accounts.set(key, account);
    }

    const existingAfterLock = await tx.orm.public.LedgerTransaction.where({
      idempotencyKey: input.idempotencyKey,
    }).first();
    if (existingAfterLock) return existingAfterLock;

    const ledgerTransaction = await tx.orm.public.LedgerTransaction.create({
      eventType: input.eventType,
      idempotencyKey: input.idempotencyKey,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      description: input.description ?? null,
    });

    for (const entry of input.entries) {
      const account = accounts.get(this.accountKey(entry.account));
      if (!account) throw new Error('Conta contábil não resolvida');

      await tx.orm.public.LedgerEntry.create({
        transactionId: ledgerTransaction.id,
        accountId: account.id,
        direction: entry.direction,
        amountBaseUnits: entry.amountBaseUnits,
      });
    }

    return ledgerTransaction;
  }

  async getAvailableBalance(
    tx: LedgerTx,
    userId: string,
    asset = 'BRLP',
    lock = false,
  ): Promise<bigint> {
    const account = await this.getOrCreateAccount(tx, {
      type: 'freelancer_balance',
      asset,
      ownerUserId: userId,
    });
    if (lock) await this.lockAccount(tx, account.id);

    const entries = await tx.orm.public.LedgerEntry.where({
      accountId: account.id,
    }).all();

    return entries.reduce(
      (balance, entry) =>
        entry.direction === 'credit'
          ? balance + entry.amountBaseUnits
          : balance - entry.amountBaseUnits,
      0n,
    );
  }

  async listMine(userId: string, query: ListLedgerQueryDto) {
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined;
    const account = await this.prisma.orm.public.LedgerAccount.where({
      key: this.accountKey({
        type: 'freelancer_balance',
        asset: 'BRLP',
        ownerUserId: userId,
      }),
    }).first();

    if (!account) {
      return {
        balanceBaseUnits: '0',
        items: [],
        nextCursor: null,
      };
    }

    let entriesQuery = this.prisma.orm.public.LedgerEntry.where({
      accountId: account.id,
    })
      .include('transaction', (transaction) =>
        transaction.select(
          'id',
          'eventType',
          'referenceType',
          'referenceId',
          'description',
          'createdAt',
        ),
      )
      .orderBy([(entry) => entry.createdAt.desc(), (entry) => entry.id.desc()]);

    if (cursor) {
      entriesQuery = entriesQuery.cursor(cursor);
    }

    const rows = await entriesQuery.limit(query.limit + 1).all();
    const hasMore = rows.length > query.limit;
    const page = rows.slice(0, query.limit);
    const balance = await this.prisma.db.transaction((tx) =>
      this.getAvailableBalance(tx, userId),
    );
    const last = hasMore ? page.at(-1) : undefined;

    return {
      balanceBaseUnits: balance.toString(),
      items: page.map((entry) => ({
        id: entry.id,
        direction: entry.direction,
        amountBaseUnits: entry.amountBaseUnits.toString(),
        createdAt: entry.createdAt,
        transaction: entry.transaction,
      })),
      nextCursor: last
        ? this.encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null,
    };
  }

  milestoneFunded(
    tx: LedgerTx,
    input: {
      milestoneId: string;
      clientId: string;
      amountBaseUnits: bigint;
    },
  ) {
    return this.post(tx, {
      eventType: 'milestone_funded',
      idempotencyKey: `milestone:${input.milestoneId}:funded`,
      referenceType: 'milestone',
      referenceId: input.milestoneId,
      entries: [
        {
          account: {
            type: 'external',
            asset: 'BRLP',
            ownerUserId: input.clientId,
          },
          direction: 'debit',
          amountBaseUnits: input.amountBaseUnits,
        },
        {
          account: { type: 'escrow', asset: 'BRLP' },
          direction: 'credit',
          amountBaseUnits: input.amountBaseUnits,
        },
      ],
    });
  }

  milestoneReleased(
    tx: LedgerTx,
    input: {
      milestoneId: string;
      freelancerId: string;
      amountBaseUnits: bigint;
    },
  ) {
    return this.post(tx, {
      eventType: 'milestone_released',
      idempotencyKey: `milestone:${input.milestoneId}:released`,
      referenceType: 'milestone',
      referenceId: input.milestoneId,
      entries: [
        {
          account: { type: 'escrow', asset: 'BRLP' },
          direction: 'debit',
          amountBaseUnits: input.amountBaseUnits,
        },
        {
          account: {
            type: 'freelancer_balance',
            asset: 'BRLP',
            ownerUserId: input.freelancerId,
          },
          direction: 'credit',
          amountBaseUnits: input.amountBaseUnits,
        },
      ],
    });
  }

  milestoneRefunded(
    tx: LedgerTx,
    input: {
      milestoneId: string;
      clientId: string;
      amountBaseUnits: bigint;
    },
  ) {
    return this.post(tx, {
      eventType: 'milestone_refunded',
      idempotencyKey: `milestone:${input.milestoneId}:refunded`,
      referenceType: 'milestone',
      referenceId: input.milestoneId,
      entries: [
        {
          account: { type: 'escrow', asset: 'BRLP' },
          direction: 'debit',
          amountBaseUnits: input.amountBaseUnits,
        },
        {
          account: {
            type: 'external',
            asset: 'BRLP',
            ownerUserId: input.clientId,
          },
          direction: 'credit',
          amountBaseUnits: input.amountBaseUnits,
        },
      ],
    });
  }

  withdrawalRequested(
    tx: LedgerTx,
    input: { withdrawalId: string; userId: string; amountBaseUnits: bigint },
  ) {
    return this.post(tx, {
      eventType: 'withdrawal_requested',
      idempotencyKey: `withdrawal:${input.withdrawalId}:requested`,
      referenceType: 'withdrawal',
      referenceId: input.withdrawalId,
      entries: [
        {
          account: {
            type: 'freelancer_balance',
            asset: 'BRLP',
            ownerUserId: input.userId,
          },
          direction: 'debit',
          amountBaseUnits: input.amountBaseUnits,
        },
        {
          account: { type: 'payout_clearing', asset: 'BRLP' },
          direction: 'credit',
          amountBaseUnits: input.amountBaseUnits,
        },
      ],
    });
  }

  withdrawalPaid(
    tx: LedgerTx,
    input: { withdrawalId: string; amountBaseUnits: bigint },
  ) {
    return this.post(tx, {
      eventType: 'withdrawal_paid',
      idempotencyKey: `withdrawal:${input.withdrawalId}:paid`,
      referenceType: 'withdrawal',
      referenceId: input.withdrawalId,
      entries: [
        {
          account: { type: 'payout_clearing', asset: 'BRLP' },
          direction: 'debit',
          amountBaseUnits: input.amountBaseUnits,
        },
        {
          account: { type: 'external', asset: 'BRLP' },
          direction: 'credit',
          amountBaseUnits: input.amountBaseUnits,
        },
      ],
    });
  }

  withdrawalReversed(
    tx: LedgerTx,
    input: { withdrawalId: string; userId: string; amountBaseUnits: bigint },
  ) {
    return this.post(tx, {
      eventType: 'withdrawal_reversed',
      idempotencyKey: `withdrawal:${input.withdrawalId}:reversed`,
      referenceType: 'withdrawal',
      referenceId: input.withdrawalId,
      entries: [
        {
          account: { type: 'payout_clearing', asset: 'BRLP' },
          direction: 'debit',
          amountBaseUnits: input.amountBaseUnits,
        },
        {
          account: {
            type: 'freelancer_balance',
            asset: 'BRLP',
            ownerUserId: input.userId,
          },
          direction: 'credit',
          amountBaseUnits: input.amountBaseUnits,
        },
      ],
    });
  }

  private assertBalanced(input: PostLedgerTransactionInput): void {
    if (input.entries.length < 2) {
      throw new BadRequestException(
        'Uma transação exige ao menos dois lançamentos',
      );
    }

    let debits = 0n;
    let credits = 0n;
    for (const entry of input.entries) {
      if (entry.amountBaseUnits <= 0n || entry.amountBaseUnits > MAX_BIGINT) {
        throw new BadRequestException('Valor de lançamento inválido');
      }
      if (entry.direction === 'debit') debits += entry.amountBaseUnits;
      else credits += entry.amountBaseUnits;
    }

    if (debits !== credits) {
      throw new ConflictException(
        'Total de débitos difere do total de créditos',
      );
    }
  }

  private async getOrCreateAccount(tx: LedgerTx, ref: LedgerAccountRef) {
    const key = this.accountKey(ref);
    return tx.orm.public.LedgerAccount.upsert({
      create: {
        key,
        type: ref.type,
        asset: ref.asset,
        ownerUserId: ref.ownerUserId ?? null,
      },
      update: {
        type: ref.type,
        asset: ref.asset,
        ownerUserId: ref.ownerUserId ?? null,
      },
      conflictOn: { key },
    });
  }

  private async lockAccount(tx: LedgerTx, accountId: string): Promise<void> {
    const query = this.prisma.db.raw.sql`
      SELECT "id"
      FROM "public"."ledger_accounts"
      WHERE "id" = CAST(${accountId} AS uuid)
      FOR UPDATE
    `
      .returnsRow({ id: tx.sql.public.ledger_accounts.columns.id })
      .build();
    await tx.query(query);
  }

  private accountKey(ref: LedgerAccountRef): string {
    return [ref.type, ref.ownerUserId ?? 'system', ref.asset].join(':');
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
