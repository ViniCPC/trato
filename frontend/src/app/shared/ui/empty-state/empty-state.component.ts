import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="rounded-card border border-dashed border-ink-200 bg-white px-6 py-12 text-center"
    >
      <div
        class="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" fill="none" class="size-6">
          <path
            d="M12 6v12M6 12h12"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      </div>
      <h2 class="text-base font-semibold text-ink-900">{{ title() }}</h2>
      <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-500">
        {{ description() }}
      </p>
      <div class="mt-6 flex justify-center"><ng-content /></div>
    </section>
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
