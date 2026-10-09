import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AppStatus, STATUS_CONFIG } from '../../../features/projects/config/status.config';

export type Status = AppStatus;

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-300"
      [class]="badgeClasses()"
    >
      {{ label() }}
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<AppStatus>();
  readonly config = computed(() => STATUS_CONFIG[this.status()]);
  readonly label = computed(() => this.config().label);
  readonly badgeClasses = computed(() => this.config().badgeClasses);
}
