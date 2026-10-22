import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, map, startWith } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';
import { BrlpPipe } from '../../../shared/pipes/brlp.pipe';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { brlInputToBaseUnits, maskBrlInput } from '../../../shared/utils/money';
import { PendingChangesComponent } from '../guards/pending-changes.guard';
import { CreateProjectRequest } from '../models/project.model';
import { ProjectsApiService } from '../services/projects-api.service';

type MilestoneFormGroup = FormGroup<{
  title: FormControl<string>;
  description: FormControl<string>;
  amount: FormControl<string>;
}>;

const positiveMoneyValidator: ValidatorFn = (
  control: AbstractControl<string>,
): ValidationErrors | null => {
  if (!control.value) {
    return null;
  }

  try {
    return BigInt(brlInputToBaseUnits(control.value)) > 0n ? null : { positiveMoney: true };
  } catch {
    return { money: true };
  }
};

@Component({
  selector: 'app-project-form-page',
  imports: [
    BrlpPipe,
    ButtonComponent,
    CardComponent,
    FormFieldComponent,
    ReactiveFormsModule,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto w-full max-w-6xl px-4 py-6 pb-40 sm:px-6 lg:px-8 lg:py-10 lg:pb-10">
      <a
        class="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900"
        routerLink="/projects"
        [queryParams]="{ role: 'client' }"
      >
        <span aria-hidden="true">←</span>
        Voltar aos projetos
      </a>

      <header class="mt-6 max-w-2xl">
        <p class="text-sm font-semibold text-brand-700">NOVO ACORDO</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-[-0.035em] text-ink-900 sm:text-4xl">
          Crie um projeto claro desde o início
        </h1>
        <p class="mt-3 text-sm leading-6 text-ink-500 sm:text-base">
          Defina escopo, responsável e valores por etapa. O projeto começa como rascunho.
        </p>
      </header>

      <form
        class="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8"
        [formGroup]="form"
        (ngSubmit)="submit()"
      >
        <div class="space-y-6">
          <app-card>
            <div class="grid gap-5">
              <app-form-field
                label="Título do projeto"
                placeholder="Ex.: Identidade visual da marca"
                autocomplete="off"
                [control]="form.controls.title"
                [error]="controlError(form.controls.title, 'O título')"
              />

              <label class="block">
                <span class="mb-2 block text-sm font-medium text-ink-700">Descrição</span>
                <textarea
                  class="min-h-28 w-full resize-y rounded-lg border border-ink-200 bg-white px-3.5 py-3 text-base text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-100 focus:outline-none"
                  formControlName="description"
                  maxlength="5000"
                  placeholder="Contexto, entregáveis e combinados importantes"
                ></textarea>
              </label>

              <app-form-field
                label="E-mail do freelancer"
                placeholder="freelancer@exemplo.com"
                type="email"
                autocomplete="email"
                [control]="form.controls.freelancerEmail"
                [error]="emailError()"
              />
            </div>
          </app-card>

          <section>
            <div class="flex items-end justify-between gap-4">
              <div>
                <h2 class="text-xl font-semibold text-ink-900">Etapas do projeto</h2>
                <p class="mt-1 text-sm text-ink-500">Cada valor ficará protegido separadamente.</p>
              </div>
              <app-button variant="secondary" (pressed)="addMilestone()"
                >Adicionar etapa</app-button
              >
            </div>

            <div class="mt-4 space-y-4">
              @for (milestone of milestones.controls; track milestone; let index = $index) {
                <app-card>
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <p class="text-xs font-semibold tracking-wide text-brand-700 uppercase">
                        Etapa {{ index + 1 }}
                      </p>
                      <h3 class="mt-1 text-base font-semibold text-ink-900">
                        {{ milestone.controls.title.value || 'Nova etapa' }}
                      </h3>
                    </div>
                    <div class="flex gap-1">
                      <button
                        class="grid size-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                        type="button"
                        aria-label="Mover etapa para cima"
                        [disabled]="index === 0"
                        (click)="moveMilestone(index, -1)"
                      >
                        ↑
                      </button>
                      <button
                        class="grid size-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                        type="button"
                        aria-label="Mover etapa para baixo"
                        [disabled]="index === milestones.length - 1"
                        (click)="moveMilestone(index, 1)"
                      >
                        ↓
                      </button>
                      <button
                        class="grid size-9 place-items-center rounded-lg text-rose-600 hover:bg-rose-50"
                        type="button"
                        aria-label="Remover etapa"
                        (click)="removeMilestone(index)"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div class="mt-5 grid gap-4 sm:grid-cols-2">
                    <label class="block sm:col-span-2">
                      <span class="mb-2 block text-sm font-medium text-ink-700">Título</span>
                      <input
                        class="h-12 w-full rounded-lg border bg-white px-3.5 text-base text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-100 focus:outline-none"
                        [class.border-rose-400]="controlError(milestone.controls.title, 'O título')"
                        [class.border-ink-200]="!controlError(milestone.controls.title, 'O título')"
                        [formControl]="milestone.controls.title"
                        maxlength="160"
                        placeholder="Ex.: Direção criativa"
                      />
                      @if (controlError(milestone.controls.title, 'O título'); as error) {
                        <p class="mt-1.5 text-sm text-rose-700">{{ error }}</p>
                      }
                    </label>

                    <label class="block">
                      <span class="mb-2 block text-sm font-medium text-ink-700">Valor</span>
                      <div class="relative">
                        <span
                          class="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-medium text-ink-500"
                          >{{ tokenSymbol }}</span
                        >
                        <input
                          class="h-12 w-full rounded-lg border bg-white pr-3.5 pl-16 text-base text-ink-900 tabular-nums placeholder:text-ink-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-100 focus:outline-none"
                          [class.border-rose-400]="amountError(milestone.controls.amount)"
                          [class.border-ink-200]="!amountError(milestone.controls.amount)"
                          [formControl]="milestone.controls.amount"
                          inputmode="numeric"
                          placeholder="0,00"
                          (input)="maskAmount(index, $event)"
                        />
                      </div>
                      @if (amountError(milestone.controls.amount); as error) {
                        <p class="mt-1.5 text-sm text-rose-700">{{ error }}</p>
                      }
                    </label>

                    <label class="block">
                      <span class="mb-2 block text-sm font-medium text-ink-700"
                        >Descrição opcional</span
                      >
                      <input
                        class="h-12 w-full rounded-lg border border-ink-200 bg-white px-3.5 text-base text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-100 focus:outline-none"
                        [formControl]="milestone.controls.description"
                        maxlength="5000"
                        placeholder="O que será entregue"
                      />
                    </label>
                  </div>
                </app-card>
              }
            </div>

            @if (submitted() && milestones.length === 0) {
              <p class="mt-3 text-sm text-rose-700">Adicione pelo menos uma etapa.</p>
            }
          </section>
        </div>

        <aside class="hidden lg:block">
          <div class="sticky top-8 rounded-card border border-ink-200 bg-white p-6 shadow-sm">
            <p class="text-sm font-semibold text-ink-900">Resumo do projeto</p>
            <div class="mt-5 border-y border-ink-100 py-5">
              <p class="text-xs text-ink-500">Valor total</p>
              <p class="mt-1 text-3xl font-semibold tracking-tight text-ink-900 tabular-nums">
                {{ totalBaseUnits() | brlp }}
              </p>
              <p class="mt-2 text-sm text-ink-500">
                {{ milestones.length }} {{ milestones.length === 1 ? 'etapa' : 'etapas' }}
              </p>
            </div>
            <app-button
              class="mt-5 block w-full"
              type="submit"
              loadingLabel="Criando projeto..."
              [loading]="submitting()"
            >
              Criar projeto
            </app-button>
          </div>
        </aside>

        <div
          class="fixed inset-x-0 bottom-[4.5rem] z-20 border-t border-ink-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(16,24,40,0.08)] backdrop-blur lg:hidden"
        >
          <div class="mx-auto flex max-w-lg items-center justify-between gap-4">
            <div>
              <p class="text-xs text-ink-500">Total · {{ milestones.length }} etapas</p>
              <p class="text-lg font-semibold text-ink-900 tabular-nums">
                {{ totalBaseUnits() | brlp }}
              </p>
            </div>
            <app-button type="submit" loadingLabel="Criando..." [loading]="submitting()">
              Criar projeto
            </app-button>
          </div>
        </div>
      </form>
    </div>
  `,
})
export class ProjectFormPageComponent implements PendingChangesComponent {
  private readonly api = inject(ProjectsApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private saved = false;
  protected readonly tokenSymbol = environment.tokenSymbol;

  readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(160)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(5000)],
    }),
    freelancerEmail: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(320)],
    }),
    milestones: new FormArray<MilestoneFormGroup>([], {
      validators: [Validators.minLength(1)],
    }),
  });

  readonly submitted = signal(false);
  readonly submitting = signal(false);
  readonly formValue = toSignal(
    this.form.valueChanges.pipe(
      startWith(this.form.getRawValue()),
      map(() => this.form.getRawValue()),
    ),
    { initialValue: this.form.getRawValue() },
  );
  readonly totalBaseUnits = computed(() =>
    this.formValue()
      .milestones.reduce((total, milestone) => {
        try {
          return total + BigInt(brlInputToBaseUnits(milestone.amount));
        } catch {
          return total;
        }
      }, 0n)
      .toString(),
  );

  get milestones(): FormArray<MilestoneFormGroup> {
    return this.form.controls.milestones;
  }

  constructor() {
    this.addMilestone();
    this.form.markAsPristine();
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saved && !this.submitting();
  }

  protected addMilestone(): void {
    this.milestones.push(this.createMilestone());
    this.milestones.markAsDirty();
  }

  protected removeMilestone(index: number): void {
    this.milestones.removeAt(index);
    this.milestones.markAsDirty();
  }

  protected moveMilestone(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.milestones.length) {
      return;
    }

    const control = this.milestones.at(index);
    this.milestones.removeAt(index, { emitEvent: false });
    this.milestones.insert(target, control);
    this.milestones.markAsDirty();
    this.milestones.updateValueAndValidity();
  }

  protected maskAmount(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const masked = maskBrlInput(input.value);
    this.milestones.at(index).controls.amount.setValue(masked);
  }

  protected controlError(control: FormControl<string>, label: string): string | null {
    if (!(control.touched || this.submitted()) || control.valid) {
      return null;
    }

    if (control.hasError('required')) {
      return `${label} é obrigatório.`;
    }
    if (control.hasError('minlength')) {
      return `${label} precisa ter pelo menos 3 caracteres.`;
    }
    if (control.hasError('maxlength')) {
      return `${label} pode ter no máximo 160 caracteres.`;
    }
    return `${label} é inválido.`;
  }

  protected emailError(): string | null {
    const control = this.form.controls.freelancerEmail;
    if (!(control.touched || this.submitted()) || control.valid) {
      return null;
    }
    return control.hasError('required')
      ? 'Informe o e-mail do freelancer.'
      : 'Informe um e-mail válido.';
  }

  protected amountError(control: FormControl<string>): string | null {
    if (!(control.touched || this.submitted()) || control.valid) {
      return null;
    }
    return control.hasError('required')
      ? 'Informe o valor da etapa.'
      : 'O valor precisa ser maior que zero.';
  }

  protected submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const value = this.form.getRawValue();
    const request: CreateProjectRequest = {
      title: value.title.trim(),
      description: value.description.trim() || undefined,
      freelancerEmail: value.freelancerEmail.trim().toLowerCase(),
      milestones: value.milestones.map((milestone) => ({
        title: milestone.title.trim(),
        description: milestone.description.trim() || undefined,
        amountBaseUnits: brlInputToBaseUnits(milestone.amount),
      })),
    };

    this.submitting.set(true);
    this.api
      .create(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (project) => {
          this.saved = true;
          this.toast.show('Projeto criado', {
            description: 'O rascunho e todas as etapas foram salvos.',
            tone: 'success',
          });
          void this.router.navigate(['/projects', project.id]);
        },
        error: () => undefined,
      });
  }

  private createMilestone(): MilestoneFormGroup {
    return new FormGroup({
      title: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(160)],
      }),
      description: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(5000)],
      }),
      amount: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, positiveMoneyValidator],
      }),
    });
  }
}
