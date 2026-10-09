import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService, ToastTone } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-region',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pointer-events-none fixed inset-x-4 top-4 z-[70] flex flex-col items-end gap-3 sm:left-auto sm:w-96"
      aria-live="polite"
      aria-label="Notificações"
    >
      @for (message of toast.messages(); track message.id) {
        <article
          class="pointer-events-auto w-full rounded-card border bg-white p-4 shadow-lg"
          [class]="toneClass(message.tone)"
        >
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-ink-900">{{ message.title }}</p>
              @if (message.description) {
                <p class="mt-1 text-sm leading-5 text-ink-500">
                  {{ message.description }}
                </p>
              }
            </div>
            <button
              class="grid size-7 shrink-0 place-items-center rounded-md text-ink-400 hover:bg-ink-100 hover:text-ink-900"
              type="button"
              aria-label="Fechar notificação"
              (click)="toast.dismiss(message.id)"
            >
              ×
            </button>
          </div>
        </article>
      }
    </div>
  `,
})
export class ToastComponent {
  protected readonly toast = inject(ToastService);

  protected toneClass(tone: ToastTone): string {
    const classes: Record<ToastTone, string> = {
      success: 'border-brand-300',
      error: 'border-rose-300',
      info: 'border-sky-300',
    };
    return classes[tone];
  }
}
