import { MilestoneAction, ProjectMilestone, ProjectRole } from '../models/project.model';

const ACTIONS_BY_ROLE = {
  client: {
    pending: ['fund'],
    funded: ['refund'],
    submitted: ['release'],
    released: [],
    refunded: [],
  },
  freelancer: {
    pending: [],
    funded: ['submit'],
    submitted: [],
    released: [],
    refunded: [],
  },
} as const satisfies Readonly<
  Record<ProjectRole, Record<ProjectMilestone['status'], readonly MilestoneAction[]>>
>;

export const MILESTONE_ACTION_LABELS: Readonly<Record<MilestoneAction, string>> = {
  fund: 'Financiar etapa',
  submit: 'Enviar entrega',
  release: 'Liberar pagamento',
  refund: 'Reembolsar',
};

export function getAvailableActions(
  milestone: Pick<ProjectMilestone, 'status'>,
  role: ProjectRole,
): readonly MilestoneAction[] {
  return ACTIONS_BY_ROLE[role][milestone.status];
}
