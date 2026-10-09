import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { CardComponent } from '../../shared/ui/card/card.component';
import { DialogComponent } from '../../shared/ui/dialog/dialog.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { Status, StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-ui-showcase-page',
  imports: [
    ButtonComponent,
    CardComponent,
    DialogComponent,
    EmptyStateComponent,
    FormFieldComponent,
    SkeletonComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header>
        <p class="text-sm font-semibold text-brand-700">DESIGN SYSTEM</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink-900">Componentes base</h1>
        <p class="mt-2 text-ink-500">
          Rota interna de desenvolvimento para validar estados e responsividade.
        </p>
      </header>

      <div class="mt-8 grid gap-6 xl:grid-cols-2">
        <app-card>
          <h2 class="text-lg font-semibold text-ink-900">Botões</h2>
          <div class="mt-5 flex flex-wrap gap-3">
            <app-button>Primário</app-button>
            <app-button variant="secondary">Secundário</app-button>
            <app-button variant="ghost">Ghost</app-button>
            <app-button [loading]="true">Carregando</app-button>
            <app-button [disabled]="true">Desabilitado</app-button>
          </div>
        </app-card>

        <app-card>
          <h2 class="text-lg font-semibold text-ink-900">Campos</h2>
          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <app-form-field
              label="Nome do projeto"
              placeholder="Ex.: Identidade visual"
              [control]="sampleControl"
            />
            <app-form-field
              label="E-mail"
              type="email"
              error="Informe um e-mail válido."
              [control]="errorControl"
            />
          </div>
        </app-card>

        <app-card>
          <h2 class="text-lg font-semibold text-ink-900">Status</h2>
          <div class="mt-5 flex flex-wrap gap-2">
            @for (status of statuses; track status) {
              <app-status-badge [status]="status" />
            }
          </div>
        </app-card>

        <app-card>
          <h2 class="text-lg font-semibold text-ink-900">Skeleton</h2>
          <div class="mt-5 space-y-3">
            <app-skeleton className="h-4 w-2/5" />
            <app-skeleton className="h-8 w-4/5" />
            <app-skeleton className="h-3 w-full" />
            <app-skeleton className="h-3 w-3/4" />
          </div>
        </app-card>
      </div>

      <section class="mt-6">
        <app-empty-state
          title="Nenhum item por aqui"
          description="Este é o estado vazio reutilizável das listas do Trato."
        >
          <app-button variant="secondary" (pressed)="dialogOpen.set(true)">
            Abrir dialog
          </app-button>
        </app-empty-state>
      </section>

      <div class="mt-6 flex justify-end">
        <app-button
          variant="secondary"
          (pressed)="toast.show('Projeto atualizado', { tone: 'success' })"
        >
          Testar toast
        </app-button>
      </div>
    </div>

    <app-dialog title="Confirmar alteração" [open]="dialogOpen()" (closed)="dialogOpen.set(false)">
      O dialog se adapta para uma folha inferior no mobile e uma janela centralizada no desktop.
    </app-dialog>
  `,
})
export class UiShowcasePageComponent {
  protected readonly toast = inject(ToastService);
  protected readonly dialogOpen = signal(false);
  protected readonly sampleControl = new FormControl('', { nonNullable: true });
  protected readonly errorControl = new FormControl('email-invalido', {
    nonNullable: true,
  });
  protected readonly statuses: Status[] = [
    'draft',
    'active',
    'completed',
    'cancelled',
    'pending',
    'funded',
    'submitted',
    'released',
    'refunded',
  ];
}
