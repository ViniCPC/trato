#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/237a82a99a7d6158561a18b9dbd3a439bc988c60bba6eb704ca1bd80eb3f26e1/contract';
import endContract from '../../snapshots/237a82a99a7d6158561a18b9dbd3a439bc988c60bba6eb704ca1bd80eb3f26e1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ed7f203b81ca3a3e5e7d52310c5fadb1d2548451651b67a1771e5c18b8063485/contract';
import startContract from '../../snapshots/ed7f203b81ca3a3e5e7d52310c5fadb1d2548451651b67a1771e5c18b8063485/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'escrow_confirmations',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('milestoneId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('signature', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'milestones',
        column: col('submitTxSignature', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'escrow_confirmations',
        constraint: 'escrow_confirmations_signature_key',
        columns: ['signature'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'escrow_confirmations',
        constraint: 'escrow_confirmations_milestoneId_action_key',
        columns: ['milestoneId', 'action'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'milestones',
        constraint: 'milestones_submitTxSignature_key',
        columns: ['submitTxSignature'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'escrow_confirmations',
        index: 'escrow_confirmations_milestoneId_idx_f1dac854',
        columns: ['milestoneId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'escrow_confirmations',
        foreignKey: {
          name: 'escrow_confirmations_milestoneId_fkey',
          columns: ['milestoneId'],
          references: { schema: 'public', table: 'milestones', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
