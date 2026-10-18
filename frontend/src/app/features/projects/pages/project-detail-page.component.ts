import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of, switchMap, timer } from 'rxjs';

import { ToastService } from '../../../core/services/toast.service';
import { BrlpPipe } from '../../../shared/pipes/brlp.pipe';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { DialogComponent } from '../../../shared/ui/dialog/dialog.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import {
  MilestoneActionRequest,
  ProjectTimelineComponent,
} from '../components/project-timeline.component';
import { TransactionDialogComponent } from '../components/transaction-dialog.component';
import { ProjectDetail, ProjectMilestone } from '../models/project.model';
import { ProjectsApiService } from '../services/projects-api.service';
import { TransactionFlowService } from '../services/transaction-flow.service';
import { MILESTONE_ACTION_LABELS } from '../utils/milestone-actions';

interface ConfirmationState {
  kind: 'delete' | 'release' | 'refund';
  milestone: ProjectMilestone | null;
}

@Component({
  selector: 'app-project-detail-page',
  imports: [
    BrlpPipe,
    ButtonComponent,
    DialogComponent,
    EmptyStateComponent,
    FormFieldComponent,
    ProjectTimelineComponent,
    ReactiveFormsModule,
    RouterLink,
    SkeletonComponent,
    StatusBadgeComponent,
    TransactionDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <a
        class="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900"
        routerLink="/projects"
        [queryParams]="{ role: project()?.role ?? 'client' }"
      >
        <span aria-hidden="true">←</span>
        Voltar aos projetos
      </a>

      @if (loading() && !project()) {
        <div class="mt-7 space-y-5">
          <div class="rounded-card border border-ink-200 bg-white p-6">
            <app-skeleton className="h-4 w-28" />
            <app-skeleton className="mt-4 h-9 w-3/4" />
            <app-skeleton className="mt-3 h-5 w-1/2" />
            <app-skeleton className="mt-8 h-2 w-full rounded-full" />
          </div>
          <app-skeleton className="h-48 w-full rounded-card" />
          <app-skeleton className="h-48 w-full rounded-card" />
        </div>
      } @else if (error() && !project()) {
        <div class="mt-7">
          <app-empty-state
            title="Não foi possível abrir o projeto"
            description="Confira sua conexão ou volte para a lista de projetos."
          >
            <app-button variant="secondary" (pressed)="loadProject()">Tentar novamente</app-button>
          </app-empty-state>
        </div>
      } @else if (project(); as currentProject) {
        <header class="mt-7 rounded-card border border-ink-200 bg-white p-5 sm:p-7">
          <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-3">
                <app-status-badge [status]="currentProject.status" />
                <span class="text-xs font-medium text-ink-400">
                  Você está como {{ currentProject.role === 'client' ? 'cliente' : 'freelancer' }}
                </span>
              </div>
              <h1 class="mt-4 text-3xl font-semibold tracking-[-0.035em] text-ink-900 sm:text-4xl">
                {{ currentProject.title }}
              </h1>
              @if (currentProject.description) {
                <p class="mt-3 max-w-3xl text-sm leading-6 text-ink-500 sm:text-base">
                  {{ currentProject.description }}
                </p>
              }
            </div>

            @if (currentProject.status === 'draft' && currentProject.role === 'client') {
              <div class="flex shrink-0 flex-wrap gap-2">
                <app-button variant="secondary" (pressed)="openEdit()">Editar</app-button>
                <app-button variant="secondary" (pressed)="askDelete()">Excluir</app-button>
                <app-button
                  loadingLabel="Ativando..."
                  [loading]="headerActionLoading()"
                  (pressed)="activate()"
                >
                  Ativar projeto
                </app-button>
              </div>
            }
          </div>

          <dl class="mt-7 grid gap-4 border-t border-ink-100 pt-6 sm:grid-cols-3">
            <div>
              <dt class="text-xs text-ink-500">Cliente</dt>
              <dd class="mt-1 font-semibold text-ink-900">{{ currentProject.client.name }}</dd>
              <dd class="text-xs text-ink-400">{{ currentProject.client.email }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-500">Freelancer</dt>
              <dd class="mt-1 font-semibold text-ink-900">{{ currentProject.freelancer.name }}</dd>
              <dd class="text-xs text-ink-400">{{ currentProject.freelancer.email }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-500">Valor total</dt>
              <dd class="mt-1 text-xl font-semibold text-ink-900 tabular-nums">
                {{ currentProject.summary.totalAmountBaseUnits | brlp }}
              </dd>
            </div>
          </dl>

          <div class="mt-6">
            <div class="flex items-center justify-between gap-4 text-xs font-medium text-ink-500">
              <span>Progresso das etapas</span>
              <span class="tabular-nums">
                {{ currentProject.summary.releasedMilestones }} de
                {{ currentProject.summary.totalMilestones }} liberadas
              </span>
            </div>
            <div
              class="mt-2 h-2 overflow-hidden rounded-full bg-ink-100"
              role="progressbar"
              aria-label="Progresso das etapas"
              aria-valuemin="0"
              aria-valuemax="100"
              [attr.aria-valuenow]="progressPercentage()"
            >
              <div
                class="h-full rounded-full bg-brand-500 transition-[width] duration-500"
                [style.width.%]="progressPercentage()"
              ></div>
            </div>
          </div>
        </header>

        <div class="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <section>
            <div class="mb-5">
              <p class="text-sm font-semibold text-brand-700">CRONOGRAMA</p>
              <h2 class="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
                Etapas e pagamentos
              </h2>
            </div>
            <app-project-timeline
              [highlightedMilestoneId]="highlightedMilestoneId()"
              [milestones]="currentProject.milestones"
              [role]="currentProject.role"
              (actionRequested)="requestMilestoneAction($event)"
            />
          </section>

          <aside class="h-fit rounded-card border border-ink-200 bg-white p-5 xl:sticky xl:top-8">
            <p class="text-sm font-semibold text-ink-900">Resumo financeiro</p>
            <p class="mt-4 text-xs text-ink-500">Total acordado</p>
            <p class="mt-1 text-2xl font-semibold tracking-tight text-ink-900 tabular-nums">
              {{ currentProject.summary.totalAmountBaseUnits | brlp }}
            </p>
            <div class="mt-5 space-y-3 border-t border-ink-100 pt-5 text-sm">
              <div class="flex justify-between gap-3">
                <span class="text-ink-500">Etapas</span>
                <span class="font-medium text-ink-900">{{
                  currentProject.summary.totalMilestones
                }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-ink-500">Liberadas</span>
                <span class="font-medium text-ink-900">{{
                  currentProject.summary.releasedMilestones
                }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-ink-500">Em aberto</span>
                <span class="font-medium text-ink-900">
                  {{
                    currentProject.summary.totalMilestones -
                      currentProject.summary.releasedMilestones
                  }}
                </span>
              </div>
            </div>
          </aside>
        </div>
      }
    </div>

    <app-dialog
      [open]="confirmation() !== null"
      [title]="confirmationTitle()"
      (closed)="confirmation.set(null)"
    >
      @if (confirmation(); as currentConfirmation) {
        @if (currentConfirmation.kind === 'delete') {
          <p>O projeto e suas etapas serão removidos. Esta ação não pode ser desfeita.</p>
        } @else if (currentConfirmation.milestone; as milestone) {
          <p>
            Você está prestes a
            {{ currentConfirmation.kind === 'release' ? 'liberar' : 'reembolsar' }}
            <strong class="text-ink-900">{{ milestone.amountBaseUnits | brlp }}</strong>
            {{ currentConfirmation.kind === 'release' ? 'para' : 'no acordo com' }}
            <strong class="text-ink-900">{{ otherPartyName() }}</strong
            >.
          </p>
        }
        <div class="mt-6 flex justify-end gap-2">
          <app-button variant="secondary" (pressed)="confirmation.set(null)">Cancelar</app-button>
          <app-button [loading]="headerActionLoading()" (pressed)="confirmPendingAction()">
            Confirmar
          </app-button>
        </div>
      }
    </app-dialog>

    <app-dialog [open]="editOpen()" title="Editar projeto" (closed)="editOpen.set(false)">
      <form class="space-y-4" [formGroup]="editForm" (ngSubmit)="saveEdit()">
        <app-form-field label="Título" [control]="editForm.controls.title" />
        <label class="block">
          <span class="mb-2 block text-sm font-medium text-ink-700">Descrição</span>
          <textarea
            class="min-h-28 w-full rounded-lg border border-ink-200 bg-white px-3.5 py-3 text-base text-ink-900 focus:border-brand-500 focus:ring-3 focus:ring-brand-100 focus:outline-none"
            formControlName="description"
            maxlength="5000"
          ></textarea>
        </label>
        <div class="flex justify-end gap-2 pt-2">
          <app-button variant="secondary" (pressed)="editOpen.set(false)">Cancelar</app-button>
          <app-button
            type="submit"
            loadingLabel="Salvando..."
            [disabled]="editForm.invalid"
            [loading]="headerActionLoading()"
          >
            Salvar alterações
          </app-button>
        </div>
      </form>
    </app-dialog>

    <app-transaction-dialog
      [action]="transactionRequest()?.action ?? null"
      [milestone]="transactionRequest()?.milestone ?? null"
      [open]="transactionRequest() !== null"
      [step]="transactionStep()"
      (closed)="closeFinishedTransaction()"
    />
  `,
})
export class ProjectDetailPageComponent {
  private readonly api = inject(ProjectsApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly transactionFlow = inject(TransactionFlowService);
  private readonly projectId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly project = signal<ProjectDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly headerActionLoading = signal(false);
  readonly confirmation = signal<ConfirmationState | null>(null);
  readonly editOpen = signal(false);
  readonly transactionRequest = signal<MilestoneActionRequest | null>(null);
  readonly transactionStep = this.transactionFlow.step;
  readonly highlightedMilestoneId = signal<string | null>(null);
  readonly editForm = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(160)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(5000)],
    }),
  });

  readonly progressPercentage = computed(() => {
    const summary = this.project()?.summary;
    return !summary || summary.totalMilestones === 0
      ? 0
      : Math.round((summary.releasedMilestones * 100) / summary.totalMilestones);
  });
  readonly otherPartyName = computed(() => {
    const project = this.project();
    if (!project) {
      return '';
    }
    return project.role === 'client' ? project.freelancer.name : project.client.name;
  });
  readonly confirmationTitle = computed(() => {
    const confirmation = this.confirmation();
    if (!confirmation || confirmation.kind === 'delete') {
      return 'Excluir projeto?';
    }
    return confirmation.kind === 'release' ? 'Liberar pagamento?' : 'Confirmar reembolso?';
  });

  constructor() {
    this.loadProject(undefined, undefined, true);
  }

  protected loadProject(
    highlightedMilestoneId?: string,
    afterLoad?: () => void,
    syncOnOpen = false,
  ): void {
    this.loading.set(true);
    this.error.set(false);
    this.api
      .getById(this.projectId)
      .pipe(
        switchMap((project) => {
          if (!syncOnOpen) return of(project);
          const active = project.milestones.filter(
            (milestone) => milestone.status === 'funded' || milestone.status === 'submitted',
          );
          if (!active.length) return of(project);
          let syncFailed = false;
          return forkJoin(
            active.map((milestone) =>
              this.api.syncMilestone(milestone.id).pipe(
                catchError(() => {
                  syncFailed = true;
                  return of(null);
                }),
              ),
            ),
          ).pipe(
            switchMap((results) => {
              if (syncFailed) {
                this.toast.show('Algumas etapas não puderam ser sincronizadas', {
                  tone: 'error',
                });
              }
              return results.some(
                (result, index) => result && result.status !== active[index].status,
              )
                ? this.api.getById(this.projectId)
                : of(project);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (project) => {
          this.project.set(project);
          if (highlightedMilestoneId) {
            this.highlightedMilestoneId.set(highlightedMilestoneId);
            timer(1800)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe(() => this.highlightedMilestoneId.set(null));
          }
          afterLoad?.();
        },
        error: () => this.error.set(true),
      });
  }

  protected activate(): void {
    if (this.headerActionLoading()) {
      return;
    }
    this.headerActionLoading.set(true);
    this.api
      .activate(this.projectId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.headerActionLoading.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.show('Projeto ativado', { tone: 'success' });
          this.loadProject();
        },
        error: () => undefined,
      });
  }

  protected openEdit(): void {
    const project = this.project();
    if (!project) {
      return;
    }
    this.editForm.setValue({
      title: project.title,
      description: project.description ?? '',
    });
    this.editOpen.set(true);
  }

  protected saveEdit(): void {
    if (this.editForm.invalid || this.headerActionLoading()) {
      return;
    }
    const value = this.editForm.getRawValue();
    this.headerActionLoading.set(true);
    this.api
      .update(this.projectId, {
        title: value.title.trim(),
        description: value.description.trim(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.headerActionLoading.set(false)),
      )
      .subscribe({
        next: () => {
          this.editOpen.set(false);
          this.toast.show('Projeto atualizado', { tone: 'success' });
          this.loadProject();
        },
        error: () => undefined,
      });
  }

  protected askDelete(): void {
    this.confirmation.set({ kind: 'delete', milestone: null });
  }

  protected requestMilestoneAction(request: MilestoneActionRequest): void {
    if (request.action === 'release' || request.action === 'refund') {
      this.confirmation.set({
        kind: request.action,
        milestone: request.milestone,
      });
      return;
    }
    this.beginTransaction(request);
  }

  protected confirmPendingAction(): void {
    const confirmation = this.confirmation();
    if (!confirmation) {
      return;
    }
    if (confirmation.kind === 'delete') {
      this.deleteProject();
      return;
    }
    if (confirmation.milestone) {
      this.beginTransaction({
        action: confirmation.kind,
        milestone: confirmation.milestone,
      });
    }
  }

  protected closeFinishedTransaction(): void {
    if (this.transactionStep() === 'done') {
      this.transactionRequest.set(null);
    }
  }

  private deleteProject(): void {
    if (this.headerActionLoading()) {
      return;
    }
    this.headerActionLoading.set(true);
    this.api
      .delete(this.projectId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.headerActionLoading.set(false)),
      )
      .subscribe({
        next: () => {
          this.confirmation.set(null);
          this.toast.show('Projeto excluído', { tone: 'success' });
          void this.router.navigate(['/projects'], {
            queryParams: { role: 'client' },
          });
        },
        error: () => undefined,
      });
  }

  private beginTransaction(request: MilestoneActionRequest): void {
    if (this.transactionRequest()) {
      return;
    }
    this.confirmation.set(null);
    this.transactionRequest.set(request);
    void this.transactionFlow
      .execute(request.milestone, request.action)
      .then(() => {
        this.loadProject(request.milestone.id, () => {
          this.toast.show('Etapa atualizada', {
            description: MILESTONE_ACTION_LABELS[request.action],
            tone: 'success',
          });
          timer(1000)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.transactionRequest.set(null));
        });
      })
      .catch(() => this.transactionRequest.set(null));
  }
}
