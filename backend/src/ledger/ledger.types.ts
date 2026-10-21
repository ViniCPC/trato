import type { Tx } from '../prisma/prisma.service';

export type LedgerAccountType =
  | 'external'
  | 'escrow'
  | 'freelancer_balance'
  | 'payout_clearing'
  | 'platform_revenue';

export type LedgerDirection = 'debit' | 'credit';

export interface LedgerAccountRef {
  type: LedgerAccountType;
  asset: string;
  ownerUserId?: string;
}

export interface LedgerPosting {
  account: LedgerAccountRef;
  direction: LedgerDirection;
  amountBaseUnits: bigint;
}

export interface PostLedgerTransactionInput {
  eventType: string;
  idempotencyKey: string;
  referenceType: string;
  referenceId: string;
  description?: string;
  entries: readonly LedgerPosting[];
}

export type LedgerTx = Tx;
