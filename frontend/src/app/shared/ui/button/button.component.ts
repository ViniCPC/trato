import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

@Component({
  selector: 'app-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      [class]="variantClasses()"
      [attr.aria-busy]="loading()"
      [disabled]="disabled() || loading()"
      [type]="type()"
      (click)="pressed.emit()"
    >
      @if (loading()) {
        <svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" />
          <path
            class="opacity-80"
            fill="currentColor"
            d="M12 3a9 9 0 0 1 9 9h-3a6 6 0 0 0-6-6V3Z"
          />
        </svg>
        <span>{{ loadingLabel() }}</span>
      } @else {
        <ng-content />
      }
    </button>
  `,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly type = input<'button' | 'submit'>('button');
  readonly loading = input(false);
  readonly loadingLabel = input('Aguarde...');
  readonly disabled = input(false);
  readonly pressed = output<void>();

  readonly variantClasses = computed(() => {
    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-brand-700 text-white shadow-sm hover:bg-brand-900 active:bg-brand-900',
      secondary: 'border border-ink-200 bg-white text-ink-700 hover:border-ink-400 hover:bg-ink-50',
      ghost: 'text-ink-700 hover:bg-ink-100',
    };

    return variants[this.variant()];
  });
}
