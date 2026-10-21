import {
  transitionWithdrawal,
  WithdrawalTransitionError,
} from './withdrawal-state-machine';

describe('transitionWithdrawal', () => {
  it.each([
    ['created', 'quote_created', 'quoted'],
    ['created', 'fail', 'failed'],
    ['created', 'cancel', 'cancelled'],

    ['quoted', 'payment_created', 'awaiting_signature'],
    ['quoted', 'expire', 'expired'],
    ['quoted', 'fail', 'failed'],
    ['quoted', 'cancel', 'cancelled'],

    ['awaiting_signature', 'submit', 'submitted'],
    ['awaiting_signature', 'expire', 'expired'],
    ['awaiting_signature', 'fail', 'failed'],
    ['awaiting_signature', 'cancel', 'cancelled'],

    ['submitted', 'mark_processing', 'processing'],
    ['submitted', 'pay', 'paid'],
    ['submitted', 'fail', 'failed'],
    ['submitted', 'cancel', 'cancelled'],

    ['processing', 'pay', 'paid'],
    ['processing', 'fail', 'failed'],
    ['processing', 'cancel', 'cancelled'],
  ] as const)(
    '%s + %s resulta em %s',
    (currentStatus, action, expectedStatus) => {
      expect(
        transitionWithdrawal({
          currentStatus,
          action,
        }),
      ).toBe(expectedStatus);
    },
  );

  it.each([
    ['created', 'pay'],
    ['created', 'submit'],
    ['quoted', 'pay'],
    ['awaiting_signature', 'pay'],
    ['paid', 'fail'],
    ['failed', 'pay'],
    ['expired', 'pay'],
    ['cancelled', 'pay'],
  ] as const)(
    'rejeita a ação %s quando o status é %s',
    (currentStatus, action) => {
      expect(() =>
        transitionWithdrawal({
          currentStatus,
          action,
        }),
      ).toThrow(WithdrawalTransitionError);
    },
  );

  it('retorna o código INVALID_TRANSITION', () => {
    try {
      transitionWithdrawal({
        currentStatus: 'created',
        action: 'pay',
      });

      throw new Error('A transição deveria ter falhado');
    } catch (error) {
      expect(error).toBeInstanceOf(WithdrawalTransitionError);
      expect(error).toMatchObject({
        code: 'INVALID_TRANSITION',
      });
    }
  });

  it('não permite alterar um saque liquidado', () => {
    expect(() =>
      transitionWithdrawal({
        currentStatus: 'paid',
        action: 'fail',
      }),
    ).toThrow('A ação fail não é permitida para um saque com status paid');
  });
});
