#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/237a82a99a7d6158561a18b9dbd3a439bc988c60bba6eb704ca1bd80eb3f26e1/contract';
import startContract from '../../snapshots/237a82a99a7d6158561a18b9dbd3a439bc988c60bba6eb704ca1bd80eb3f26e1/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/3cc67372ad7e59e3b1603cec1fb36cd84570ec239ac3e042091ff5c3d9f3c55b/contract';
import endContract from '../../snapshots/3cc67372ad7e59e3b1603cec1fb36cd84570ec239ac3e042091ff5c3d9f3c55b/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  rawSql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'ledger_accounts',
        columns: [
          col('asset', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ownerUserId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'ledger_accounts_type_check_eee8d6ee',
            "\"type\" IN ('external', 'escrow', 'freelancer_balance', 'payout_clearing', 'platform_revenue')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'ledger_entries',
        columns: [
          col('accountId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('amountBaseUnits', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('direction', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('transactionId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'ledger_entries_direction_check_6cfe4aa1',
            "\"direction\" IN ('debit', 'credit')",
          ),
          checkExpression(
            'ledger_entries_amount_positive_check',
            '"amountBaseUnits" > 0',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'ledger_transactions',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('eventType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('idempotencyKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('referenceId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('referenceType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'withdrawals',
        columns: [
          col('amountBaseUnits', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('asset', 'text', {
            notNull: true,
            default: lit('BRLP'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('cancelledAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiredAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('failedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('failureCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('failureReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('feeBaseUnits', 'int8', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('fiatAmountMinor', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('fiatCurrency', 'text', {
            notNull: true,
            default: lit('BRL'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('idempotencyKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('paidAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('pixKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('provider', 'text', {
            notNull: true,
            default: lit('pagfinance'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('providerQuoteReference', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('providerReference', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('quoteExpiresAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('created'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('submittedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('txSignature', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('walletAddress', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'withdrawals_status_check_e92bb63d',
            "\"status\" IN ('created', 'quoted', 'awaiting_signature', 'submitted', 'processing', 'paid', 'failed', 'expired', 'cancelled')",
          ),
          checkExpression(
            'withdrawals_amounts_check',
            '"amountBaseUnits" > 0 AND "feeBaseUnits" >= 0 AND "fiatAmountMinor" >= 0',
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ledger_accounts',
        constraint: 'ledger_accounts_key_key',
        columns: ['key'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ledger_transactions',
        constraint: 'ledger_transactions_idempotencyKey_key',
        columns: ['idempotencyKey'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'withdrawals',
        constraint: 'withdrawals_providerQuoteReference_key',
        columns: ['providerQuoteReference'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'withdrawals',
        constraint: 'withdrawals_providerReference_key',
        columns: ['providerReference'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'withdrawals',
        constraint: 'withdrawals_txSignature_key',
        columns: ['txSignature'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'withdrawals',
        constraint: 'withdrawals_userId_idempotencyKey_key',
        columns: ['userId', 'idempotencyKey'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ledger_accounts',
        index: 'ledger_accounts_ownerUserId_idx_f93ae154',
        columns: ['ownerUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ledger_accounts',
        index: 'ledger_accounts_ownerUserId_type_asset_idx_eb0a5589',
        columns: ['ownerUserId', 'type', 'asset'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ledger_entries',
        index: 'ledger_entries_accountId_createdAt_idx_843b5d93',
        columns: ['accountId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ledger_entries',
        index: 'ledger_entries_accountId_idx_cbfb3085',
        columns: ['accountId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ledger_entries',
        index: 'ledger_entries_transactionId_idx_d3180832',
        columns: ['transactionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ledger_transactions',
        index: 'ledger_transactions_createdAt_id_idx_3855cff1',
        columns: ['createdAt', 'id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ledger_transactions',
        index: 'ledger_transactions_referenceType_referenceId_idx_d11658f3',
        columns: ['referenceType', 'referenceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'withdrawals',
        index: 'withdrawals_status_createdAt_idx_58610442',
        columns: ['status', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'withdrawals',
        index: 'withdrawals_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'withdrawals',
        index: 'withdrawals_userId_status_idx_e4a128ba',
        columns: ['userId', 'status'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ledger_accounts',
        foreignKey: {
          name: 'ledger_accounts_ownerUserId_fkey',
          columns: ['ownerUserId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ledger_entries',
        foreignKey: {
          name: 'ledger_entries_transactionId_fkey',
          columns: ['transactionId'],
          references: { schema: 'public', table: 'ledger_transactions', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ledger_entries',
        foreignKey: {
          name: 'ledger_entries_accountId_fkey',
          columns: ['accountId'],
          references: { schema: 'public', table: 'ledger_accounts', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'withdrawals',
        foreignKey: {
          name: 'withdrawals_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      rawSql({
        id: 'custom.backfill_ledger_from_milestones',
        label: 'Backfill ledger from existing milestones',
        summary:
          'Creates balanced funded, released, and refunded events for historical milestones',
        operationClass: 'additive',
        target: {
          id: 'postgres',
          details: {
            schema: 'public',
            objectType: 'table',
            name: 'ledger_transactions',
          },
        },
        precheck: [
          {
            description: 'ledger tables are available for idempotent backfill',
            sql: 'SELECT TRUE AS "result"',
            params: [],
          },
        ],
        execute: [
          {
            description: 'create historical ledger accounts',
            sql: `INSERT INTO "public"."ledger_accounts"
                ("id", "key", "type", "asset", "ownerUserId")
              SELECT gen_random_uuid(), 'external:' || p."clientId"::text || ':BRLP',
                'external', 'BRLP', p."clientId"
              FROM "public"."milestones" m
              JOIN "public"."projects" p ON p."id" = m."projectId"
              WHERE m."status" IN ('funded', 'submitted', 'released', 'refunded')
              ON CONFLICT ("key") DO NOTHING`,
            params: [],
          },
          {
            description: 'create historical system escrow account',
            sql: `INSERT INTO "public"."ledger_accounts"
                ("id", "key", "type", "asset", "ownerUserId")
              SELECT gen_random_uuid(), 'escrow:system:BRLP', 'escrow', 'BRLP', NULL
              WHERE EXISTS (
                SELECT 1 FROM "public"."milestones"
                WHERE "status" IN ('funded', 'submitted', 'released', 'refunded')
              )
              ON CONFLICT ("key") DO NOTHING`,
            params: [],
          },
          {
            description: 'create historical freelancer balance accounts',
            sql: `INSERT INTO "public"."ledger_accounts"
                ("id", "key", "type", "asset", "ownerUserId")
              SELECT gen_random_uuid(),
                'freelancer_balance:' || p."freelancerId"::text || ':BRLP',
                'freelancer_balance', 'BRLP', p."freelancerId"
              FROM "public"."milestones" m
              JOIN "public"."projects" p ON p."id" = m."projectId"
              WHERE m."status" = 'released'
              ON CONFLICT ("key") DO NOTHING`,
            params: [],
          },
          {
            description: 'create historical ledger transactions',
            sql: `INSERT INTO "public"."ledger_transactions"
                ("id", "eventType", "idempotencyKey", "referenceType", "referenceId")
              SELECT gen_random_uuid(), 'milestone_funded',
                'milestone:' || m."id"::text || ':funded', 'milestone', m."id"
              FROM "public"."milestones" m
              WHERE m."status" IN ('funded', 'submitted', 'released', 'refunded')
              ON CONFLICT ("idempotencyKey") DO NOTHING`,
            params: [],
          },
          {
            description: 'create historical release and refund transactions',
            sql: `INSERT INTO "public"."ledger_transactions"
                ("id", "eventType", "idempotencyKey", "referenceType", "referenceId")
              SELECT gen_random_uuid(),
                CASE WHEN m."status" = 'released'
                  THEN 'milestone_released' ELSE 'milestone_refunded' END,
                'milestone:' || m."id"::text ||
                  CASE WHEN m."status" = 'released' THEN ':released' ELSE ':refunded' END,
                'milestone', m."id"
              FROM "public"."milestones" m
              WHERE m."status" IN ('released', 'refunded')
              ON CONFLICT ("idempotencyKey") DO NOTHING`,
            params: [],
          },
          {
            description: 'create balanced historical ledger entries',
            sql: `WITH expected AS (
                SELECT t."id" AS "transactionId", external_account."id" AS "accountId",
                  'debit' AS "direction", m."amountBaseUnits"
                FROM "public"."milestones" m
                JOIN "public"."projects" p ON p."id" = m."projectId"
                JOIN "public"."ledger_transactions" t
                  ON t."idempotencyKey" = 'milestone:' || m."id"::text || ':funded'
                JOIN "public"."ledger_accounts" external_account
                  ON external_account."key" = 'external:' || p."clientId"::text || ':BRLP'
                WHERE m."status" IN ('funded', 'submitted', 'released', 'refunded')
                UNION ALL
                SELECT t."id", escrow_account."id", 'credit', m."amountBaseUnits"
                FROM "public"."milestones" m
                JOIN "public"."ledger_transactions" t
                  ON t."idempotencyKey" = 'milestone:' || m."id"::text || ':funded'
                JOIN "public"."ledger_accounts" escrow_account
                  ON escrow_account."key" = 'escrow:system:BRLP'
                WHERE m."status" IN ('funded', 'submitted', 'released', 'refunded')
                UNION ALL
                SELECT t."id", escrow_account."id", 'debit', m."amountBaseUnits"
                FROM "public"."milestones" m
                JOIN "public"."ledger_transactions" t
                  ON t."idempotencyKey" = 'milestone:' || m."id"::text || ':released'
                JOIN "public"."ledger_accounts" escrow_account
                  ON escrow_account."key" = 'escrow:system:BRLP'
                WHERE m."status" = 'released'
                UNION ALL
                SELECT t."id", freelancer_account."id", 'credit', m."amountBaseUnits"
                FROM "public"."milestones" m
                JOIN "public"."projects" p ON p."id" = m."projectId"
                JOIN "public"."ledger_transactions" t
                  ON t."idempotencyKey" = 'milestone:' || m."id"::text || ':released'
                JOIN "public"."ledger_accounts" freelancer_account
                  ON freelancer_account."key" =
                    'freelancer_balance:' || p."freelancerId"::text || ':BRLP'
                WHERE m."status" = 'released'
                UNION ALL
                SELECT t."id", escrow_account."id", 'debit', m."amountBaseUnits"
                FROM "public"."milestones" m
                JOIN "public"."ledger_transactions" t
                  ON t."idempotencyKey" = 'milestone:' || m."id"::text || ':refunded'
                JOIN "public"."ledger_accounts" escrow_account
                  ON escrow_account."key" = 'escrow:system:BRLP'
                WHERE m."status" = 'refunded'
                UNION ALL
                SELECT t."id", external_account."id", 'credit', m."amountBaseUnits"
                FROM "public"."milestones" m
                JOIN "public"."projects" p ON p."id" = m."projectId"
                JOIN "public"."ledger_transactions" t
                  ON t."idempotencyKey" = 'milestone:' || m."id"::text || ':refunded'
                JOIN "public"."ledger_accounts" external_account
                  ON external_account."key" = 'external:' || p."clientId"::text || ':BRLP'
                WHERE m."status" = 'refunded'
              )
              INSERT INTO "public"."ledger_entries"
                ("id", "transactionId", "accountId", "direction", "amountBaseUnits")
              SELECT gen_random_uuid(), expected."transactionId", expected."accountId",
                expected."direction", expected."amountBaseUnits"
              FROM expected
              WHERE NOT EXISTS (
                SELECT 1 FROM "public"."ledger_entries" existing
                WHERE existing."transactionId" = expected."transactionId"
                  AND existing."accountId" = expected."accountId"
                  AND existing."direction" = expected."direction"
              )`,
            params: [],
          },
        ],
        postcheck: [
          {
            description: 'verify every historical financial state was backfilled',
            sql: `SELECT NOT EXISTS (
                SELECT 1 FROM "public"."milestones" m
                WHERE m."status" IN ('funded', 'submitted', 'released', 'refunded')
                  AND NOT EXISTS (
                    SELECT 1 FROM "public"."ledger_transactions" t
                    WHERE t."idempotencyKey" = 'milestone:' || m."id"::text || ':funded'
                  )
                UNION ALL
                SELECT 1 FROM "public"."milestones" m
                WHERE m."status" = 'released'
                  AND NOT EXISTS (
                    SELECT 1 FROM "public"."ledger_transactions" t
                    WHERE t."idempotencyKey" = 'milestone:' || m."id"::text || ':released'
                  )
                UNION ALL
                SELECT 1 FROM "public"."milestones" m
                WHERE m."status" = 'refunded'
                  AND NOT EXISTS (
                    SELECT 1 FROM "public"."ledger_transactions" t
                    WHERE t."idempotencyKey" = 'milestone:' || m."id"::text || ':refunded'
                  )
                UNION ALL
                SELECT 1
                FROM "public"."ledger_transactions" t
                LEFT JOIN "public"."ledger_entries" e
                  ON e."transactionId" = t."id"
                GROUP BY t."id"
                HAVING COUNT(e."id") < 2 OR
                  COALESCE(SUM(CASE WHEN e."direction" = 'debit'
                    THEN e."amountBaseUnits" ELSE -e."amountBaseUnits" END), 0) <> 0
              ) AS "result"`,
            params: [],
          },
        ],
      }),
      rawSql({
        id: 'custom.ledger_immutability_and_balance',
        label: 'Enforce ledger immutability and double-entry balance',
        summary:
          'Adds deferred balance validation and blocks updates/deletes on ledger records',
        operationClass: 'additive',
        target: {
          id: 'postgres',
          details: {
            schema: 'public',
            objectType: 'table',
            name: 'ledger_transactions',
          },
        },
        precheck: [
          {
            description: 'ensure ledger integrity triggers are missing',
            sql: `SELECT NOT EXISTS (
              SELECT 1 FROM pg_trigger
              WHERE tgname IN (
                'ledger_transactions_immutable',
                'ledger_entries_immutable',
                'ledger_transactions_balanced',
                'ledger_entries_balanced'
              ) AND NOT tgisinternal
            ) AS "result"`,
            params: [],
          },
        ],
        execute: [
          {
            description: 'create immutable ledger trigger function',
            sql: `CREATE FUNCTION "public"."prevent_ledger_mutation"()
              RETURNS trigger
              LANGUAGE plpgsql
              AS $$
              BEGIN
                RAISE EXCEPTION 'ledger records are immutable' USING ERRCODE = '55000';
              END;
              $$`,
            params: [],
          },
          {
            description: 'create deferred ledger balance trigger function',
            sql: `CREATE FUNCTION "public"."validate_ledger_transaction_balance"()
              RETURNS trigger
              LANGUAGE plpgsql
              AS $$
              DECLARE
                transaction_id uuid;
                entry_count bigint;
                balance bigint;
              BEGIN
                IF TG_TABLE_NAME = 'ledger_entries' THEN
                  transaction_id := NEW."transactionId";
                ELSE
                  transaction_id := NEW."id";
                END IF;

                SELECT COUNT(*),
                  COALESCE(SUM(CASE WHEN "direction" = 'debit'
                    THEN "amountBaseUnits" ELSE -"amountBaseUnits" END), 0)
                INTO entry_count, balance
                FROM "public"."ledger_entries"
                WHERE "transactionId" = transaction_id;

                IF entry_count < 2 OR balance <> 0 THEN
                  RAISE EXCEPTION 'ledger transaction % is unbalanced', transaction_id
                    USING ERRCODE = '23514';
                END IF;
                RETURN NEW;
              END;
              $$`,
            params: [],
          },
          {
            description: 'block ledger transaction updates and deletes',
            sql: `CREATE TRIGGER "ledger_transactions_immutable"
              BEFORE UPDATE OR DELETE ON "public"."ledger_transactions"
              FOR EACH ROW EXECUTE FUNCTION "public"."prevent_ledger_mutation"()`,
            params: [],
          },
          {
            description: 'block ledger entry updates and deletes',
            sql: `CREATE TRIGGER "ledger_entries_immutable"
              BEFORE UPDATE OR DELETE ON "public"."ledger_entries"
              FOR EACH ROW EXECUTE FUNCTION "public"."prevent_ledger_mutation"()`,
            params: [],
          },
          {
            description: 'validate double-entry balance at transaction commit',
            sql: `CREATE CONSTRAINT TRIGGER "ledger_transactions_balanced"
              AFTER INSERT ON "public"."ledger_transactions"
              DEFERRABLE INITIALLY DEFERRED
              FOR EACH ROW EXECUTE FUNCTION "public"."validate_ledger_transaction_balance"()`,
            params: [],
          },
          {
            description: 'reject later entries that would unbalance a transaction',
            sql: `CREATE CONSTRAINT TRIGGER "ledger_entries_balanced"
              AFTER INSERT ON "public"."ledger_entries"
              DEFERRABLE INITIALLY DEFERRED
              FOR EACH ROW EXECUTE FUNCTION "public"."validate_ledger_transaction_balance"()`,
            params: [],
          },
        ],
        postcheck: [
          {
            description: 'verify all ledger integrity triggers exist',
            sql: `SELECT COUNT(*) = 4 AS "result"
              FROM pg_trigger
              WHERE tgname IN (
                'ledger_transactions_immutable',
                'ledger_entries_immutable',
                'ledger_transactions_balanced',
                'ledger_entries_balanced'
              ) AND NOT tgisinternal`,
            params: [],
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
