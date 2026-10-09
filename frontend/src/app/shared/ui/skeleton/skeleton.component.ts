import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-pulse rounded-lg bg-ink-100" [class]="className()" aria-hidden="true"></div>
  `,
})
export class SkeletonComponent {
  readonly className = input('h-4 w-full');
}
