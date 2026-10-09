import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-brand-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex items-center gap-2.5">
      <span
        class="relative grid size-9 place-items-center overflow-hidden rounded-xl bg-brand-700 font-display text-base font-bold text-white shadow-sm"
        aria-hidden="true"
      >
        t<span class="absolute right-1.5 bottom-1.5 size-1 rounded-full bg-brand-300"></span>
      </span>
      <span class="font-display text-xl font-bold tracking-[-0.03em] text-ink-950">trato</span>
    </span>
  `,
})
export class BrandLogoComponent {}
