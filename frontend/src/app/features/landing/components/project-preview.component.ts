import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';

import { MilestoneStatus } from '../../projects/config/status.config';
import { BrlpPipe } from '../../../shared/pipes/brlp.pipe';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { LandingIconComponent } from './landing-icon.component';

type DemoStep = 'submitted' | 'releasing' | 'released' | 'funded';

interface PreviewMilestone {
  id: string;
  title: string;
  amountBaseUnits: string;
  status: MilestoneStatus;
}

const DEMO_TIMELINE: ReadonlyArray<{ step: DemoStep; durationMs: number }> = [
  { step: 'submitted', durationMs: 2_800 },
  { step: 'releasing', durationMs: 1_100 },
  { step: 'released', durationMs: 3_600 },
  { step: 'funded', durationMs: 2_200 },
];

const MILESTONES: readonly PreviewMilestone[] = [
  {
    id: 'm1',
    title: 'Wireframes e layout',
    amountBaseUnits: '1000000000',
    status: 'released',
  },
  {
    id: 'm2',
    title: 'Desenvolvimento da home',
    amountBaseUnits: '1500000000',
    status: 'submitted',
  },
  {
    id: 'm3',
    title: 'Páginas de produto',
    amountBaseUnits: '1500000000',
    status: 'funded',
  },
  {
    id: 'm4',
    title: 'Deploy e ajustes finais',
    amountBaseUnits: '500000000',
    status: 'pending',
  },
];

const TOTAL = MILESTONES.reduce((sum, milestone) => sum + BigInt(milestone.amountBaseUnits), 0n);

const BAR_CLASS: Readonly<Record<MilestoneStatus, string>> = {
  pending: 'bg-ink-200',
  funded: 'bg-web3-500',
  submitted: 'bg-sky-500',
  released: 'bg-brand-500',
  refunded: 'bg-rose-400',
};

@Component({
  selector: 'app-project-preview',
  imports: [BrlpPipe, LandingIconComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <p class="sr-only">
      Exemplo de um projeto com quatro etapas. O valor fica protegido até a entrega ser aprovada.
    </p>

    <div class="relative" aria-hidden="true">
      <div
        class="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-brand-200/55 via-transparent to-web3-200/65 blur-2xl"
      ></div>
      <article class="overflow-hidden rounded-3xl bg-white shadow-float ring-1 ring-ink-200/80">
        <header class="border-b border-ink-100 p-5 sm:p-6">
          <div class="flex items-center justify-between gap-3 text-xs">
            <span class="inline-flex items-center gap-2 font-semibold text-brand-700">
              <span
                class="size-2 rounded-full bg-brand-500 shadow-[0_0_0_5px_var(--color-brand-50)]"
              ></span>
              Projeto ativo
            </span>
            <span class="text-ink-500">4 etapas</span>
          </div>

          <h2 class="mt-4 font-display text-xl font-semibold tracking-tight text-ink-950">
            Landing page para loja de roupas
          </h2>

          <div class="mt-4 flex items-center gap-3 text-sm">
            <span class="flex min-w-0 items-center gap-2">
              <span
                class="grid size-8 shrink-0 place-items-center rounded-full bg-ink-900 text-xs font-semibold text-white"
              >
                MC
              </span>
              <span class="min-w-0 leading-tight">
                <span class="block truncate text-ink-900">Mariana Costa</span>
                <span class="block text-xs text-ink-500">Cliente</span>
              </span>
            </span>
            <app-landing-icon class="size-4 text-ink-400" name="arrow" />
            <span class="flex min-w-0 items-center gap-2">
              <span
                class="grid size-8 shrink-0 place-items-center rounded-full bg-ink-200 text-xs font-semibold text-ink-800"
              >
                RS
              </span>
              <span class="min-w-0 leading-tight">
                <span class="block truncate text-ink-900">Rafael Souza</span>
                <span class="block text-xs text-ink-500">Freelancer</span>
              </span>
            </span>
          </div>
        </header>

        <div class="border-b border-ink-100 p-5 sm:p-6">
          <dl class="grid grid-cols-2 gap-4">
            <div>
              <dt class="flex items-center gap-1.5 text-xs text-ink-500">
                <app-landing-icon class="size-3.5 text-web3-700" name="lock" />
                Protegido
              </dt>
              <dd
                class="mt-1 font-display text-xl font-semibold tracking-tight text-ink-950 tabular-nums sm:text-2xl"
              >
                {{ locked().toString() | brlp }}
              </dd>
            </div>
            <div>
              <dt class="flex items-center gap-1.5 text-xs text-ink-500">
                <app-landing-icon class="size-3.5 text-brand-600" name="check" />
                Liberado
              </dt>
              <dd
                class="mt-1 font-display text-xl font-semibold tracking-tight text-ink-950 tabular-nums sm:text-2xl"
              >
                {{ released().toString() | brlp }}
              </dd>
            </div>
          </dl>

          <div class="mt-5 flex h-2 gap-1">
            @for (milestone of milestones(); track milestone.id) {
              <span
                class="h-full basis-0 rounded-full transition-colors duration-500"
                [class]="milestone.barClass"
                [style.flex-grow]="milestone.weight"
              ></span>
            }
          </div>
          <div class="mt-2 flex justify-between gap-3 text-xs text-ink-500">
            <span>{{ releasedCount() }} de 4 liberadas</span>
            <span class="tabular-nums">Total {{ total.toString() | brlp }}</span>
          </div>
        </div>

        <ol class="divide-y divide-ink-100">
          @for (milestone of milestones(); track milestone.id) {
            <li
              class="flex items-start gap-3 px-5 py-3.5 transition-colors duration-500 sm:px-6"
              [class]="milestone.highlight"
            >
              <span
                class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full"
                [class.bg-brand-100]="milestone.status === 'released'"
                [class.text-brand-700]="milestone.status === 'released'"
                [class.bg-web3-100]="milestone.status === 'funded'"
                [class.text-web3-700]="milestone.status === 'funded'"
                [class.bg-sky-100]="milestone.status === 'submitted'"
                [class.text-sky-700]="milestone.status === 'submitted'"
                [class.bg-ink-100]="milestone.status === 'pending'"
                [class.text-ink-500]="milestone.status === 'pending'"
              >
                <app-landing-icon
                  class="size-4"
                  [name]="
                    milestone.status === 'funded'
                      ? 'lock'
                      : milestone.status === 'released'
                        ? 'check'
                        : 'package'
                  "
                />
              </span>

              <div class="min-w-0 flex-1">
                <div class="flex min-h-7 items-center justify-between gap-2">
                  <p class="truncate text-sm font-medium text-ink-900">{{ milestone.title }}</p>
                  <app-status-badge [status]="milestone.status" />
                </div>
                <p class="text-sm text-ink-500 tabular-nums">
                  {{ milestone.amountBaseUnits | brlp }}
                </p>

                @if (milestone.showApprove) {
                  <span
                    class="mt-2.5 inline-flex h-8 items-center rounded-full bg-brand-700 px-3.5 text-xs font-semibold text-white transition duration-200"
                    [class.scale-95]="step() === 'releasing'"
                    [class.opacity-75]="step() === 'releasing'"
                  >
                    {{ step() === 'releasing' ? 'Liberando…' : 'Aprovar e liberar' }}
                  </span>
                }
              </div>
            </li>
          }
        </ol>
      </article>

      <div
        class="absolute right-4 -bottom-8 left-4 transition duration-500 ease-out sm:right-auto sm:-left-6 sm:w-80"
        [class.translate-y-0]="toastVisible()"
        [class.opacity-100]="toastVisible()"
        [class.translate-y-3]="!toastVisible()"
        [class.opacity-0]="!toastVisible()"
      >
        <div class="flex items-start gap-3 rounded-2xl bg-ink-950 p-4 text-white shadow-float">
          <span
            class="grid size-8 shrink-0 place-items-center rounded-full bg-brand-500/20 text-brand-300"
          >
            <app-landing-icon class="size-4" name="check" />
          </span>
          <div class="min-w-0">
            <p class="text-sm font-semibold">Pagamento liberado</p>
            <p class="text-sm text-ink-300">R$ 1.500,00 para Rafael Souza</p>
            <p class="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-web3-300">
              Transação registrada
              <app-landing-icon class="size-3" name="external" />
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ProjectPreviewComponent {
  protected readonly step = signal<DemoStep>('submitted');
  protected readonly total = TOTAL;

  protected readonly milestones = computed(() => {
    const step = this.step();
    const demoStatus: MilestoneStatus = step === 'releasing' ? 'submitted' : step;

    return MILESTONES.map((milestone) => {
      const isDemo = milestone.id === 'm2';
      const status = isDemo ? demoStatus : milestone.status;
      return {
        ...milestone,
        status,
        barClass: BAR_CLASS[status],
        weight: ((BigInt(milestone.amountBaseUnits) * 1_000n) / TOTAL).toString(),
        showApprove: isDemo && status === 'submitted',
        highlight:
          isDemo && status === 'submitted'
            ? 'bg-amber-50/60'
            : isDemo && status === 'released'
              ? 'bg-brand-50/80'
              : '',
      };
    });
  });

  protected readonly locked = computed(() =>
    this.milestones()
      .filter((milestone) => milestone.status === 'funded' || milestone.status === 'submitted')
      .reduce((sum, milestone) => sum + BigInt(milestone.amountBaseUnits), 0n),
  );

  protected readonly released = computed(() =>
    this.milestones()
      .filter((milestone) => milestone.status === 'released')
      .reduce((sum, milestone) => sum + BigInt(milestone.amountBaseUnits), 0n),
  );

  protected readonly releasedCount = computed(
    () => this.milestones().filter((milestone) => milestone.status === 'released').length,
  );

  protected readonly toastVisible = computed(() => this.step() === 'released');

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      let index = 0;
      let timer: ReturnType<typeof setTimeout>;
      const scheduleNext = (): void => {
        timer = setTimeout(() => {
          index = (index + 1) % DEMO_TIMELINE.length;
          this.step.set(DEMO_TIMELINE[index].step);
          scheduleNext();
        }, DEMO_TIMELINE[index].durationMs);
      };

      scheduleNext();
      destroyRef.onDestroy(() => clearTimeout(timer));
    });
  }
}
