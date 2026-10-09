import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { BrlpPipe } from '../../../shared/pipes/brlp.pipe';
import { DialogComponent } from '../../../shared/ui/dialog/dialog.component';
import { MilestoneAction, ProjectMilestone } from '../models/project.model';
import { MILESTONE_ACTION_LABELS } from '../utils/milestone-actions';
import { TransactionStep } from '../services/transaction-flow.service';

const STEPS: ReadonlyArray<{
  id: TransactionStep;
  label: string;
  description: string;
}> = [
  {
    id: 'preparing',
    label: 'Preparando transação',
    description: 'Validando os dados da etapa.',
  },
  {
    id: 'awaiting_signature',
    label: 'Aguardando assinatura',
    description: 'Confirme a solicitação na sua carteira.',
  },
  {
    id: 'confirming',
    label: 'Confirmando',
    description: 'Registrando a mudança com segurança.',
  },
  {
    id: 'done',
    label: 'Concluído',
    description: 'O projeto foi atualizado a partir do servidor.',
  },
];

@Component({
  selector: 'app-transaction-dialog',
  imports: [BrlpPipe, DialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog
      [dismissible]="step() === 'done'"
      [open]="open()"
      [title]="title()"
      (closed)="closed.emit()"
    >
      @if (milestone(); as currentMilestone) {
        <div class="rounded-xl bg-ink-50 p-4">
          <p class="font-medium text-ink-900">{{ currentMilestone.title }}</p>
          <p class="mt-1 text-lg font-semibold text-ink-900 tabular-nums">
            {{ currentMilestone.amountBaseUnits | brlp }}
          </p>
        </div>

        <ol class="mt-5 space-y-4" aria-label="Progresso da transação">
          @for (item of steps; track item.id; let index = $index) {
            <li class="flex gap-3" [attr.data-step]="item.id">
              <span
                class="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold transition-colors"
                [class.border-brand-700]="stepState(index) !== 'pending'"
                [class.bg-brand-700]="stepState(index) === 'complete'"
                [class.text-white]="stepState(index) === 'complete'"
                [class.text-brand-700]="stepState(index) === 'active'"
                [class.border-ink-200]="stepState(index) === 'pending'"
                [class.text-ink-400]="stepState(index) === 'pending'"
              >
                {{ stepState(index) === 'complete' ? '✓' : index + 1 }}
              </span>
              <div>
                <p class="font-medium text-ink-900">{{ item.label }}</p>
                <p class="text-xs text-ink-500">{{ item.description }}</p>
              </div>
            </li>
          }
        </ol>
      }
    </app-dialog>
  `,
})
export class TransactionDialogComponent {
  readonly open = input(false);
  readonly action = input<MilestoneAction | null>(null);
  readonly milestone = input<ProjectMilestone | null>(null);
  readonly step = input<TransactionStep>('preparing');
  readonly closed = output<void>();
  protected readonly steps = STEPS;
  protected readonly title = computed(() => {
    const action = this.action();
    return action ? MILESTONE_ACTION_LABELS[action] : 'Transação';
  });

  protected stepState(index: number): 'complete' | 'active' | 'pending' {
    const currentIndex = STEPS.findIndex((item) => item.id === this.step());
    if (index < currentIndex || this.step() === 'done') {
      return 'complete';
    }
    return index === currentIndex ? 'active' : 'pending';
  }
}
