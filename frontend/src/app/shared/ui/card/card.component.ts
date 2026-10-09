import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rounded-card border border-ink-200 bg-white p-5 sm:p-6">
      <ng-content />
    </section>
  `,
})
export class CardComponent {}
