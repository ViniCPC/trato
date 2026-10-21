import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import type {
  ConfirmPayoutInput,
  PayoutProvider,
  PayoutProviderStatus,
  PayoutQuote,
  PayoutQuoteInput,
  PreparedPayout,
  PreparePayoutInput,
} from './payout.provider';

@Injectable()
export class MockPayoutProvider implements PayoutProvider {
  readonly name = 'mock' as const;
  private readonly payouts = new Map<
    string,
    { status: PayoutProviderStatus['status']; syncCount: number }
  >();

  quote(input: PayoutQuoteInput): Promise<PayoutQuote> {
    return Promise.resolve({
      quoteReference: `mock_quote_${input.withdrawalId}`,
      amountBaseUnits: input.amountBaseUnits,
      feeBaseUnits: 0n,
      fiatAmountMinor: input.amountBaseUnits,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
  }

  prepare(input: PreparePayoutInput): Promise<PreparedPayout> {
    const providerReference = `mock_payout_${input.withdrawalId}`;
    this.payouts.set(providerReference, {
      status: 'submitted',
      syncCount: 0,
    });
    return Promise.resolve({
      providerReference,
      transactionBase64: null,
      mockSignature: `mock_${randomUUID()}`,
      lastValidBlockHeight: null,
    });
  }

  confirm(input: ConfirmPayoutInput): Promise<PayoutProviderStatus> {
    if (!input.signature.startsWith('mock_')) {
      return Promise.reject(new Error('Assinatura mock inválida'));
    }
    const payout = this.payouts.get(input.providerReference);
    if (!payout) {
      return Promise.reject(new Error('Saque mock não encontrado'));
    }
    payout.status = 'submitted';
    return Promise.resolve({
      providerReference: input.providerReference,
      status: payout.status,
    });
  }

  getStatus(input: {
    providerReference: string;
  }): Promise<PayoutProviderStatus> {
    const payout = this.payouts.get(input.providerReference);
    if (!payout) {
      return Promise.reject(new Error('Saque mock não encontrado'));
    }
    payout.syncCount += 1;
    payout.status = payout.syncCount === 1 ? 'processing' : 'paid';
    return Promise.resolve({
      providerReference: input.providerReference,
      status: payout.status,
    });
  }
}
