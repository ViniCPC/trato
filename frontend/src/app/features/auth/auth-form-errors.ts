import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl } from '@angular/forms';
import { getApiMessages } from '../../core/models/api-error.model';

export function applyApiFormErrors(
  controls: Record<string, AbstractControl<string, string>>,
  error: unknown,
): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Não foi possível acessar o servidor. Tente novamente.';
  }

  const messages = getApiMessages(error.error);
  const unassigned: string[] = [];

  for (const message of messages) {
    const field = Object.keys(controls).find((name) =>
      message.toLocaleLowerCase('pt-BR').startsWith(`${name.toLowerCase()} `),
    );

    if (field) {
      const control = controls[field];
      control.setErrors({ ...control.errors, server: message });
    } else if (/e-?mail/i.test(message) && controls['email']) {
      const control = controls['email'];
      control.setErrors({ ...control.errors, server: message });
    } else {
      unassigned.push(message);
    }
  }

  return unassigned.join(' ') || null;
}

export function controlError(
  control: AbstractControl<string, string>,
  submitted: boolean,
  field: 'name' | 'email' | 'password',
): string | null {
  if (!submitted && !control.touched) {
    return null;
  }

  const serverError: unknown = control.getError('server');
  if (typeof serverError === 'string') {
    return serverError;
  }
  if (control.hasError('required')) {
    return 'Este campo é obrigatório.';
  }
  if (control.hasError('email')) {
    return 'Informe um e-mail válido.';
  }
  if (control.hasError('minlength')) {
    return field === 'name'
      ? 'Use pelo menos 3 caracteres.'
      : 'A senha precisa ter pelo menos 3 caracteres.';
  }
  if (control.hasError('maxlength')) {
    const limits = { name: 120, email: 255, password: 128 } as const;
    return `Use no máximo ${limits[field]} caracteres.`;
  }

  return null;
}
