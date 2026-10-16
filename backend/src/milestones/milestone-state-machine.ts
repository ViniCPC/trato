export type MilestoneStatus =
  'pending' | 'funded' | 'submitted' | 'released' | 'refunded';

type ActorRole = 'client' | 'freelancer';
type TransitionErrorCode = 'INVALID_TRANSITION' | 'FORBIDDEN_ACTOR';

interface TransitionRule {
  from: MilestoneStatus;
  to: MilestoneStatus;
  actor: ActorRole;
}

const TRANSITIONS: readonly TransitionRule[] = [
  { from: 'pending', to: 'funded', actor: 'client' },
  { from: 'funded', to: 'submitted', actor: 'freelancer' },
  { from: 'submitted', to: 'released', actor: 'client' },
  { from: 'funded', to: 'released', actor: 'client' },
  { from: 'funded', to: 'refunded', actor: 'client' },
];

export class MilestoneTransitionError extends Error {
  readonly code: TransitionErrorCode;

  constructor(code: TransitionErrorCode, message: string) {
    super(message);
    this.name = 'MilestoneTransitionError';
    this.code = code;
  }
}

interface TransitionInput {
  currentStatus: MilestoneStatus;
  nextStatus: MilestoneStatus;
  userId: string;
  project: Readonly<{
    clientId: string;
    freelancerId: string;
  }>;
}

export function transitionMilestone({
  currentStatus,
  nextStatus,
  userId,
  project,
}: TransitionInput): MilestoneStatus {
  const isParticipant =
    userId === project.clientId || userId === project.freelancerId;

  if (!isParticipant) {
    throw new MilestoneTransitionError(
      'FORBIDDEN_ACTOR',
      'Você não participa deste projeto',
    );
  }

  const rule = TRANSITIONS.find(
    (transition) =>
      transition.from === currentStatus && transition.to === nextStatus,
  );

  if (!rule) {
    throw new MilestoneTransitionError(
      'INVALID_TRANSITION',
      `Transição de ${currentStatus} para ${nextStatus} não permitida`,
    );
  }

  const allowedUserId =
    rule.actor === 'client' ? project.clientId : project.freelancerId;

  if (userId !== allowedUserId) {
    throw new MilestoneTransitionError(
      'FORBIDDEN_ACTOR',
      rule.actor === 'client'
        ? 'Somente o cliente do projeto pode executar esta transição'
        : 'Somente o freelancer do projeto pode executar esta transição',
    );
  }

  return rule.to;
}
