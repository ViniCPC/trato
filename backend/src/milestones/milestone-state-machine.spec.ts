import {
  MilestoneTransitionError,
  transitionMilestone,
} from './milestone-state-machine';

const project = { clientId: 'client', freelancerId: 'freelancer' };

describe('transitionMilestone', () => {
  it.each([
    ['pending', 'funded', 'client'],
    ['funded', 'submitted', 'freelancer'],
    ['submitted', 'released', 'client'],
    ['funded', 'released', 'client'],
    ['funded', 'refunded', 'client'],
  ] as const)('%s -> %s por %s', (currentStatus, nextStatus, userId) => {
    expect(
      transitionMilestone({ currentStatus, nextStatus, userId, project }),
    ).toBe(nextStatus);
  });

  it.each([
    ['pending', 'funded', 'freelancer', 'FORBIDDEN_ACTOR'],
    ['funded', 'submitted', 'client', 'FORBIDDEN_ACTOR'],
    ['submitted', 'released', 'freelancer', 'FORBIDDEN_ACTOR'],
    ['funded', 'refunded', 'freelancer', 'FORBIDDEN_ACTOR'],
    ['pending', 'released', 'client', 'INVALID_TRANSITION'],
    ['released', 'refunded', 'client', 'INVALID_TRANSITION'],
    ['refunded', 'funded', 'client', 'INVALID_TRANSITION'],
  ] as const)(
    '%s -> %s por %s falha com %s',
    (currentStatus, nextStatus, userId, code) => {
      expect(() =>
        transitionMilestone({
          currentStatus,
          nextStatus,
          userId,
          project,
        }),
      ).toThrow(MilestoneTransitionError);

      try {
        transitionMilestone({
          currentStatus,
          nextStatus,
          userId,
          project,
        });
      } catch (error) {
        expect(error).toMatchObject({ code });
      }
    },
  );

  it('nega usuários fora do projeto', () => {
    expect(() =>
      transitionMilestone({
        currentStatus: 'pending',
        nextStatus: 'funded',
        userId: 'outsider',
        project,
      }),
    ).toThrow(MilestoneTransitionError);
  });
});
