export type WithdrawalStatus =
  | 'created'
  | 'quoted'
  | 'awaiting_signature'
  | 'submitted'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'cancelled';

export interface Withdrawal {
  id: string;
  status: WithdrawalStatus;
  amountBaseUnits: string;
  feeBaseUnits: string;
  fiatAmountMinor: string;
  asset: string;
  fiatCurrency: string;
  pixKey: string;
  provider: 'mock' | 'pagfinance';
  providerQuoteReference: string | null;
  providerReference: string | null;
  txSignature: string | null;
  quoteExpiresAt: string | null;
  failureCode: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalListResponse {
  items: Withdrawal[];
  nextCursor: string | null;
}

export interface PreparedWithdrawal {
  withdrawal: Withdrawal;
  transactionBase64: string | null;
  mockSignature: string | null;
  lastValidBlockHeight: string | null;
}

export interface LedgerTransactionSummary {
  id: string;
  eventType: string;
  referenceType: string;
  referenceId: string;
  description: string | null;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  direction: 'debit' | 'credit';
  amountBaseUnits: string;
  createdAt: string;
  transaction: LedgerTransactionSummary;
}

export interface LedgerResponse {
  balanceBaseUnits: string;
  items: LedgerEntry[];
  nextCursor: string | null;
}

export const TERMINAL_WITHDRAWAL_STATUSES: readonly WithdrawalStatus[] = [
  'paid',
  'failed',
  'expired',
  'cancelled',
];
