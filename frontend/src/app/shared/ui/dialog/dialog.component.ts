import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 grid place-items-end bg-ink-900/45 p-0 sm:place-items-center sm:p-6"
        role="presentation"
        (click)="backdropClick($event)"
      >
        <section
          class="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-card"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="dialogTitleId"
        >
          <div class="flex items-start justify-between gap-4">
            <h2 class="text-lg font-semibold text-ink-900" [id]="dialogTitleId">
              {{ title() }}
            </h2>
            @if (dismissible()) {
              <button
                class="grid size-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                type="button"
                aria-label="Fechar"
                (click)="closed.emit()"
              >
                <span aria-hidden="true">×</span>
              </button>
            }
          </div>
          <div class="mt-4 text-sm leading-6 text-ink-500"><ng-content /></div>
        </section>
      </div>
    }
  `,
})
export class DialogComponent {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly dismissible = input(true);
  readonly closed = output<void>();
  protected readonly dialogTitleId = 'app-dialog-title';

  protected backdropClick(event: MouseEvent): void {
    if (this.dismissible() && event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
