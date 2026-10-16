#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/15287afe05254e0b8ec1620702701e1d9d4594a0a2cd45ec4d83ab2c770ce4ea/contract';
import startContract from '../../snapshots/15287afe05254e0b8ec1620702701e1d9d4594a0a2cd45ec4d83ab2c770ce4ea/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/83239a17fb49c75a441f2750c1929656294a3876326039ba8c717f9482396da1/contract';
import endContract from '../../snapshots/83239a17fb49c75a441f2750c1929656294a3876326039ba8c717f9482396da1/contract.json' with { type: 'json' };
import { col, Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('walletAddress', 'character varying(64)', {
          codecRef: { codecId: 'sql/varchar@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'users',
        constraint: 'users_walletAddress_key',
        columns: ['walletAddress'],
      }),
      this.setNotNull({
        schema: 'public',
        table: 'projects',
        column: 'freelancerId',
      }),
      this.dropColumn({
        schema: 'public',
        table: 'projects',
        column: 'agreedTotalBrlCents',
      }),
      this.addColumn({
        schema: 'public',
        table: 'milestones',
        column: col('amountBaseUnits', 'int8', {
          notNull: true,
          codecRef: { codecId: 'pg/int8@1' },
        }),
      }),
      this.dropColumn({
        schema: 'public',
        table: 'milestones',
        column: 'amountBrlCents',
      }),
      this.addColumn({
        schema: 'public',
        table: 'milestones',
        column: col('escrowAddress', 'character varying(64)', {
          codecRef: { codecId: 'sql/varchar@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'milestones',
        column: col('fundTxSignature', 'character varying(128)', {
          codecRef: { codecId: 'sql/varchar@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'milestones',
        column: col('refundTxSignature', 'character varying(128)', {
          codecRef: { codecId: 'sql/varchar@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'milestones',
        column: col('releaseTxSignature', 'character varying(128)', {
          codecRef: { codecId: 'sql/varchar@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'milestones',
        column: col('fundedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.dropDefault({
        schema: 'public',
        table: 'milestones',
        column: 'status',
      }),
      this.setDefault({
        schema: 'public',
        table: 'milestones',
        column: 'status',
        defaultSql: "DEFAULT 'pending'",
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'milestones',
        constraint: 'milestones_status_check_4efd7878',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'milestones',
        constraint: 'milestones_status_check_64ed4d4c',
        expression:
          "\"status\" IN ('pending', 'funded', 'submitted', 'released', 'refunded')",
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'milestones',
        constraint: 'milestones_projectId_fkey',
        kind: 'foreignKey',
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'milestones',
        foreignKey: {
          name: 'milestones_projectId_fkey',
          columns: ['projectId'],
          references: {
            schema: 'public',
            table: 'projects',
            columns: ['id'],
          },
          onDelete: 'cascade',
        },
      }),
      this.addUnique({
        schema: 'public',
        table: 'milestones',
        constraint: 'milestones_escrowAddress_key',
        columns: ['escrowAddress'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'milestones',
        constraint: 'milestones_fundTxSignature_key',
        columns: ['fundTxSignature'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'milestones',
        constraint: 'milestones_releaseTxSignature_key',
        columns: ['releaseTxSignature'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'milestones',
        constraint: 'milestones_refundTxSignature_key',
        columns: ['refundTxSignature'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
