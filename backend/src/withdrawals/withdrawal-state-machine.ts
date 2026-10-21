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

export type WithdrawalAction =
  | 'quote_created'
  | 'payment_created'
  | 'submit'
  | 'mark_processing'
  | 'pay'
  | 'fail'
  | 'cancel'
  | 'expire';

type WithdrawalTransitionErrorCode = 'INVALID_TRANSITION';

interface TransitionRule {
  from: WithdrawalStatus;
  action: WithdrawalAction;
  to: WithdrawalStatus;
}

const TRANSITIONS: readonly TransitionRule[] = [
  {
    from: 'created',
    action: 'quote_created',
    to: 'quoted',
  },
  {
    from: 'created',
    action: 'fail',
    to: 'failed',
  },
  {
    from: 'created',
    action: 'cancel',
    to: 'cancelled',
  },

  {
    from: 'quoted',
    action: 'payment_created',
    to: 'awaiting_signature',
  },
  {
    from: 'quoted',
    action: 'expire',
    to: 'expired',
  },
  {
    from: 'quoted',
    action: 'fail',
    to: 'failed',
  },
  {
    from: 'quoted',
    action: 'cancel',
    to: 'cancelled',
  },

  {
    from: 'awaiting_signature',
    action: 'submit',
    to: 'submitted',
  },
  {
    from: 'awaiting_signature',
    action: 'expire',
    to: 'expired',
  },
  {
    from: 'awaiting_signature',
    action: 'fail',
    to: 'failed',
  },
  {
    from: 'awaiting_signature',
    action: 'cancel',
    to: 'cancelled',
  },

  {
    from: 'submitted',
    action: 'mark_processing',
    to: 'processing',
  },
  {
    from: 'submitted',
    action: 'pay',
    to: 'paid',
  },
  {
    from: 'submitted',
    action: 'fail',
    to: 'failed',
  },
  {
    from: 'submitted',
    action: 'cancel',
    to: 'cancelled',
  },

  {
    from: 'processing',
    action: 'pay',
    to: 'paid',
  },
  {
    from: 'processing',
    action: 'fail',
    to: 'failed',
  },
  {
    from: 'processing',
    action: 'cancel',
    to: 'cancelled',
  },
];

export class WithdrawalTransitionError extends Error {
  readonly code: WithdrawalTransitionErrorCode;

  constructor(code: WithdrawalTransitionErrorCode, message: string) {
    super(message);
    this.name = 'WithdrawalTransitionError';
    this.code = code;
  }
}

interface TransitionWithdrawalInput {
  currentStatus: WithdrawalStatus;
  action: WithdrawalAction;
}

export function transitionWithdrawal({
  currentStatus,
  action,
}: TransitionWithdrawalInput): WithdrawalStatus {
  const transition = TRANSITIONS.find(
    (candidate) =>
      candidate.from === currentStatus && candidate.action === action,
  );

  if (!transition) {
    throw new WithdrawalTransitionError(
      'INVALID_TRANSITION',
      `A ação ${action} não é permitida para um saque com status ${currentStatus}`,
    );
  }

  return transition.to;
}
