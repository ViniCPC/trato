#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/15287afe05254e0b8ec1620702701e1d9d4594a0a2cd45ec4d83ab2c770ce4ea/contract';
import endContract from '../../snapshots/15287afe05254e0b8ec1620702701e1d9d4594a0a2cd45ec4d83ab2c770ce4ea/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'audit_logs',
        columns: [
          col('action', 'character varying(80)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 80 } },
          }),
          col('actorId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('entityId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('entityType', 'character varying(50)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 50 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('metadata', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'auth_sessions',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('revokedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('tokenHash', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'deposits',
        columns: [
          col('amountBaseUnits', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('blockchainSlot', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
          col('confirmations', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('confirmedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('detectedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('escrowId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('receiverWallet', 'character varying(64)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 64 } },
          }),
          col('senderWallet', 'character varying(64)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 64 } },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('txSignature', 'character varying(128)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 128 } },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'deposits_status_check_ed455a84',
            "\"status\" IN ('pending', 'detected', 'confirmed', 'failed', 'expired')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'disputes',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('milestoneId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('openedById', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('reason', 'character varying(500)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
          col('resolution', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('resolutionNote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('resolvedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('resolvedById', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('open'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'disputes_resolution_check_941ded77',
            "\"resolution\" IN ('release_to_freelancer', 'refund_to_client')",
          ),
          checkExpression(
            'disputes_status_check_19ab4f36',
            "\"status\" IN ('open', 'under_review', 'resolved', 'cancelled')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'escrows',
        columns: [
          col('amountBaseUnits', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('asset', 'text', {
            notNull: true,
            default: lit('usdc'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('clientWallet', 'character varying(64)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 64 } },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('escrowAddress', 'character varying(64)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 64 } },
          }),
          col('freelancerWallet', 'character varying(64)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 64 } },
          }),
          col('fundedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('milestoneId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('network', 'text', {
            notNull: true,
            default: lit('solana'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('quoteId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('quoteRateBrlPerUsdc', 'numeric(18,8)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 8 } },
          }),
          col('refundedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('releasedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('created'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tokenDecimals', 'int2', {
            notNull: true,
            default: lit(6),
            codecRef: { codecId: 'pg/int2@1' },
          }),
          col('tokenMint', 'character varying(64)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 64 } },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('escrows_asset_check_151aaf2a', '"asset" IN (\'usdc\')'),
          checkExpression('escrows_network_check_ab834eea', '"network" IN (\'solana\')'),
          checkExpression(
            'escrows_status_check_7058a81b',
            "\"status\" IN ('created', 'funding_pending', 'funded', 'release_pending', 'released', 'refund_pending', 'refunded', 'failed', 'expired')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'ledger_entries',
        columns: [
          col('account', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('amountBaseUnits', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('asset', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('direction', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('metadata', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('transactionId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'ledger_entries_account_check_139c9b2e',
            "\"account\" IN ('client_funds', 'escrow_holding', 'freelancer_payable', 'pix_clearing', 'crypto_clearing', 'platform_revenue', 'system_suspense')",
          ),
          checkExpression('ledger_entries_asset_check_9ae68c30', "\"asset\" IN ('brl', 'usdc')"),
          checkExpression(
            'ledger_entries_direction_check_6cfe4aa1',
            "\"direction\" IN ('debit', 'credit')",
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
          col('escrowId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('idempotencyKey', 'character varying(128)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 128 } },
          }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'ledger_transactions_type_check_7a2bdeec',
            "\"type\" IN ('escrow_funded', 'escrow_released', 'escrow_refunded', 'pix_payout', 'platform_fee', 'adjustment')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'milestones',
        columns: [
          col('amountBrlCents', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('approvedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('dueAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('projectId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('releasedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('sequence', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('startedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('draft'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('submittedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('title', 'character varying(160)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 160 } },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'milestones_status_check_4efd7878',
            "\"status\" IN ('draft', 'awaiting_funds', 'funded', 'in_progress', 'submitted', 'approved', 'release_pending', 'released', 'disputed', 'refund_pending', 'refunded', 'cancelled')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'payouts',
        columns: [
          col('amountBrlCents', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('escrowId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('externalId', 'character varying(191)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 191 } },
          }),
          col('failureReason', 'character varying(500)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('idempotencyKey', 'character varying(128)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 128 } },
          }),
          col('paidAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('pixKey', 'character varying(140)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 140 } },
          }),
          col('provider', 'text', {
            notNull: true,
            default: lit('mock_pix'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('requestedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('payouts_provider_check_7cf83e86', '"provider" IN (\'mock_pix\')'),
          checkExpression(
            'payouts_status_check_92bc5f55',
            "\"status\" IN ('pending', 'processing', 'paid', 'failed', 'cancelled')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'projects',
        columns: [
          col('agreedTotalBrlCents', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('clientId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('freelancerId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('draft'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'character varying(160)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 160 } },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'projects_status_check_c5ca4f72',
            "\"status\" IN ('draft', 'active', 'completed', 'cancelled')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'quotes',
        columns: [
          col('acceptedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('amountBaseUnits', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('amountBrlCents', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('asset', 'text', {
            notNull: true,
            default: lit('usdc'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('milestoneId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('rateBrlPerUsdc', 'numeric(18,8)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 18, scale: 8 } },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('active'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('quotes_asset_check_151aaf2a', '"asset" IN (\'usdc\')'),
          checkExpression(
            'quotes_status_check_9905e461',
            "\"status\" IN ('active', 'accepted', 'expired', 'cancelled')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'refunds',
        columns: [
          col('amountBaseUnits', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('confirmedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('escrowId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('failureReason', 'character varying(500)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('requestedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('requestedById', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('requested'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('txSignature', 'character varying(128)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 128 } },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'refunds_status_check_104742b8',
            "\"status\" IN ('requested', 'processing', 'confirmed', 'failed', 'cancelled')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'releases',
        columns: [
          col('amountBaseUnits', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('confirmedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('escrowId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('failureReason', 'character varying(500)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('requestedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('requestedById', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('requested'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('txSignature', 'character varying(128)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 128 } },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'releases_status_check_104742b8',
            "\"status\" IN ('requested', 'processing', 'confirmed', 'failed', 'cancelled')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'users',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'character varying(120)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 120 } },
          }),
          col('passwordHash', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('role', 'text', {
            notNull: true,
            default: lit('user'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('users_role_check_5b6d1a59', "\"role\" IN ('user', 'admin')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'webhook_events',
        columns: [
          col('attempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('eventType', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('externalId', 'character varying(191)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 191 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('lastError', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('payload', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('processedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('provider', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('receivedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('signature', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('received'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'webhook_events_provider_check_fbd2b4da',
            "\"provider\" IN ('mock_pix', 'solana')",
          ),
          checkExpression(
            'webhook_events_status_check_3aef280c',
            "\"status\" IN ('received', 'processing', 'processed', 'failed', 'ignored')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'auth_sessions',
        constraint: 'auth_sessions_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'deposits',
        constraint: 'deposits_txSignature_key',
        columns: ['txSignature'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'escrows',
        constraint: 'escrows_milestoneId_key',
        columns: ['milestoneId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'escrows',
        constraint: 'escrows_quoteId_key',
        columns: ['quoteId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'escrows',
        constraint: 'escrows_escrowAddress_key',
        columns: ['escrowAddress'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ledger_entries',
        constraint: 'ledger_entries_transactionId_account_direction_asset_key',
        columns: ['transactionId', 'account', 'direction', 'asset'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ledger_transactions',
        constraint: 'ledger_transactions_idempotencyKey_key',
        columns: ['idempotencyKey'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'milestones',
        constraint: 'milestones_projectId_sequence_key',
        columns: ['projectId', 'sequence'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'payouts',
        constraint: 'payouts_escrowId_key',
        columns: ['escrowId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'payouts',
        constraint: 'payouts_idempotencyKey_key',
        columns: ['idempotencyKey'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'payouts',
        constraint: 'payouts_provider_externalId_key',
        columns: ['provider', 'externalId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'refunds',
        constraint: 'refunds_escrowId_key',
        columns: ['escrowId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'refunds',
        constraint: 'refunds_txSignature_key',
        columns: ['txSignature'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'releases',
        constraint: 'releases_escrowId_key',
        columns: ['escrowId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'releases',
        constraint: 'releases_txSignature_key',
        columns: ['txSignature'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'users',
        constraint: 'users_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'webhook_events',
        constraint: 'webhook_events_provider_externalId_key',
        columns: ['provider', 'externalId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'audit_logs',
        index: 'audit_logs_actorId_idx_a58f6b4b',
        columns: ['actorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'audit_logs',
        index: 'audit_logs_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'audit_logs',
        index: 'audit_logs_entityType_entityId_idx_ea0fa809',
        columns: ['entityType', 'entityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auth_sessions',
        index: 'auth_sessions_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auth_sessions',
        index: 'auth_sessions_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'deposits',
        index: 'deposits_escrowId_idx_aa21689a',
        columns: ['escrowId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'deposits',
        index: 'deposits_escrowId_status_idx_f4f64752',
        columns: ['escrowId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'deposits',
        index: 'deposits_txSignature_idx_2adc1636',
        columns: ['txSignature'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'disputes',
        index: 'disputes_milestoneId_idx_f1dac854',
        columns: ['milestoneId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'disputes',
        index: 'disputes_openedById_idx_40bfe2c9',
        columns: ['openedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'disputes',
        index: 'disputes_resolvedById_idx_fc75edc7',
        columns: ['resolvedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'disputes',
        index: 'disputes_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'escrows',
        index: 'escrows_escrowAddress_idx_d2413934',
        columns: ['escrowAddress'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'escrows',
        index: 'escrows_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ledger_entries',
        index: 'ledger_entries_account_asset_idx_21aacb9c',
        columns: ['account', 'asset'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ledger_entries',
        index: 'ledger_entries_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
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
        index: 'ledger_transactions_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ledger_transactions',
        index: 'ledger_transactions_escrowId_idx_aa21689a',
        columns: ['escrowId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ledger_transactions',
        index: 'ledger_transactions_type_idx_b6b604ea',
        columns: ['type'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'milestones',
        index: 'milestones_projectId_idx_a96e4d92',
        columns: ['projectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'milestones',
        index: 'milestones_projectId_status_idx_57a5993e',
        columns: ['projectId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payouts',
        index: 'payouts_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'projects',
        index: 'projects_clientId_idx_153a9a49',
        columns: ['clientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'projects',
        index: 'projects_clientId_status_idx_a85608f5',
        columns: ['clientId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'projects',
        index: 'projects_freelancerId_idx_c8137280',
        columns: ['freelancerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'projects',
        index: 'projects_freelancerId_status_idx_b3f6f8a6',
        columns: ['freelancerId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'quotes',
        index: 'quotes_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'quotes',
        index: 'quotes_milestoneId_idx_f1dac854',
        columns: ['milestoneId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'quotes',
        index: 'quotes_milestoneId_status_idx_5130b97d',
        columns: ['milestoneId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'refunds',
        index: 'refunds_requestedById_idx_f9a56c66',
        columns: ['requestedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'refunds',
        index: 'refunds_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'releases',
        index: 'releases_requestedById_idx_f9a56c66',
        columns: ['requestedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'releases',
        index: 'releases_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'webhook_events',
        index: 'webhook_events_provider_eventType_idx_33cd8c2f',
        columns: ['provider', 'eventType'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'webhook_events',
        index: 'webhook_events_receivedAt_idx_9e532856',
        columns: ['receivedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'webhook_events',
        index: 'webhook_events_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'audit_logs',
        foreignKey: {
          name: 'audit_logs_actorId_fkey',
          columns: ['actorId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'auth_sessions',
        foreignKey: {
          name: 'auth_sessions_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'deposits',
        foreignKey: {
          name: 'deposits_escrowId_fkey',
          columns: ['escrowId'],
          references: { schema: 'public', table: 'escrows', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'disputes',
        foreignKey: {
          name: 'disputes_milestoneId_fkey',
          columns: ['milestoneId'],
          references: { schema: 'public', table: 'milestones', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'disputes',
        foreignKey: {
          name: 'disputes_openedById_fkey',
          columns: ['openedById'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'disputes',
        foreignKey: {
          name: 'disputes_resolvedById_fkey',
          columns: ['resolvedById'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'escrows',
        foreignKey: {
          name: 'escrows_milestoneId_fkey',
          columns: ['milestoneId'],
          references: { schema: 'public', table: 'milestones', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'escrows',
        foreignKey: {
          name: 'escrows_quoteId_fkey',
          columns: ['quoteId'],
          references: { schema: 'public', table: 'quotes', columns: ['id'] },
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
        table: 'ledger_transactions',
        foreignKey: {
          name: 'ledger_transactions_escrowId_fkey',
          columns: ['escrowId'],
          references: { schema: 'public', table: 'escrows', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'milestones',
        foreignKey: {
          name: 'milestones_projectId_fkey',
          columns: ['projectId'],
          references: { schema: 'public', table: 'projects', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'payouts',
        foreignKey: {
          name: 'payouts_escrowId_fkey',
          columns: ['escrowId'],
          references: { schema: 'public', table: 'escrows', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'projects',
        foreignKey: {
          name: 'projects_clientId_fkey',
          columns: ['clientId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'projects',
        foreignKey: {
          name: 'projects_freelancerId_fkey',
          columns: ['freelancerId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'quotes',
        foreignKey: {
          name: 'quotes_milestoneId_fkey',
          columns: ['milestoneId'],
          references: { schema: 'public', table: 'milestones', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'refunds',
        foreignKey: {
          name: 'refunds_escrowId_fkey',
          columns: ['escrowId'],
          references: { schema: 'public', table: 'escrows', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'refunds',
        foreignKey: {
          name: 'refunds_requestedById_fkey',
          columns: ['requestedById'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'releases',
        foreignKey: {
          name: 'releases_escrowId_fkey',
          columns: ['escrowId'],
          references: { schema: 'public', table: 'escrows', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'releases',
        foreignKey: {
          name: 'releases_requestedById_fkey',
          columns: ['requestedById'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
