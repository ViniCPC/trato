import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrlpPipe } from '../../../shared/pipes/brlp.pipe';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { ProjectListItem } from '../models/project.model';

@Component({
  selector: 'app-project-card',
  imports: [BrlpPipe, CardComponent, RouterLink, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      class="group focus-visible:ring-brand-200 block rounded-card focus-visible:ring-3 focus-visible:outline-none"
      [routerLink]="['/projects', project().id]"
    >
      <app-card>
        <article class="transition-transform duration-200 group-hover:-translate-y-0.5">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="text-xs font-semibold tracking-wide text-ink-400 uppercase">
                {{ project().role === 'client' ? 'Freelancer' : 'Cliente' }}
                <span aria-hidden="true">·</span>
                {{ project().otherParty.name }}
              </p>
              <h2 class="mt-2 truncate text-lg font-semibold text-ink-900">
                {{ project().title }}
              </h2>
            </div>
            <app-status-badge [status]="project().status" />
          </div>

          <div class="mt-6 flex items-end justify-between gap-4">
            <div>
              <p class="text-xs text-ink-500">Valor do projeto</p>
              <p class="mt-1 text-xl font-semibold tracking-tight text-ink-900 tabular-nums">
                {{ project().summary.totalAmountBaseUnits | brlp }}
              </p>
            </div>
            <p class="shrink-0 text-xs font-medium text-ink-500 tabular-nums">
              {{ project().summary.releasedMilestones }} de
              {{ project().summary.totalMilestones }} etapas liberadas
            </p>
          </div>

          <div
            class="mt-3 h-2 overflow-hidden rounded-full bg-ink-100"
            role="progressbar"
            aria-label="Progresso das etapas"
            aria-valuemin="0"
            aria-valuemax="100"
            [attr.aria-valuenow]="progressPercentage()"
          >
            <div
              class="h-full rounded-full bg-brand-500 transition-[width]"
              [style.width.%]="progressPercentage()"
            ></div>
          </div>
        </article>
      </app-card>
    </a>
  `,
})
export class ProjectCardComponent {
  readonly project = input.required<ProjectListItem>();
  readonly progressPercentage = computed(() => {
    const summary = this.project().summary;
    return summary.totalMilestones === 0
      ? 0
      : Math.round((summary.releasedMilestones * 100) / summary.totalMilestones);
  });
}
