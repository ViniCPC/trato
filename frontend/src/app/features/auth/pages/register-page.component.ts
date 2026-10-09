import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { applyApiFormErrors, controlError } from '../auth-form-errors';
import { AuthFrameComponent } from '../components/auth-frame.component';

@Component({
  selector: 'app-register-page',
  imports: [
    AuthFrameComponent,
    ButtonComponent,
    FormFieldComponent,
    ReactiveFormsModule,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-frame
      eyebrow="Comece um novo acordo"
      title="Crie sua conta"
      description="Leva menos de um minuto. Você poderá atuar como cliente ou freelancer."
    >
      <form class="space-y-5" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <app-form-field
          label="Nome"
          autocomplete="name"
          placeholder="Como podemos chamar você?"
          [control]="form.controls.name"
          [error]="errorFor('name')"
        />
        <app-form-field
          label="E-mail"
          type="email"
          autocomplete="email"
          placeholder="voce@exemplo.com"
          [control]="form.controls.email"
          [error]="errorFor('email')"
        />
        <app-form-field
          label="Senha"
          type="password"
          autocomplete="new-password"
          placeholder="Mínimo de 3 caracteres"
          [control]="form.controls.password"
          [error]="errorFor('password')"
        />

        @if (formError()) {
          <p class="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
            {{ formError() }}
          </p>
        }

        <app-button
          class="block [&>button]:w-full"
          type="submit"
          loadingLabel="Criando conta..."
          [loading]="loading()"
          [disabled]="form.invalid"
        >
          Criar minha conta
        </app-button>
      </form>

      <p class="mt-7 text-center text-sm text-ink-500">
        Já tem uma conta?
        <a class="font-semibold text-brand-700 hover:text-brand-900" routerLink="/login">
          Entrar
        </a>
      </p>
    </app-auth-frame>
  `,
})
export class RegisterPageComponent {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly submitted = signal(false);
  readonly formError = signal<string | null>(null);
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(120)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(255)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(128)],
    }),
  });

  submit(): void {
    this.submitted.set(true);
    this.formError.set(null);
    this.clearServerErrors();

    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.auth
      .register(this.form.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: () =>
          void this.router.navigate(['/projects'], {
            queryParams: { role: 'client' },
          }),
        error: (error: HttpErrorResponse) =>
          this.formError.set(applyApiFormErrors(this.form.controls, error)),
      });
  }

  protected errorFor(field: 'name' | 'email' | 'password'): string | null {
    return controlError(this.form.controls[field], this.submitted(), field);
  }

  private clearServerErrors(): void {
    Object.values(this.form.controls).forEach((control) => {
      if (!control.errors?.['server']) {
        return;
      }
      const remainingErrors = { ...control.errors };
      delete remainingErrors['server'];
      control.setErrors(Object.keys(remainingErrors).length ? remainingErrors : null);
    });
  }
}
