import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';
import { LandingHeaderComponent } from './components/landing-header.component';

interface EscrowRules {
  freelancerWallet: string;
  mint: string;
  maxAmountBaseUnits: string;
  claimDelaySeconds: number;
  paused: boolean;
}

@Component({
  selector: 'app-rules-page',
  imports: [RouterLink, LandingHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-landing-header />
    <main class="container-page max-w-4xl py-16 sm:py-20">
      <a routerLink="/" class="text-sm font-semibold text-brand-700 hover:underline">
        ← Voltar ao início
      </a>
      <p class="mt-10 text-sm font-semibold tracking-[0.14em] text-brand-700 uppercase">
        Antes de financiar uma etapa
      </p>
      <h1 class="mt-3 font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
        Regras do pagamento
      </h1>
      <p class="mt-5 max-w-2xl text-lg leading-8 text-ink-600">
        Cada etapa tem seu próprio depósito em escrow. Leia as condições antes de assinar na
        carteira.
      </p>

      <div class="mt-10 grid gap-4 sm:grid-cols-2">
        <section class="rounded-card border border-ink-200 bg-white p-6">
          <h2 class="text-lg font-semibold text-ink-950">Reembolso do cliente</h2>
          <p class="mt-3 leading-7 text-ink-600">
            O cliente pode reembolsar a etapa enquanto ela estiver financiada e o freelancer ainda
            não tiver marcado a entrega. Depois da marcação, o reembolso unilateral não é permitido.
          </p>
        </section>
        <section class="rounded-card border border-ink-200 bg-white p-6">
          <h2 class="text-lg font-semibold text-ink-950">Pagamento ao freelancer</h2>
          <p class="mt-3 leading-7 text-ink-600">
            O cliente pode liberar o valor a qualquer momento após o depósito. Se ele não agir após
            a entrega, o freelancer pode sacar sozinho quando terminar o prazo registrado no escrow.
          </p>
        </section>
      </div>

      <section class="mt-4 rounded-card border border-ink-200 bg-white p-6">
        <h2 class="text-lg font-semibold text-ink-950">Teto, prazo e depósitos</h2>
        @if (rules(); as current) {
          <dl class="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt class="text-ink-500">Teto para novas etapas</dt>
              <dd class="mt-1 font-semibold text-ink-950">
                {{ amount(current.maxAmountBaseUnits) }} tokens
              </dd>
            </div>
            <div>
              <dt class="text-ink-500">Prazo de saque após a entrega</dt>
              <dd class="mt-1 font-semibold text-ink-950">
                {{ duration(current.claimDelaySeconds) }}
              </dd>
            </div>
            <div>
              <dt class="text-ink-500">Novos depósitos</dt>
              <dd class="mt-1 font-semibold text-ink-950">
                {{ current.paused ? 'Pausados' : 'Permitidos' }}
              </dd>
            </div>
            <div>
              <dt class="text-ink-500">Mint aceito</dt>
              <dd class="mt-1 font-mono text-xs break-all text-ink-950">{{ current.mint }}</dd>
            </div>
          </dl>
          <p class="mt-5 text-sm leading-6 text-ink-500">
            O teto e o prazo acima valem para novos depósitos. O prazo de uma etapa já financiada
            fica gravado nela e não diminui quando a configuração muda.
          </p>
        } @else {
          <p class="mt-3 leading-7 text-ink-600">
            A configuração on-chain ainda não está disponível. Consulte o teto e o prazo antes de
            depositar; não assine uma transação sem essas informações.
          </p>
        }
      </section>

      <div class="mt-6 rounded-card border border-brand-200 bg-brand-50 p-6">
        <h2 class="font-semibold text-ink-950">Serviço em beta</h2>
        <p class="mt-2 leading-7 text-ink-600">
          Confirme o valor, a carteira e o mint no pedido de assinatura. Transações on-chain são
          públicas e podem exigir uma taxa de rede. Em caso de divergência, o estado on-chain
          prevalece; a página do projeto pode ser sincronizada ao abrir.
        </p>
      </div>
    </main>
  `,
})
export class RulesPageComponent {
  private readonly http = inject(HttpClient);
  protected readonly rules = signal<EscrowRules | null>(null);

  constructor() {
    this.http.get<EscrowRules | null>(`${environment.apiUrl}/escrow/rules`).subscribe({
      next: (rules) => this.rules.set(rules),
      error: () => this.rules.set(null),
    });
  }

  protected amount(value: string): string {
    const units = BigInt(value);
    const whole = units / 1_000_000n;
    const fractional = (units % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
    return `${whole.toLocaleString('pt-BR')}${fractional ? `,${fractional}` : ''}`;
  }

  protected duration(seconds: number): string {
    if (seconds % 86_400 === 0) {
      const days = seconds / 86_400;
      return `${days} ${days === 1 ? 'dia' : 'dias'}`;
    }
    if (seconds % 3_600 === 0) {
      const hours = seconds / 3_600;
      return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    return `${seconds} segundos`;
  }
}
