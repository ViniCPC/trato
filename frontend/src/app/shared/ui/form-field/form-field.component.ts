import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

let nextFieldId = 0;

@Component({
  selector: 'app-form-field',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="block" [for]="fieldId">
      <span class="mb-2 block text-sm font-medium text-ink-700">{{ label() }}</span>
      <input
        class="h-12 w-full rounded-lg border bg-white px-3.5 text-base text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-100 focus:outline-none"
        [class.border-rose-400]="error()"
        [class.border-ink-200]="!error()"
        [attr.aria-describedby]="error() ? fieldId + '-error' : null"
        [attr.aria-invalid]="error() ? 'true' : null"
        [attr.autocomplete]="autocomplete()"
        [formControl]="control()"
        [id]="fieldId"
        [placeholder]="placeholder()"
        [type]="type()"
      />
    </label>
    @if (error(); as message) {
      <p class="mt-1.5 text-sm text-rose-700" [id]="fieldId + '-error'">
        {{ message }}
      </p>
    }
  `,
})
export class FormFieldComponent {
  readonly label = input.required<string>();
  readonly control = input.required<FormControl<string>>();
  readonly error = input<string | null>(null);
  readonly placeholder = input('');
  readonly type = input<'text' | 'email' | 'password'>('text');
  readonly autocomplete = input('off');
  protected readonly fieldId = `field-${++nextFieldId}`;
}
