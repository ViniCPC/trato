import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BrandLogoComponent } from './components/brand-logo.component';
import { LandingFaqComponent } from './components/landing-faq.component';
import { LandingIconComponent, LandingIconName } from './components/landing-icon.component';
import { LandingHeaderComponent } from './components/landing-header.component';
import { ProjectPreviewComponent } from './components/project-preview.component';

interface ComparisonOption {
  label: string;
  shortLabel: string;
  risk: string;
  highlight: boolean;
}

interface ComparisonRow {
  label: string;
  values: readonly [boolean, boolean, boolean];
}

interface HowStep {
  icon: LandingIconName;
  title: string;
  text: string;
  stateLabel: string;
  barClass: string;
  textClass: string;
}

@Component({
  selector: 'app-landing-page',
  imports: [
    BrandLogoComponent,
    LandingFaqComponent,
    LandingHeaderComponent,
    LandingIconComponent,
    ProjectPreviewComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block bg-ink-50' },
  template: `
    <a
      routerLink="/"
      fragment="conteudo"
      class="sr-only z-50 rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Pular para o conteúdo
    </a>

    <div class="bg-brand-950 text-brand-100">
      <p
        class="container-page flex items-center justify-center gap-2 py-2.5 text-center text-xs sm:text-sm"
      >
        <app-landing-icon class="size-4 text-brand-300" name="flask" />
        Ambiente de demonstração com tokens de teste. Nenhum dinheiro real é movimentado.
      </p>
    </div>

    <app-landing-header />

    <main id="conteudo" tabindex="-1" class="outline-none">
      <section aria-labelledby="hero-title" class="relative overflow-hidden">
        <div
          class="pointer-events-none absolute top-12 left-[8%] -z-0 size-64 rounded-full bg-brand-200/30 blur-3xl"
          aria-hidden="true"
        ></div>
        <div
          class="relative container-page grid items-center gap-16 pt-12 pb-24 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,31rem)] lg:gap-14 lg:pt-20 lg:pb-32"
        >
          <div class="min-w-0">
            <p
              class="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold tracking-[0.12em] text-brand-800 uppercase"
            >
              Trabalho combinado. Pagamento protegido.
            </p>
            <h1
              id="hero-title"
              class="mt-6 font-display text-[3.55rem] leading-[0.91] font-bold tracking-[-0.055em] text-ink-950 sm:text-7xl lg:text-[5.35rem]"
            >
              Trato é trato<span class="text-brand-500">.</span>
            </h1>
            <p class="mt-7 max-w-xl text-lg leading-relaxed text-ink-600 sm:text-xl">
              Pagamento por etapas para freelancers. O valor fica protegido num contrato inteligente
              e é liberado quando o cliente aprova ou, após a entrega, termina o prazo de saque.
            </p>

            <div class="mt-9 flex flex-wrap gap-3">
              <a
                routerLink="/register"
                class="inline-flex min-h-12 items-center justify-center rounded-full bg-brand-700 px-6 text-base font-semibold text-white shadow-sm transition hover:bg-brand-800"
              >
                Criar meu primeiro trato
                <app-landing-icon class="size-4" name="arrow" />
              </a>
              <a
                routerLink="/"
                fragment="como-funciona"
                class="inline-flex min-h-12 items-center justify-center rounded-full border border-ink-200 bg-white px-6 text-base font-semibold text-ink-800 transition hover:border-ink-300 hover:bg-ink-100"
              >
                Ver como funciona
              </a>
            </div>

            <ul class="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink-700">
              <li class="inline-flex items-center gap-2">
                <app-landing-icon class="size-4 text-brand-700" name="key" />
                Sua chave fica com você
              </li>
              <li class="inline-flex items-center gap-2">
                <app-landing-icon class="size-4 text-brand-700" name="coins" />
                Valores em reais
              </li>
              <li class="inline-flex items-center gap-2">
                <app-landing-icon class="size-4 text-brand-700" name="receipt" />
                Comprovante de cada ação
              </li>
            </ul>
          </div>

          <app-project-preview class="w-full max-w-xl lg:max-w-none" />
        </div>
      </section>

      <section aria-labelledby="comparison-title" class="border-y border-ink-200 bg-white">
        <div class="container-page py-20 lg:py-28">
          <div class="max-w-2xl">
            <p class="text-sm font-semibold tracking-[0.14em] text-brand-700 uppercase">
              Confiança sem aposta
            </p>
            <h2
              id="comparison-title"
              class="mt-3 font-display text-4xl leading-[1.04] font-bold tracking-[-0.04em] text-ink-950 sm:text-5xl"
            >
              Pagar adiantado é arriscado. Pagar no final também.
            </h2>
            <p class="mt-5 text-lg leading-relaxed text-ink-600">
              Em todo trabalho freelance, alguém precisa confiar primeiro. Com o Trato, o valor fica
              protegido e ninguém precisa apostar no outro.
            </p>
          </div>

          <div class="mt-12">
            <table class="w-full table-fixed border-separate border-spacing-0 text-left">
              <caption class="sr-only">
                Comparação entre pagar adiantado, pagar no final e usar o Trato
              </caption>
              <thead>
                <tr>
                  <td class="w-[40%] sm:w-[34%]"></td>
                  @for (option of comparisonOptions; track option.label) {
                    <th
                      scope="col"
                      class="px-1 pt-4 pb-3 text-center align-bottom sm:px-4 sm:pt-5 sm:pb-4"
                      [class.rounded-t-2xl]="option.highlight"
                      [class.bg-brand-50]="option.highlight"
                    >
                      <span
                        class="block text-[0.68rem] leading-tight font-semibold text-ink-950 sm:text-lg"
                      >
                        <span class="sm:hidden">{{ option.shortLabel }}</span>
                        <span class="hidden sm:inline">{{ option.label }}</span>
                      </span>
                      <span class="mt-1 hidden text-sm font-normal text-ink-500 sm:block">
                        {{ option.risk }}
                      </span>
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of comparisonRows; track row.label; let last = $last) {
                  <tr>
                    <th
                      scope="row"
                      class="border-t border-ink-200 py-4 pr-2 text-xs leading-snug font-medium text-ink-700 sm:py-5 sm:pr-4 sm:text-base"
                    >
                      {{ row.label }}
                    </th>
                    @for (value of row.values; track $index) {
                      <td
                        class="border-t border-ink-200 px-1 py-4 text-center sm:px-4 sm:py-5"
                        [class.bg-brand-50]="$index === 2"
                        [class.rounded-b-2xl]="$index === 2 && last"
                      >
                        <span
                          class="inline-flex size-7 items-center justify-center rounded-full"
                          [class.bg-brand-100]="value"
                          [class.text-brand-700]="value"
                          [class.bg-ink-100]="!value"
                          [class.text-ink-500]="!value"
                        >
                          <app-landing-icon class="size-4" [name]="value ? 'check' : 'x'" />
                        </span>
                        <span class="sr-only">{{ value ? 'Sim' : 'Não' }}</span>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="como-funciona" aria-labelledby="how-title">
        <div class="container-page py-20 lg:py-28">
          <div class="grid gap-5 lg:grid-cols-2 lg:items-end lg:gap-16">
            <div>
              <p class="text-sm font-semibold tracking-[0.14em] text-brand-700 uppercase">
                Um fluxo para os dois lados
              </p>
              <h2
                id="how-title"
                class="mt-3 font-display text-4xl leading-[1.04] font-bold tracking-[-0.04em] text-ink-950 sm:text-5xl"
              >
                Do combinado ao pagamento, em quatro passos
              </h2>
            </div>
            <p class="text-lg leading-relaxed text-ink-600">
              Cada etapa percorre o mesmo caminho. O dinheiro só muda de mãos quando o trabalho
              anda.
            </p>
          </div>

          <ol class="mt-14 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            @for (step of howSteps; track step.title; let index = $index) {
              <li class="flex flex-col">
                <span class="h-1.5 rounded-full" [class]="step.barClass"></span>
                <span class="mt-3 text-xs font-semibold" [class]="step.textClass">
                  {{ step.stateLabel }}
                </span>
                <div class="mt-6 flex items-center gap-3">
                  <span
                    class="grid size-10 place-items-center rounded-full bg-white font-display font-semibold text-ink-950 ring-1 ring-ink-200"
                  >
                    {{ index + 1 }}
                  </span>
                  <app-landing-icon class="size-5 text-ink-400" [name]="step.icon" />
                </div>
                <h3 class="mt-4 font-display text-xl font-semibold tracking-tight text-ink-950">
                  {{ step.title }}
                </h3>
                <p class="mt-2 leading-relaxed text-ink-600">{{ step.text }}</p>
              </li>
            }
          </ol>

          <div
            class="mt-14 flex items-start gap-4 rounded-2xl bg-white p-5 leading-relaxed text-ink-700 ring-1 ring-ink-200 sm:items-center sm:p-6"
          >
            <span
              class="grid size-9 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-700"
            >
              <app-landing-icon class="size-4" name="undo" />
            </span>
            <p>
              <strong class="font-semibold text-ink-950">Mudou de planos antes da entrega?</strong>
              Quem contrata pode reembolsar uma etapa ainda não entregue. Depois da entrega, essa
              saída fica bloqueada pelo contrato.
            </p>
          </div>
        </div>
      </section>

      <section
        id="para-quem"
        aria-labelledby="audiences-title"
        class="border-y border-ink-200 bg-white"
      >
        <div class="container-page py-20 lg:py-28">
          <p class="text-sm font-semibold tracking-[0.14em] text-brand-700 uppercase">Equilíbrio</p>
          <h2
            id="audiences-title"
            class="mt-3 max-w-2xl font-display text-4xl leading-[1.04] font-bold tracking-[-0.04em] text-ink-950 sm:text-5xl"
          >
            Bom para os dois lados do trato
          </h2>

          <div
            class="mt-12 grid overflow-hidden rounded-3xl bg-ink-50 ring-1 ring-ink-200 md:grid-cols-2"
          >
            @for (audience of audiences; track audience.title; let first = $first) {
              <article
                class="flex flex-col p-6 sm:p-10"
                [class.border-t]="!first"
                [class.md:border-t-0]="!first"
                [class.md:border-l]="!first"
              >
                <span
                  class="grid size-11 place-items-center rounded-2xl bg-white text-brand-700 ring-1 ring-ink-200"
                >
                  <app-landing-icon class="size-5" [name]="audience.icon" />
                </span>
                <h3 class="mt-6 font-display text-2xl font-semibold tracking-tight text-ink-950">
                  {{ audience.title }}
                </h3>
                <p class="mt-2 text-lg text-ink-600">{{ audience.lead }}</p>
                <ul class="mt-6 flex flex-col gap-3.5">
                  @for (item of audience.items; track item) {
                    <li class="flex gap-3 leading-relaxed text-ink-800">
                      <app-landing-icon class="mt-1 size-4 text-brand-600" name="check" />
                      <span>{{ item }}</span>
                    </li>
                  }
                </ul>
                <div class="mt-auto pt-8">
                  <a
                    routerLink="/register"
                    class="inline-flex min-h-11 items-center rounded-full border border-ink-200 bg-white px-5 text-sm font-semibold text-ink-900 transition hover:border-brand-300 hover:text-brand-800"
                  >
                    {{ audience.cta }}
                  </a>
                </div>
              </article>
            }
          </div>
        </div>
      </section>

      <section id="seguranca" aria-labelledby="security-title" class="bg-brand-950 text-white">
        <div
          class="container-page grid items-center gap-14 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-20 lg:py-28"
        >
          <div class="min-w-0">
            <p class="text-sm font-semibold tracking-[0.14em] text-brand-300 uppercase">
              Regras públicas
            </p>
            <h2
              id="security-title"
              class="mt-3 font-display text-4xl leading-[1.04] font-bold tracking-[-0.04em] sm:text-5xl"
            >
              O dinheiro fica à vista dos dois lados
            </h2>
            <p class="mt-5 max-w-2xl text-lg leading-relaxed text-brand-100/80">
              O Trato prepara a transação, sua carteira assina e o contrato na Solana executa as
              regras. A chave privada nunca sai da sua carteira.
            </p>

            <ul class="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2">
              @for (feature of securityFeatures; track feature.title) {
                <li>
                  <span
                    class="grid size-10 place-items-center rounded-xl bg-white/8 text-brand-300 ring-1 ring-white/10"
                  >
                    <app-landing-icon class="size-5" [name]="feature.icon" />
                  </span>
                  <h3 class="mt-4 font-semibold text-white">{{ feature.title }}</h3>
                  <p class="mt-1.5 leading-relaxed text-brand-100/75">{{ feature.text }}</p>
                </li>
              }
            </ul>
          </div>

          <figure
            class="mx-auto w-full max-w-sm rotate-0 rounded-3xl bg-white p-6 text-ink-950 shadow-float sm:p-7 lg:-rotate-2"
          >
            <figcaption class="flex items-center justify-between gap-3">
              <span class="font-display text-lg font-semibold">Comprovante</span>
              <span class="rounded-full bg-ink-100 px-2.5 py-1 text-xs text-ink-600"
                >Exemplo visual</span
              >
            </figcaption>
            <p class="mt-6 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
              <app-landing-icon class="size-4" name="check" />
              Pagamento liberado
            </p>
            <p class="mt-1 font-display text-4xl font-bold tracking-tight tabular-nums">
              R$ 1.500,00
            </p>
            <p class="mt-1 text-sm text-ink-500">Hoje, 10:32</p>

            <dl class="mt-6 space-y-2.5 border-t border-dashed border-ink-300 pt-5 text-sm">
              <div class="flex justify-between gap-4">
                <dt class="text-ink-500">Etapa</dt>
                <dd class="text-right font-medium">Desenvolvimento da home</dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="text-ink-500">De</dt>
                <dd class="text-right font-medium">Contrato do Trato</dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="text-ink-500">Para</dt>
                <dd class="text-right font-medium">Rafael Souza</dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="text-ink-500">Rede</dt>
                <dd class="text-right font-medium">Solana devnet</dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="text-ink-500">Assinatura</dt>
                <dd class="font-mono text-xs">5hGt…9kLm</dd>
              </div>
            </dl>

            <a
              [href]="explorerUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-web3-700 underline-offset-4 hover:underline"
            >
              Abrir Solana Explorer
              <app-landing-icon class="size-3.5" name="external" />
            </a>
          </figure>
        </div>
      </section>

      <app-landing-faq />

      <section aria-labelledby="cta-title" class="container-page pb-20 lg:pb-28">
        <div
          class="relative overflow-hidden rounded-3xl bg-ink-950 px-6 py-14 text-white sm:px-12 sm:py-16 lg:px-16 lg:py-20"
        >
          <div
            class="absolute -top-28 -right-20 size-80 rounded-full border border-brand-500/25"
            aria-hidden="true"
          ></div>
          <div
            class="absolute top-20 right-12 size-44 rounded-full border border-web3-400/20"
            aria-hidden="true"
          ></div>
          <div class="relative max-w-2xl">
            <p class="text-sm font-semibold tracking-[0.14em] text-brand-300 uppercase">
              Seu próximo projeto
            </p>
            <h2
              id="cta-title"
              class="mt-3 font-display text-4xl leading-[1.02] font-bold tracking-[-0.045em] sm:text-5xl"
            >
              Comece com o dinheiro na mesa
            </h2>
            <p class="mt-5 text-lg leading-relaxed text-ink-300">
              Crie a conta, divida o trabalho em etapas e convide quem vai trabalhar com você.
            </p>
            <div class="mt-9 flex flex-wrap gap-3">
              <a
                routerLink="/register"
                class="inline-flex min-h-12 items-center rounded-full bg-white px-6 font-semibold text-ink-950 transition hover:bg-brand-100"
              >
                Criar conta
              </a>
              <a
                routerLink="/login"
                class="inline-flex min-h-12 items-center rounded-full border border-white/20 px-6 font-semibold text-white transition hover:bg-white/10"
              >
                Já tenho conta
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-ink-200 bg-white">
      <div
        class="container-page grid gap-10 py-14 sm:grid-cols-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-16"
      >
        <div class="max-w-xs sm:col-span-2 md:col-span-1">
          <app-brand-logo />
          <p class="mt-4 text-sm leading-relaxed text-ink-600">
            Pagamento por etapas para freelancers, com regras claras para os dois lados.
          </p>
        </div>
        <nav aria-label="Produto">
          <p class="text-sm font-semibold text-ink-950">Produto</p>
          <ul class="mt-4 space-y-3 text-sm text-ink-600">
            <li>
              <a routerLink="/" fragment="como-funciona" class="hover:text-ink-950"
                >Como funciona</a
              >
            </li>
            <li><a routerLink="/" fragment="para-quem" class="hover:text-ink-950">Para quem</a></li>
            <li><a routerLink="/" fragment="seguranca" class="hover:text-ink-950">Segurança</a></li>
            <li><a routerLink="/" fragment="duvidas" class="hover:text-ink-950">Dúvidas</a></li>
          </ul>
        </nav>
        <nav aria-label="Projeto">
          <p class="text-sm font-semibold text-ink-950">Projeto</p>
          <ul class="mt-4 space-y-3 text-sm text-ink-600">
            <li>
              <a
                [href]="githubUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="hover:text-ink-950"
              >
                Código no GitHub
              </a>
            </li>
            <li>
              <a
                [href]="explorerUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="hover:text-ink-950"
              >
                Solana Explorer
              </a>
            </li>
            <li><a routerLink="/regras" class="hover:text-ink-950">Regras do pagamento</a></li>
          </ul>
        </nav>
      </div>
      <div class="border-t border-ink-200">
        <div
          class="container-page flex flex-col gap-2 py-6 text-sm text-ink-500 sm:flex-row sm:justify-between"
        >
          <p>© {{ year }} Trato</p>
          <p>Versão beta. Confira a rede e o mint antes de depositar.</p>
        </div>
      </div>
    </footer>
  `,
})
export class LandingPageComponent {
  protected readonly year = new Date().getFullYear();
  protected readonly githubUrl = 'https://github.com/ViniCPC/trato';
  protected readonly explorerUrl = 'https://explorer.solana.com/?cluster=devnet';

  protected readonly comparisonOptions: readonly ComparisonOption[] = [
    {
      label: 'Pagar tudo adiantado',
      shortLabel: 'Antes',
      risk: 'A entrega pode não chegar',
      highlight: false,
    },
    {
      label: 'Pagar só no final',
      shortLabel: 'No fim',
      risk: 'O pagamento pode não chegar',
      highlight: false,
    },
    {
      label: 'Com o Trato',
      shortLabel: 'Trato',
      risk: 'O valor acompanha as entregas',
      highlight: true,
    },
  ];

  protected readonly comparisonRows: readonly ComparisonRow[] = [
    { label: 'Cliente protegido', values: [false, true, true] },
    { label: 'Freelancer protegido', values: [true, false, true] },
    { label: 'Pagamento por entrega', values: [false, false, true] },
    { label: 'Regras garantidas por código', values: [false, false, true] },
  ];

  protected readonly howSteps: readonly HowStep[] = [
    {
      icon: 'list',
      title: 'Combinem as etapas',
      text: 'Quem contrata divide o projeto, descreve cada entrega e define o valor de cada uma.',
      stateLabel: 'Ainda sem dinheiro',
      barClass: 'bg-ink-300',
      textClass: 'text-ink-500',
    },
    {
      icon: 'lock',
      title: 'Proteja o valor',
      text: 'Antes do trabalho começar, o valor da etapa vai para o contrato inteligente.',
      stateLabel: 'Dinheiro protegido',
      barClass: 'bg-web3-500',
      textClass: 'text-web3-700',
    },
    {
      icon: 'package',
      title: 'Entregue o trabalho',
      text: 'O freelancer marca a entrega. A partir daí, o reembolso unilateral fica bloqueado.',
      stateLabel: 'Dinheiro protegido',
      barClass: 'bg-web3-500',
      textClass: 'text-web3-700',
    },
    {
      icon: 'check',
      title: 'Aprove ou aguarde o prazo',
      text: 'Quem contratou pode liberar o valor. Após a entrega e o prazo registrado, o freelancer também pode sacar.',
      stateLabel: 'Dinheiro liberado',
      barClass: 'bg-brand-500',
      textClass: 'text-brand-700',
    },
  ];

  protected readonly audiences: ReadonlyArray<{
    icon: LandingIconName;
    title: string;
    lead: string;
    items: readonly string[];
    cta: string;
  }> = [
    {
      icon: 'briefcase',
      title: 'Para quem contrata',
      lead: 'Você paga pelo que recebe, etapa por etapa.',
      items: [
        'Você pode liberar o valor após o depósito; depois da entrega e do prazo, o freelancer também pode sacar.',
        'Uma etapa não entregue pode ser reembolsada.',
        'A linha do tempo mostra o andamento sem depender de mensagens soltas.',
      ],
      cta: 'Contratar com o Trato',
    },
    {
      icon: 'laptop',
      title: 'Para quem trabalha',
      lead: 'Você começa sabendo que o dinheiro existe.',
      items: [
        'O valor já está protegido antes de você começar.',
        'Cada etapa aprovada ou sacada após o prazo vira um pagamento separado.',
        'Depois da entrega, o cliente não pode puxar o dinheiro de volta.',
      ],
      cta: 'Trabalhar com o Trato',
    },
  ];

  protected readonly securityFeatures: ReadonlyArray<{
    icon: LandingIconName;
    title: string;
    text: string;
  }> = [
    {
      icon: 'key',
      title: 'Sua chave fica com você',
      text: 'Cada ação é assinada na Phantom. O Trato nunca pede nem guarda a chave privada.',
    },
    {
      icon: 'code',
      title: 'As regras estão no contrato',
      text: 'Autoridade, estados e valores são validados pelo programa antes de qualquer movimento.',
    },
    {
      icon: 'receipt',
      title: 'Cada ação deixa um registro',
      text: 'Depósitos, entregas e liberações geram assinaturas consultáveis na rede.',
    },
    {
      icon: 'shield',
      title: 'Confirmação pelo backend',
      text: 'O banco só avança depois de conferir signer, instrução e estado on-chain.',
    },
  ];
}
