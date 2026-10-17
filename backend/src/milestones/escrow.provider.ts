import type { MilestoneStatus } from './milestone-state-machine';
import { HttpException, HttpStatus } from '@nestjs/common';

export const ESCROW_PROVIDER = Symbol('ESCROW_PROVIDER');

export type EscrowAction = 'fund' | 'submit' | 'release' | 'refund';

export interface EscrowContext {
  milestoneId: string;
  projectId: string;
  amountBaseUnits: bigint;
  escrowAddress: string | null;
  clientWallet: string;
  freelancerWallet: string;
  actorWallet: string;
}

export interface PreparedEscrowTransaction {
  driver: 'mock' | 'solana';
  transactionBase64: string | null;
  mockSignature: string | null;
  escrowAddress: string;
  lastValidBlockHeight: string | null;
}

export interface ConfirmedEscrowTransaction {
  signature: string;
  status: MilestoneStatus;
  escrowAddress: string;
}

export interface EscrowSyncAction {
  action: 'submit' | 'release' | 'refund';
  signature: string;
}

export interface EscrowProvider {
  prepare(
    action: EscrowAction,
    context: EscrowContext,
  ): Promise<PreparedEscrowTransaction>;
  confirm(
    action: EscrowAction,
    signature: string,
    context: EscrowContext,
  ): Promise<ConfirmedEscrowTransaction>;
  findUnconfirmedAction(
    context: EscrowContext,
    status: 'funded' | 'submitted',
  ): Promise<EscrowSyncAction | null>;
}

export class TransactionPendingError extends HttpException {
  constructor() {
    super(
      'A transação ainda não foi confirmada. Tente novamente em instantes.',
      HttpStatus.ACCEPTED,
    );
    this.name = 'TransactionPendingError';
  }
}
