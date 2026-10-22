import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { baseUnitsToBrl, baseUnitsToToken } from '../../../shared/utils/money';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { LedgerEntry } from '../models/finance.model';
import { FinanceApiService } from '../services/finance-api.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-balance-page',
  imports: [ButtonComponent, EmptyStateComponent, RouterLink, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-sm font-semibold text-brand-700">FINANCEIRO</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-[-0.035em] text-ink-900">
            Saldo e extrato
          </h1>
          <p class="mt-2 text-sm leading-6 text-ink-500">
            Acompanhe liberações, reservas e pagamentos do seu saldo.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <a
            class="inline-flex min-h-11 items-center justify-center rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
            routerLink="/withdrawals"
          >
            Histórico de saques
          </a>
          <a
            class="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-900"
            routerLink="/withdrawals/new"
          >
            Sacar via Pix
          </a>
        </div>
      </header>

      <section
        class="mt-8 overflow-hidden rounded-card bg-ink-900 p-6 text-white shadow-float sm:p-8"
        aria-label="Saldo disponível"
      >
        <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-sm font-medium text-ink-300">Saldo disponível</p>
            @if (loading() && entries().length === 0) {
              <app-skeleton className="mt-3 h-11 w-64 bg-white/15" />
            } @else {
              <p class="mt-2 text-4xl font-semibold tracking-[-0.04em] tabular-nums sm:text-5xl">
                {{ formatToken(balanceBaseUnits()) }}
              </p>
              @if (showFiatApproximation) {
                <p class="mt-2 text-sm text-ink-300">≈ {{ formatBrl(balanceBaseUnits()) }}</p>
              }
            }
          </div>
          <p class="max-w-xs text-sm leading-6 text-ink-300">
            Valores em {{ tokenSymbol }} liberados no ledger e ainda não reservados para saque.
          </p>
        </div>
      </section>

      <section class="mt-8" aria-live="polite">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold text-ink-900">Lançamentos</h2>
            <p class="mt-1 text-sm text-ink-500">Do mais recente para o mais antigo.</p>
          </div>
        </div>

        @if (loading() && entries().length === 0) {
          <div class="mt-4 space-y-3">
            @for (item of skeletonItems; track item) {
              <div class="rounded-card border border-ink-200 bg-white p-5">
                <app-skeleton className="h-5 w-48" />
                <app-skeleton className="mt-3 h-4 w-32" />
              </div>
            }
          </div>
        } @else if (error() && entries().length === 0) {
          <div class="mt-4">
            <app-empty-state
              title="Não foi possível carregar o extrato"
              description="Confira sua conexão e tente novamente."
            >
              <app-button variant="secondary" (pressed)="reload()">Tentar novamente</app-button>
            </app-empty-state>
          </div>
        } @else if (entries().length === 0) {
          <div class="mt-4">
            <app-empty-state
              title="Seu extrato ainda está vazio"
              description="Quando uma etapa for liberada, o lançamento aparecerá aqui."
            />
          </div>
        } @else {
          <div class="mt-4 overflow-hidden rounded-card border border-ink-200 bg-white">
            <ul class="divide-y divide-ink-100">
              @for (entry of entries(); track entry.id) {
                <li class="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
                  <div class="min-w-0">
                    <p class="font-medium text-ink-900">
                      {{ eventLabel(entry.transaction.eventType) }}
                    </p>
                    <p class="mt-1 text-xs text-ink-500">
                      {{ formatDate(entry.createdAt) }}
                    </p>
                  </div>
                  <p
                    class="shrink-0 text-sm font-semibold tabular-nums"
                    [class.text-brand-700]="entry.direction === 'credit'"
                    [class.text-ink-900]="entry.direction === 'debit'"
                  >
                    {{ entry.direction === 'credit' ? '+' : '−'
                    }}{{ formatToken(entry.amountBaseUnits) }}
                  </p>
                </li>
              }
            </ul>
          </div>

          @if (error()) {
            <p class="mt-4 text-center text-sm text-rose-700">
              Não foi possível carregar mais lançamentos.
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
export class BalancePageComponent {
  private readonly api = inject(FinanceApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tokenSymbol = environment.tokenSymbol;
  protected readonly showFiatApproximation = environment.tokenSymbol !== 'BRLP';
  protected readonly balanceBaseUnits = signal('0');
  protected readonly entries = signal<LedgerEntry[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly skeletonItems = [0, 1, 2];

  constructor() {
    this.loadPage(true);
  }

  protected formatToken(value: string): string {
    return baseUnitsToToken(value);
  }

  protected formatBrl(value: string): string {
    return baseUnitsToBrl(value);
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  protected eventLabel(eventType: string): string {
    return (
      {
        milestone_released: 'Etapa liberada',
        withdrawal_requested: 'Saque reservado',
        withdrawal_reversed: 'Saque devolvido',
      }[eventType] ?? 'Movimentação financeira'
    );
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
      .getLedger({
        limit: PAGE_SIZE,
        cursor: reset ? undefined : (this.nextCursor() ?? undefined),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.balanceBaseUnits.set(response.balanceBaseUnits);
          this.entries.update((entries) =>
            reset ? response.items : [...entries, ...response.items],
          );
          this.nextCursor.set(response.nextCursor);
        },
        error: () => this.error.set(true),
      });
  }
}
