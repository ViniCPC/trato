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
      // O mock usa paridade 1 BRLP = R$ 1. BRLP tem seis casas e BRL,
      // duas; portanto o valor precisa ser convertido para centavos.
      fiatAmountMinor: input.amountBaseUnits / 10_000n,
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
    const payout = this.getOrRestorePayout(
      input.providerReference,
      input.withdrawalId,
    );
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
    const payout = this.getOrRestorePayout(input.providerReference);
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

  private getOrRestorePayout(providerReference: string, withdrawalId?: string) {
    const existing = this.payouts.get(providerReference);
    if (existing) return existing;

    const expectedReference = withdrawalId
      ? `mock_payout_${withdrawalId}`
      : null;
    if (
      (expectedReference !== null && providerReference !== expectedReference) ||
      !/^mock_payout_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        providerReference,
      )
    ) {
      return null;
    }

    const restored = {
      status: 'submitted' as const,
      syncCount: 0,
    };
    this.payouts.set(providerReference, restored);
    return restored;
  }
}
