#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/83239a17fb49c75a441f2750c1929656294a3876326039ba8c717f9482396da1/contract';
import startContract from '../../snapshots/83239a17fb49c75a441f2750c1929656294a3876326039ba8c717f9482396da1/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ed7f203b81ca3a3e5e7d52310c5fadb1d2548451651b67a1771e5c18b8063485/contract';
import endContract from '../../snapshots/ed7f203b81ca3a3e5e7d52310c5fadb1d2548451651b67a1771e5c18b8063485/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

const textType = {
  qualifiedTargetType: 'text',
  formatTypeExpected: 'text',
  rawTargetTypeForLabel: 'text',
} as const;

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.alterColumnType({
        schema: 'public',
        table: 'users',
        column: 'email',
        options: textType,
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'users',
        column: 'name',
        options: textType,
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'users',
        column: 'passwordHash',
        options: textType,
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'users',
        column: 'walletAddress',
        options: textType,
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'projects',
        column: 'title',
        options: textType,
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'milestones',
        column: 'title',
        options: textType,
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'milestones',
        column: 'escrowAddress',
        options: textType,
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'milestones',
        column: 'fundTxSignature',
        options: textType,
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'milestones',
        column: 'refundTxSignature',
        options: textType,
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'milestones',
        column: 'releaseTxSignature',
        options: textType,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
