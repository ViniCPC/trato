import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { baseUnitsToToken, minorUnitsToBrl } from '../../../shared/utils/money';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { WITHDRAWAL_STATUS_CONFIG } from '../config/withdrawal-status.config';
import { Withdrawal, WithdrawalStatus } from '../models/finance.model';
import { FinanceApiService } from '../services/finance-api.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-withdrawal-history-page',
  imports: [ButtonComponent, EmptyStateComponent, RouterLink, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <a
            class="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900"
            routerLink="/balance"
          >
            <span aria-hidden="true">←</span>
            Saldo e extrato
          </a>
          <p class="mt-6 text-sm font-semibold text-brand-700">SAQUES</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-[-0.035em] text-ink-900">
            Histórico de saques
          </h1>
          <p class="mt-2 text-sm leading-6 text-ink-500">
            Consulte cotações, pagamentos e valores devolvidos.
          </p>
        </div>
        <a
          class="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-900"
          routerLink="/withdrawals/new"
        >
          Novo saque
        </a>
      </header>

      <section class="mt-8" aria-live="polite">
        @if (loading() && withdrawals().length === 0) {
          <div class="space-y-3">
            @for (item of skeletonItems; track item) {
              <div class="rounded-card border border-ink-200 bg-white p-5">
                <app-skeleton className="h-5 w-40" />
                <app-skeleton className="mt-3 h-4 w-56" />
              </div>
            }
          </div>
        } @else if (error() && withdrawals().length === 0) {
          <app-empty-state
            title="Não foi possível carregar os saques"
            description="Confira sua conexão e tente novamente."
          >
            <app-button variant="secondary" (pressed)="reload()">Tentar novamente</app-button>
          </app-empty-state>
        } @else if (withdrawals().length === 0) {
          <app-empty-state
            title="Nenhum saque solicitado"
            description="Quando você criar uma cotação, ela aparecerá aqui."
          >
            <a
              class="inline-flex min-h-11 items-center rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white"
              routerLink="/withdrawals/new"
            >
              Sacar via Pix
            </a>
          </app-empty-state>
        } @else {
          <div class="space-y-3">
            @for (withdrawal of withdrawals(); track withdrawal.id) {
              <a
                class="flex flex-col gap-4 rounded-card border border-ink-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                [routerLink]="['/withdrawals', withdrawal.id]"
              >
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-lg font-semibold text-ink-900 tabular-nums">
                      {{ formatToken(withdrawal.amountBaseUnits) }}
                    </p>
                    <span
                      class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                      [class]="statusConfig(withdrawal.status).classes"
                    >
                      {{ statusConfig(withdrawal.status).label }}
                    </span>
                  </div>
                  <p class="mt-1 text-sm text-ink-500">
                    Pix de {{ formatFiat(withdrawal.fiatAmountMinor) }} ·
                    {{ formatDate(withdrawal.createdAt) }}
                  </p>
                </div>
                <span class="text-sm font-semibold text-brand-700">Ver detalhes →</span>
              </a>
            }
          </div>

          @if (error()) {
            <p class="mt-4 text-center text-sm text-rose-700">
              Não foi possível carregar mais saques.
            </p>
          }
          @if (nextCursor()) {
            <div class="mt-6 flex justify-center">
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
export class WithdrawalHistoryPageComponent {
  private readonly api = inject(FinanceApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly withdrawals = signal<Withdrawal[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly skeletonItems = [0, 1, 2];

  constructor() {
    this.loadPage(true);
  }

  protected statusConfig(status: WithdrawalStatus) {
    return WITHDRAWAL_STATUS_CONFIG[status];
  }

  protected formatToken(value: string): string {
    return baseUnitsToToken(value);
  }

  protected formatFiat(value: string): string {
    return minorUnitsToBrl(value);
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value));
  }

  protected reload(): void {
    this.loadPage(true);
  }

  protected loadMore(): void {
    if (this.nextCursor()) this.loadPage(false);
  }

  private loadPage(reset: boolean): void {
    if (this.loading() && !reset) return;
    this.loading.set(true);
    this.error.set(false);
    this.api
      .listWithdrawals({
        limit: PAGE_SIZE,
        cursor: reset ? undefined : (this.nextCursor() ?? undefined),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.withdrawals.update((withdrawals) =>
            reset ? response.items : [...withdrawals, ...response.items],
          );
          this.nextCursor.set(response.nextCursor);
        },
        error: () => this.error.set(true),
      });
  }
}
