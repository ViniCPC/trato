import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { BrlpPipe } from '../../../shared/pipes/brlp.pipe';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { MilestoneAction, ProjectMilestone, ProjectRole } from '../models/project.model';
import { MILESTONE_ACTION_LABELS, getAvailableActions } from '../utils/milestone-actions';
import { StatusIconComponent } from './status-icon.component';
import { environment } from '../../../../environments/environment';

export interface MilestoneActionRequest {
  action: MilestoneAction;
  milestone: ProjectMilestone;
}

@Component({
  selector: 'app-project-timeline',
  imports: [BrlpPipe, ButtonComponent, StatusBadgeComponent, StatusIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="space-y-0" aria-label="Etapas do projeto">
      @for (milestone of milestones(); track milestone.id; let last = $last) {
        <li
          class="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 pb-5 transition-all duration-500"
          [class.rounded-card]="highlightedMilestoneId() === milestone.id"
          [class.bg-brand-50]="highlightedMilestoneId() === milestone.id"
          [class.ring-2]="highlightedMilestoneId() === milestone.id"
          [class.ring-brand-100]="highlightedMilestoneId() === milestone.id"
          [attr.data-milestone-id]="milestone.id"
        >
          @if (!last) {
            <span
              class="absolute top-10 bottom-0 left-5 w-px -translate-x-1/2 bg-ink-200"
              aria-hidden="true"
            ></span>
          }
          <app-status-icon class="relative z-10" [status]="milestone.status" />

          <article class="min-w-0 rounded-card border border-ink-200 bg-white p-4 sm:p-5">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <p class="text-xs font-semibold tracking-wide text-ink-400 uppercase">
                  Etapa {{ milestone.sequence }}
                </p>
                <h3 class="mt-1 text-base font-semibold text-ink-900">
                  {{ milestone.title }}
                </h3>
                @if (milestone.description) {
                  <p class="mt-2 text-sm leading-6 text-ink-500">
                    {{ milestone.description }}
                  </p>
                }
              </div>
              <app-status-badge class="shrink-0" [status]="milestone.status" />
            </div>

            <div
              class="mt-4 flex flex-col gap-3 border-t border-ink-100 pt-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p class="text-lg font-semibold text-ink-900 tabular-nums">
                {{ milestone.amountBaseUnits | brlp }}
              </p>
              <div class="flex flex-wrap gap-2">
                @for (action of availableActions(milestone); track action) {
                  <app-button
                    [attr.data-action]="action"
                    [variant]="action === 'refund' ? 'secondary' : 'primary'"
                    (pressed)="actionRequested.emit({ action, milestone })"
                  >
                    {{ actionLabels[action] }}
                  </app-button>
                }
              </div>
            </div>
            @if (transactionLinks(milestone).length) {
              <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                @for (transaction of transactionLinks(milestone); track transaction.signature) {
                  <a
                    class="font-medium text-web3-700 hover:underline"
                    [href]="explorerUrl(transaction.signature)"
                    target="_blank"
                    rel="noopener noreferrer"
                    >{{ transaction.label }} ↗</a
                  >
                }
              </div>
            }
          </article>
        </li>
      }
    </ol>
  `,
})
export class ProjectTimelineComponent {
  readonly milestones = input.required<ProjectMilestone[]>();
  readonly role = input.required<ProjectRole>();
  readonly highlightedMilestoneId = input<string | null>(null);
  readonly actionRequested = output<MilestoneActionRequest>();
  protected readonly actionLabels = MILESTONE_ACTION_LABELS;

  protected availableActions(milestone: ProjectMilestone): readonly MilestoneAction[] {
    return getAvailableActions(milestone, this.role());
  }

  protected transactionLinks(
    milestone: ProjectMilestone,
  ): ReadonlyArray<{ label: string; signature: string }> {
    return [
      { label: 'Financiamento', signature: milestone.fundTxSignature },
      { label: 'Entrega', signature: milestone.submitTxSignature },
      { label: 'Liberação', signature: milestone.releaseTxSignature },
      { label: 'Reembolso', signature: milestone.refundTxSignature },
    ].filter(
      (transaction): transaction is { label: string; signature: string } =>
        transaction.signature !== null && !transaction.signature.startsWith('mock_'),
    );
  }

  protected explorerUrl(signature: string): string {
    return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=${environment.solanaCluster}`;
  }
}
