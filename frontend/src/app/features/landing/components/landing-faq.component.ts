import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { LandingIconComponent } from './landing-icon.component';

const FAQ_ITEMS = [
  {
    question: 'Preciso entender de cripto para usar o Trato?',
    answer:
      'Não. Os valores aparecem em reais e cada ação explica o que será assinado. Você só precisa conectar uma carteira Phantom para autorizar depósitos e liberações.',
  },
  {
    question: 'O que acontece se o freelancer não entregar?',
    answer:
      'Enquanto a etapa não for marcada como entregue, quem contratou pode solicitar o reembolso. O valor protegido volta para a carteira de origem.',
  },
  {
    question: 'E se o cliente não aprovar uma etapa entregue?',
    answer:
      'Depois da entrega, o contrato bloqueia o reembolso unilateral. Mediação e liberação automática por prazo são evoluções previstas para depois da demonstração.',
  },
  {
    question: 'O Trato tem acesso à minha chave ou ao meu dinheiro?',
    answer:
      'Não. Sua chave continua na carteira. O Trato prepara a transação, a Phantom mostra o pedido de assinatura e o contrato inteligente executa as regras publicamente.',
  },
  {
    question: 'Que moeda aparece na demonstração?',
    answer:
      'A demonstração usa BRLP-dev, um token de teste com seis casas decimais. Ele não representa dinheiro real e existe apenas para validar o fluxo na devnet.',
  },
  {
    question: 'Quanto custa testar?',
    answer:
      'Nada em dinheiro real. O ambiente usa tokens e SOL de teste, e a tela de carteira inclui um faucet para receber BRLP-dev.',
  },
] as const;

@Component({
  selector: 'app-landing-faq',
  imports: [LandingIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="duvidas" aria-labelledby="duvidas-titulo">
      <div
        class="container-page grid gap-10 py-20 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-18 lg:py-28"
      >
        <div>
          <p class="text-sm font-semibold tracking-[0.14em] text-brand-700 uppercase">
            Sem letra miúda
          </p>
          <h2
            id="duvidas-titulo"
            class="mt-3 font-display text-4xl leading-[1.04] font-bold tracking-[-0.035em] text-ink-950 sm:text-5xl"
          >
            Dúvidas comuns
          </h2>
          <p class="mt-5 leading-relaxed text-ink-600">
            O produto foi desenhado para deixar as regras visíveis antes de qualquer assinatura.
          </p>
        </div>

        <div class="divide-y divide-ink-200 border-y border-ink-200">
          @for (item of items; track item.question; let index = $index) {
            <div>
              <h3>
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-6 py-5 text-left text-base font-semibold text-ink-950 sm:text-lg"
                  [id]="'faq-question-' + index"
                  [attr.aria-expanded]="openIndex() === index"
                  [attr.aria-controls]="'faq-answer-' + index"
                  (click)="toggle(index)"
                >
                  {{ item.question }}
                  <span
                    class="grid size-8 shrink-0 place-items-center rounded-full bg-white text-ink-700 ring-1 ring-ink-200 transition-transform duration-200"
                    [class.rotate-180]="openIndex() === index"
                  >
                    <app-landing-icon class="size-4" name="chevron" />
                  </span>
                </button>
              </h3>

              <div
                role="region"
                class="grid transition-[grid-template-rows] duration-300 ease-out"
                [id]="'faq-answer-' + index"
                [attr.aria-labelledby]="'faq-question-' + index"
                [attr.inert]="openIndex() === index ? null : ''"
                [class.grid-rows-[1fr]]="openIndex() === index"
                [class.grid-rows-[0fr]]="openIndex() !== index"
              >
                <div class="overflow-hidden">
                  <p class="max-w-2xl pb-6 leading-relaxed text-ink-600">{{ item.answer }}</p>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class LandingFaqComponent {
  protected readonly items = FAQ_ITEMS;
  protected readonly openIndex = signal<number | null>(0);

  protected toggle(index: number): void {
    this.openIndex.update((current) => (current === index ? null : index));
  }
}
