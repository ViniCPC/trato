import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ProjectCardComponent } from '../projects/components/project-card.component';
import { ProjectListItem, ProjectRole } from '../projects/models/project.model';
import { ProjectsApiService } from '../projects/services/projects-api.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';

const PAGE_SIZE = 8;

@Component({
  selector: 'app-dashboard-page',
  imports: [
    ButtonComponent,
    EmptyStateComponent,
    ProjectCardComponent,
    RouterLink,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <header class="flex items-end justify-between gap-6">
        <div>
          <p class="text-sm font-semibold text-brand-700">VISÃO GERAL</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-[-0.035em] text-ink-900">
            Seus projetos
          </h1>
          <p class="mt-2 text-sm leading-6 text-ink-500">
            Acompanhe acordos em que você contrata e em que você entrega.
          </p>
        </div>
        @if (!loading() && projects().length > 0) {
          <app-button class="hidden sm:block" (pressed)="createProject()">
            Novo projeto
          </app-button>
        }
      </header>

      <nav
        class="mt-8 flex w-full gap-1 rounded-xl border border-ink-200 bg-white p-1 sm:w-fit"
        aria-label="Papel nos projetos"
      >
        <a
          class="flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition sm:flex-none"
          [class.bg-ink-900]="role() === 'client'"
          [class.text-white]="role() === 'client'"
          [class.text-ink-500]="role() !== 'client'"
          [routerLink]="[]"
          [queryParams]="{ role: 'client' }"
        >
          Como cliente
        </a>
        <a
          class="flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition sm:flex-none"
          [class.bg-ink-900]="role() === 'freelancer'"
          [class.text-white]="role() === 'freelancer'"
          [class.text-ink-500]="role() !== 'freelancer'"
          [routerLink]="[]"
          [queryParams]="{ role: 'freelancer' }"
        >
          Como freelancer
        </a>
      </nav>

      <section class="mt-6" aria-live="polite">
        @if (loading() && projects().length === 0) {
          <div class="grid gap-4 md:grid-cols-2">
            @for (item of skeletonItems; track item) {
              <div class="rounded-card border border-ink-200 bg-white p-6">
                <div class="flex justify-between gap-4">
                  <div class="w-2/3 space-y-3">
                    <app-skeleton className="h-3 w-28" />
                    <app-skeleton className="h-6 w-full" />
                  </div>
                  <app-skeleton className="h-7 w-24 rounded-full" />
                </div>
                <div class="mt-8 flex justify-between gap-8">
                  <app-skeleton className="h-9 w-32" />
                  <app-skeleton className="h-4 w-36" />
                </div>
                <app-skeleton className="mt-4 h-2 w-full rounded-full" />
              </div>
            }
          </div>
        } @else if (error() && projects().length === 0) {
          <app-empty-state
            title="Não foi possível carregar os projetos"
            description="Confira sua conexão e tente novamente. Seus dados continuam seguros."
          >
            <app-button variant="secondary" (pressed)="retry()">Tentar de novo</app-button>
          </app-empty-state>
        } @else if (projects().length === 0) {
          <app-empty-state
            title="Crie seu primeiro projeto"
            description="Organize escopo, etapas e valores antes de o trabalho começar."
          >
            <app-button (pressed)="createProject()">Novo projeto</app-button>
          </app-empty-state>
        } @else {
          <div class="grid gap-4 md:grid-cols-2">
            @for (project of projects(); track project.id) {
              <app-project-card [project]="project" />
            }
          </div>

          @if (error()) {
            <div
              class="mt-5 flex flex-col items-center justify-between gap-3 rounded-card border border-rose-200 bg-rose-50 p-4 sm:flex-row"
            >
              <p class="text-sm text-rose-700">Não foi possível carregar mais projetos.</p>
              <app-button variant="secondary" (pressed)="loadMore()">Tentar novamente</app-button>
            </div>
          } @else if (hasMore()) {
            <div class="mt-7 flex justify-center">
              <app-button
                variant="secondary"
                loadingLabel="Carregando..."
                [loading]="loading()"
                (pressed)="loadMore()"
              >
                Carregar mais
              </app-button>
            </div>
          }
        }
      </section>
    </div>
  `,
})
export class DashboardPageComponent {
  private readonly api = inject(ProjectsApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private requestId = 0;

  readonly role = signal<ProjectRole>('client');
  readonly projects = signal<ProjectListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly hasMore = signal(false);
  readonly skeletonItems = [0, 1, 2, 3];

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const requestedRole = params.get('role');
      if (requestedRole !== 'client' && requestedRole !== 'freelancer') {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { role: 'client' },
          replaceUrl: true,
        });
        return;
      }

      this.role.set(requestedRole);
      this.loadPage(true);
    });
  }

  protected retry(): void {
    this.loadPage(true);
  }

  protected loadMore(): void {
    this.loadPage(false);
  }

  protected createProject(): void {
    void this.router.navigate(['/projects/new']);
  }

  private loadPage(reset: boolean): void {
    if (this.loading() && !reset) {
      return;
    }

    const activeRequest = ++this.requestId;
    const offset = reset ? 0 : this.projects().length;
    this.loading.set(true);
    this.error.set(null);

    this.api
      .list(this.role(), { limit: PAGE_SIZE, offset })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (activeRequest === this.requestId) {
            this.loading.set(false);
          }
        }),
      )
      .subscribe({
        next: (response) => {
          if (activeRequest !== this.requestId) {
            return;
          }
          this.projects.update((projects) =>
            reset ? response.items : [...projects, ...response.items],
          );
          this.hasMore.set(response.hasMore);
        },
        error: () => {
          if (activeRequest === this.requestId) {
            this.error.set('Não foi possível carregar os projetos.');
          }
        },
      });
  }
}
