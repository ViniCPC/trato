import type { WithdrawalStatus } from './withdrawal-state-machine';

export const PAYOUT_PROVIDER = Symbol('PAYOUT_PROVIDER');

export interface PayoutQuoteInput {
  withdrawalId: string;
  userId: string;
  amountBaseUnits: bigint;
  asset: 'BRLP';
  fiatCurrency: 'BRL';
  pixKey: string;
  walletAddress: string;
}

export interface PayoutQuote {
  quoteReference: string;
  amountBaseUnits: bigint;
  feeBaseUnits: bigint;
  fiatAmountMinor: bigint;
  expiresAt: string;
}

export interface PreparePayoutInput extends PayoutQuoteInput {
  quoteReference: string;
}

export interface PreparedPayout {
  providerReference: string;
  transactionBase64: string | null;
  mockSignature: string | null;
  lastValidBlockHeight: string | null;
}

export interface ConfirmPayoutInput {
  withdrawalId: string;
  userId: string;
  walletAddress: string;
  providerReference: string;
  signature: string;
}

export interface GetPayoutStatusInput {
  userId: string;
  walletAddress: string;
  providerReference: string;
}

export interface PayoutProviderStatus {
  providerReference: string;
  status: Extract<
    WithdrawalStatus,
    'submitted' | 'processing' | 'paid' | 'failed' | 'expired' | 'cancelled'
  >;
  failureCode?: string;
  failureReason?: string;
}

export interface PayoutProvider {
  readonly name: 'mock' | 'pagfinance';
  quote(input: PayoutQuoteInput): Promise<PayoutQuote>;
  prepare(input: PreparePayoutInput): Promise<PreparedPayout>;
  confirm(input: ConfirmPayoutInput): Promise<PayoutProviderStatus>;
  getStatus(input: GetPayoutStatusInput): Promise<PayoutProviderStatus>;
}

export class PayoutProviderError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'PayoutProviderError';
  }
}
