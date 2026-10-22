import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { isWalletUserRejection, WalletService } from '../../../core/wallet/wallet.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import {
  brlInputToBaseUnits,
  baseUnitsToToken,
  maskBrlInput,
  minorUnitsToBrl,
} from '../../../shared/utils/money';
import { Withdrawal } from '../models/finance.model';
import { FinanceApiService } from '../services/finance-api.service';

const positiveAmountValidator: ValidatorFn = (
  control: AbstractControl<string>,
): ValidationErrors | null => {
  if (!control.value) return null;
  try {
    return BigInt(brlInputToBaseUnits(control.value)) > 0n ? null : { positive: true };
  } catch {
    return { money: true };
  }
};

@Component({
  selector: 'app-withdrawal-page',
  imports: [ButtonComponent, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <a
        class="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900"
        routerLink="/balance"
      >
        <span aria-hidden="true">←</span>
        Voltar ao saldo
      </a>

      <header class="mt-6 max-w-2xl">
        <p class="text-sm font-semibold text-brand-700">SAQUE</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-[-0.035em] text-ink-900 sm:text-4xl">
          Sacar via Pix
        </h1>
        <p class="mt-3 text-sm leading-6 text-ink-500 sm:text-base">
          Converta seu saldo em {{ tokenSymbol }} e receba na chave Pix informada.
        </p>
      </header>

      <div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form
          class="rounded-card border border-ink-200 bg-white p-5 sm:p-7"
          [formGroup]="form"
          (ngSubmit)="requestQuote()"
        >
          <h2 class="text-lg font-semibold text-ink-900">Dados do saque</h2>

          <label class="mt-6 block">
            <span class="mb-2 block text-sm font-medium text-ink-700">Valor</span>
            <div class="relative">
              <span
                class="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-semibold text-ink-500"
              >
                {{ tokenSymbol }}
              </span>
              <input
                class="h-12 w-full rounded-lg border border-ink-200 bg-white pr-3.5 pl-16 text-base text-ink-900 tabular-nums placeholder:text-ink-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-100 focus:outline-none"
                formControlName="amount"
                inputmode="numeric"
                autocomplete="off"
                placeholder="0,00"
                (input)="maskAmount($event)"
              />
            </div>
            @if (submitted() && form.controls.amount.invalid) {
              <p class="mt-1.5 text-sm text-rose-700">Informe um valor maior que zero.</p>
            }
          </label>

          <label class="mt-5 block">
            <span class="mb-2 block text-sm font-medium text-ink-700">Chave Pix</span>
            <input
              class="h-12 w-full rounded-lg border border-ink-200 bg-white px-3.5 text-base text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-100 focus:outline-none"
              formControlName="pixKey"
              maxlength="256"
              autocomplete="off"
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              (input)="invalidateQuote()"
            />
            @if (submitted() && form.controls.pixKey.invalid) {
              <p class="mt-1.5 text-sm text-rose-700">Informe uma chave Pix.</p>
            }
          </label>

          <app-button
            class="mt-7 block w-full"
            type="submit"
            loadingLabel="Cotando..."
            [loading]="quoting()"
          >
            Ver cotação
          </app-button>
        </form>

        <aside>
          @if (quote(); as currentQuote) {
            <section class="rounded-card border border-brand-200 bg-brand-50 p-5 sm:p-6">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs font-semibold tracking-wide text-brand-700 uppercase">
                    Cotação pronta
                  </p>
                  <h2 class="mt-1 text-lg font-semibold text-ink-900">Revise antes de assinar</h2>
                </div>
                <span
                  class="rounded-full bg-white px-2.5 py-1 font-mono text-xs font-semibold"
                  [class.text-rose-700]="quoteExpired()"
                  [class.text-brand-800]="!quoteExpired()"
                >
                  {{ quoteExpired() ? 'Expirada' : countdown() }}
                </span>
              </div>

              <dl class="mt-6 space-y-3 text-sm">
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-ink-500">Valor solicitado</dt>
                  <dd class="font-medium text-ink-900 tabular-nums">
                    {{ formatToken(requestedBaseUnits(currentQuote)) }}
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-ink-500">Taxa</dt>
                  <dd class="font-medium text-ink-900 tabular-nums">
                    {{ formatToken(currentQuote.feeBaseUnits) }}
                  </dd>
                </div>
                <div class="border-t border-brand-200 pt-3">
                  <div class="flex items-center justify-between gap-4">
                    <dt class="font-semibold text-ink-900">Total reservado</dt>
                    <dd class="font-semibold text-ink-900 tabular-nums">
                      {{ formatToken(currentQuote.amountBaseUnits) }}
                    </dd>
                  </div>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-ink-500">Recebimento Pix</dt>
                  <dd class="font-medium text-ink-900 tabular-nums">
                    {{ formatFiat(currentQuote.fiatAmountMinor) }}
                  </dd>
                </div>
              </dl>

              <app-button
                class="mt-6 block w-full"
                loadingLabel="Confirmando..."
                [loading]="confirming()"
                [disabled]="quoteExpired()"
                (pressed)="confirmQuote()"
              >
                Confirmar saque
              </app-button>
              <p class="mt-3 text-xs leading-5 text-ink-500">
                No provider real, a Phantom abrirá para assinar a transferência Solana.
              </p>
            </section>
          } @else {
            <section class="rounded-card border border-dashed border-ink-200 bg-white p-6">
              <p class="text-sm font-semibold text-ink-900">Sua cotação aparecerá aqui</p>
              <p class="mt-2 text-sm leading-6 text-ink-500">
                O saldo só é reservado depois que a cotação for criada.
              </p>
            </section>
          }
        </aside>
      </div>
    </div>
  `,
})
export class WithdrawalPageComponent {
  private readonly api = inject(FinanceApiService);
  private readonly auth = inject(AuthService);
  private readonly wallet = inject(WalletService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private idempotencyKey: string | null = null;

  protected readonly tokenSymbol = environment.tokenSymbol;
  protected readonly submitted = signal(false);
  protected readonly quoting = signal(false);
  protected readonly confirming = signal(false);
  protected readonly quote = signal<Withdrawal | null>(null);
  protected readonly now = signal(Date.now());
  protected readonly quoteExpired = computed(() => {
    const expiresAt = this.quote()?.quoteExpiresAt;
    return expiresAt === null || expiresAt === undefined || Date.parse(expiresAt) <= this.now();
  });
  protected readonly countdown = computed(() => {
    const expiresAt = this.quote()?.quoteExpiresAt;
    if (!expiresAt) return '0:00';
    const seconds = Math.max(0, Math.ceil((Date.parse(expiresAt) - this.now()) / 1000));
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  });

  readonly form = new FormGroup({
    amount: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, positiveAmountValidator],
    }),
    pixKey: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(256)],
    }),
  });

  constructor() {
    const timer = window.setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => window.clearInterval(timer));
  }

  protected maskAmount(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.controls.amount.setValue(maskBrlInput(input.value));
    this.invalidateQuote();
  }

  protected invalidateQuote(): void {
    this.quote.set(null);
    this.idempotencyKey = null;
  }

  protected async requestQuote(): Promise<void> {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.quoting()) return;

    this.quoting.set(true);
    try {
      this.idempotencyKey ??= this.createIdempotencyKey();
      const value = this.form.getRawValue();
      const quote = await firstValueFrom(
        this.api.quote(
          {
            amountBaseUnits: brlInputToBaseUnits(value.amount),
            pixKey: value.pixKey.trim(),
          },
          this.idempotencyKey,
        ),
      );
      this.quote.set(quote);
      this.now.set(Date.now());
    } catch {
      // O interceptor HTTP apresenta a mensagem de erro controlada pelo backend.
    } finally {
      this.quoting.set(false);
    }
  }

  protected async confirmQuote(): Promise<void> {
    const quote = this.quote();
    if (!quote || this.quoteExpired() || this.confirming()) return;

    this.confirming.set(true);
    try {
      const prepared = await firstValueFrom(this.api.prepare(quote.id));
      let signature = prepared.mockSignature;
      if (!signature) {
        await this.assertCorrectWallet();
        if (!prepared.transactionBase64) throw new Error('TRANSACTION_MISSING');
        signature = await this.wallet.signAndSendTransaction(prepared.transactionBase64);
      }
      const confirmed = await firstValueFrom(this.api.confirm(quote.id, signature));
      this.toast.show('Saque enviado', {
        description: 'Acompanhe o processamento até o pagamento.',
        tone: 'success',
      });
      await this.router.navigate(['/withdrawals', confirmed.id]);
    } catch (error) {
      if (
        !isWalletUserRejection(error) &&
        !(error instanceof HttpErrorResponse) &&
        (!(error instanceof Error) || error.message !== 'WRONG_WALLET')
      ) {
        this.toast.show('Não foi possível confirmar o saque', { tone: 'error' });
      }
    } finally {
      this.confirming.set(false);
    }
  }

  protected requestedBaseUnits(quote: Withdrawal): string {
    return (BigInt(quote.amountBaseUnits) - BigInt(quote.feeBaseUnits)).toString();
  }

  protected formatToken(value: string): string {
    return baseUnitsToToken(value);
  }

  protected formatFiat(value: string): string {
    return minorUnitsToBrl(value);
  }

  private async assertCorrectWallet(): Promise<void> {
    const connected = this.wallet.publicKey() ?? (await this.wallet.connect());
    const linked = this.auth.currentUser()?.walletAddress ?? null;
    if (!linked || linked !== connected) {
      this.toast.show('Carteira incorreta', {
        description: 'Conecte na Phantom a carteira vinculada à sua conta.',
        tone: 'error',
      });
      throw new Error('WRONG_WALLET');
    }
  }

  private createIdempotencyKey(): string {
    return `withdrawal-${crypto.randomUUID()}`;
  }
}
