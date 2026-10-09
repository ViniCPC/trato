import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { MilestoneStatus, STATUS_CONFIG } from '../config/status.config';

@Component({
  selector: 'app-status-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="grid size-10 place-items-center rounded-full border transition-colors duration-300"
      [class]="config().timelineClasses"
      [attr.aria-label]="config().label"
      role="img"
    >
      <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        @for (path of config().iconPaths; track path) {
          <path
            [attr.d]="path"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        }
      </svg>
    </span>
  `,
})
export class StatusIconComponent {
  readonly status = input.required<MilestoneStatus>();
  readonly config = computed(() => STATUS_CONFIG[this.status()]);
}
