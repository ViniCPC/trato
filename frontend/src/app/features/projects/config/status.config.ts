export type ProjectStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type MilestoneStatus = 'pending' | 'funded' | 'submitted' | 'released' | 'refunded';
export type AppStatus = ProjectStatus | MilestoneStatus;

export interface StatusConfig {
  label: string;
  badgeClasses: string;
  iconPaths: readonly string[];
  timelineClasses: string;
}

export const STATUS_CONFIG: Readonly<Record<AppStatus, StatusConfig>> = {
  draft: {
    label: 'Rascunho',
    badgeClasses: 'bg-ink-100 text-ink-700',
    timelineClasses: 'border-ink-200 bg-ink-50 text-ink-600',
    iconPaths: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'],
  },
  active: {
    label: 'Em andamento',
    badgeClasses: 'bg-sky-100 text-sky-800',
    timelineClasses: 'border-sky-200 bg-sky-50 text-sky-700',
    iconPaths: ['M5 12h14', 'm13 6 6 6-6 6'],
  },
  completed: {
    label: 'Concluído',
    badgeClasses: 'bg-brand-100 text-brand-900',
    timelineClasses: 'border-brand-100 bg-brand-50 text-brand-900',
    iconPaths: ['m5 12 4 4L19 6'],
  },
  cancelled: {
    label: 'Cancelado',
    badgeClasses: 'bg-rose-100 text-rose-700',
    timelineClasses: 'border-rose-200 bg-rose-50 text-rose-700',
    iconPaths: ['m6 6 12 12', 'M18 6 6 18'],
  },
  pending: {
    label: 'Pendente',
    badgeClasses: 'bg-amber-100 text-amber-800',
    timelineClasses: 'border-amber-200 bg-amber-50 text-amber-800',
    iconPaths: ['M12 7v5l3 2', 'M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z'],
  },
  funded: {
    label: 'Valor protegido',
    badgeClasses: 'bg-web3-100 text-web3-700',
    timelineClasses: 'border-web3-100 bg-web3-50 text-web3-700',
    iconPaths: ['M5 11h14v9H5Z', 'M8 11V8a4 4 0 0 1 8 0v3'],
  },
  submitted: {
    label: 'Em aprovação',
    badgeClasses: 'bg-sky-100 text-sky-800',
    timelineClasses: 'border-sky-200 bg-sky-50 text-sky-700',
    iconPaths: ['M4 4h16v12H7l-3 3Z', 'm8 10 2 2 5-5'],
  },
  released: {
    label: 'Liberado',
    badgeClasses: 'bg-brand-100 text-brand-900',
    timelineClasses: 'border-brand-100 bg-brand-50 text-brand-900',
    iconPaths: ['M20 6 9 17l-5-5'],
  },
  refunded: {
    label: 'Reembolsado',
    badgeClasses: 'bg-rose-100 text-rose-700',
    timelineClasses: 'border-rose-200 bg-rose-50 text-rose-700',
    iconPaths: ['M9 14 4 9l5-5', 'M4 9h10a6 6 0 0 1 0 12h-2'],
  },
};
