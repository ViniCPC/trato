import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import type {
  ConfirmedEscrowTransaction,
  EscrowAction,
  EscrowContext,
  EscrowProvider,
  EscrowSyncAction,
  PreparedEscrowTransaction,
} from './escrow.provider';

const ACTION_STATUS = {
  fund: 'funded',
  submit: 'submitted',
  release: 'released',
  refund: 'refunded',
} as const;

@Injectable()
export class MockEscrowProvider implements EscrowProvider {
  findUnconfirmedAction(
    _context: EscrowContext,
    _status: 'funded' | 'submitted',
  ): Promise<EscrowSyncAction | null> {
    return Promise.resolve(null);
  }

  prepare(
    _action: EscrowAction,
    context: EscrowContext,
  ): Promise<PreparedEscrowTransaction> {
    return Promise.resolve({
      driver: 'mock',
      transactionBase64: null,
      mockSignature: `mock_${randomUUID()}`,
      escrowAddress:
        context.escrowAddress ?? `mock_escrow_${context.milestoneId}`,
      lastValidBlockHeight: null,
    });
  }

  confirm(
    action: EscrowAction,
    signature: string,
    context: EscrowContext,
  ): Promise<ConfirmedEscrowTransaction> {
    if (!signature.startsWith('mock_')) {
      return Promise.reject(new Error('Assinatura mock inválida'));
    }

    return Promise.resolve({
      signature,
      status: ACTION_STATUS[action],
      escrowAddress:
        context.escrowAddress ?? `mock_escrow_${context.milestoneId}`,
    });
  }
}
