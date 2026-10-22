import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { baseUnitsToToken, minorUnitsToBrl } from '../../../shared/utils/money';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { WITHDRAWAL_STATUS_CONFIG } from '../config/withdrawal-status.config';
import {
  TERMINAL_WITHDRAWAL_STATUSES,
  Withdrawal,
  WithdrawalStatus,
} from '../models/finance.model';
import { FinanceApiService } from '../services/finance-api.service';

@Component({
  selector: 'app-withdrawal-status-page',
  imports: [ButtonComponent, RouterLink, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <a
        class="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900"
        routerLink="/withdrawals"
      >
        <span aria-hidden="true">←</span>
        Histórico de saques
      </a>

      @if (loading()) {
        <section class="mt-6 rounded-card border border-ink-200 bg-white p-7">
          <app-skeleton className="h-6 w-40" />
          <app-skeleton className="mt-5 h-12 w-64" />
          <app-skeleton className="mt-8 h-24 w-full" />
        </section>
      } @else if (withdrawal(); as current) {
        <section class="mt-6 overflow-hidden rounded-card border border-ink-200 bg-white">
          <div class="p-6 sm:p-8">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-sm font-semibold text-brand-700">STATUS DO SAQUE</p>
                <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink-900">
                  {{ formatToken(current.amountBaseUnits) }}
                </h1>
                <p class="mt-2 text-sm text-ink-500">
                  Pix de {{ formatFiat(current.fiatAmountMinor) }}
                </p>
              </div>
              <span
                class="inline-flex rounded-full px-3 py-1.5 text-xs font-semibold"
                [class]="statusConfig(current.status).classes"
              >
                {{ statusConfig(current.status).label }}
              </span>
            </div>

            <div class="mt-8 rounded-xl bg-ink-50 p-5">
              <div class="flex gap-4">
                <span
                  class="grid size-10 shrink-0 place-items-center rounded-full text-lg"
                  [class.bg-brand-100]="current.status === 'paid'"
                  [class.text-brand-800]="current.status === 'paid'"
                  [class.bg-sky-100]="isInProgress(current.status)"
                  [class.text-sky-700]="isInProgress(current.status)"
                  [class.bg-rose-100]="isUnsuccessful(current.status)"
                  [class.text-rose-700]="isUnsuccessful(current.status)"
                >
                  {{ current.status === 'paid' ? '✓' : isInProgress(current.status) ? '↻' : '!' }}
                </span>
                <div>
                  <p class="font-semibold text-ink-900">
                    {{ statusConfig(current.status).label }}
                  </p>
                  <p class="mt-1 text-sm leading-6 text-ink-500">
                    {{ current.failureReason || statusConfig(current.status).description }}
                  </p>
                  @if (isInProgress(current.status)) {
                    <p class="mt-2 text-xs font-medium text-sky-700">
                      {{ syncing() ? 'Sincronizando agora…' : 'A atualização é automática.' }}
                    </p>
                  }
                </div>
              </div>
            </div>

            <dl class="mt-7 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt class="text-ink-500">Chave Pix</dt>
                <dd class="mt-1 font-medium break-all text-ink-900">{{ current.pixKey }}</dd>
              </div>
              <div>
                <dt class="text-ink-500">Solicitado em</dt>
                <dd class="mt-1 font-medium text-ink-900">{{ formatDate(current.createdAt) }}</dd>
              </div>
              @if (current.txSignature) {
                <div class="sm:col-span-2">
                  <dt class="text-ink-500">Assinatura Solana</dt>
                  <dd class="mt-1 truncate font-mono text-xs text-ink-900">
                    {{ current.txSignature }}
                  </dd>
                </div>
              }
            </dl>
          </div>

          <div class="flex flex-wrap gap-3 border-t border-ink-100 bg-ink-50 px-6 py-4 sm:px-8">
            <a
              class="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white"
              routerLink="/balance"
            >
              Ver saldo e extrato
            </a>
            @if (isInProgress(current.status)) {
              <app-button
                variant="secondary"
                [loading]="syncing()"
                loadingLabel="Sincronizando..."
                (pressed)="syncNow()"
              >
                Atualizar agora
              </app-button>
            }
          </div>
        </section>
      } @else {
        <section class="mt-6 rounded-card border border-rose-200 bg-rose-50 p-7">
          <h1 class="text-xl font-semibold text-rose-900">Saque não encontrado</h1>
          <p class="mt-2 text-sm text-rose-700">Não foi possível carregar este saque.</p>
        </section>
      }
    </div>
  `,
})
export class WithdrawalStatusPageComponent {
  private readonly api = inject(FinanceApiService);
  private readonly withdrawalId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  private destroyed = false;
  private pollTimer: number | null = null;
  private pollAttempt = 0;

  protected readonly withdrawal = signal<Withdrawal | null>(null);
  protected readonly loading = signal(true);
  protected readonly syncing = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      if (this.pollTimer !== null) window.clearTimeout(this.pollTimer);
    });
    void this.load();
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
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  protected isInProgress(status: WithdrawalStatus): boolean {
    return status === 'submitted' || status === 'processing';
  }

  protected isUnsuccessful(status: WithdrawalStatus): boolean {
    return status === 'failed' || status === 'expired' || status === 'cancelled';
  }

  protected syncNow(): void {
    if (!this.syncing()) void this.sync();
  }

  private async load(): Promise<void> {
    try {
      const withdrawal = await firstValueFrom(this.api.getWithdrawal(this.withdrawalId));
      this.withdrawal.set(withdrawal);
      this.scheduleNext(withdrawal.status);
    } catch {
      this.withdrawal.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  private async sync(): Promise<void> {
    if (this.destroyed || this.syncing()) return;
    this.syncing.set(true);
    try {
      const withdrawal = await firstValueFrom(this.api.sync(this.withdrawalId));
      this.withdrawal.set(withdrawal);
      this.scheduleNext(withdrawal.status);
    } catch {
      this.scheduleNext(this.withdrawal()?.status ?? 'submitted');
    } finally {
      this.syncing.set(false);
    }
  }

  private scheduleNext(status: WithdrawalStatus): void {
    if (this.destroyed || TERMINAL_WITHDRAWAL_STATUSES.includes(status)) return;
    if (!this.isInProgress(status)) return;
    const delays = [1_000, 2_000, 4_000, 8_000, 15_000];
    const delay = delays[Math.min(this.pollAttempt, delays.length - 1)];
    this.pollAttempt += 1;
    if (this.pollTimer !== null) window.clearTimeout(this.pollTimer);
    this.pollTimer = window.setTimeout(() => void this.sync(), delay);
  }
}
