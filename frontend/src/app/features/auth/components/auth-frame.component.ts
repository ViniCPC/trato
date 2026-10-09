import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-frame',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.82fr)]">
      <section class="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16 lg:py-10">
        <a
          class="inline-flex w-fit items-center gap-2.5 text-lg font-bold tracking-tight text-ink-900"
          routerLink="/"
          aria-label="Trato"
        >
          <span class="grid size-8 place-items-center rounded-lg bg-brand-700 text-sm text-white"
            >T</span
          >
          trato
        </a>

        <div class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <p class="text-sm font-semibold text-brand-700">{{ eyebrow() }}</p>
          <h1 class="mt-3 text-3xl font-semibold tracking-[-0.035em] text-ink-900 sm:text-4xl">
            {{ title() }}
          </h1>
          <p class="mt-3 text-base leading-7 text-ink-500">{{ description() }}</p>
          <div class="mt-8"><ng-content /></div>
        </div>
      </section>

      <aside
        class="relative hidden overflow-hidden bg-brand-900 px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between"
      >
        <div
          class="absolute -top-20 -right-24 size-80 rounded-full border border-brand-500/30"
          aria-hidden="true"
        ></div>
        <div
          class="absolute top-28 -right-10 size-52 rounded-full border border-brand-300/20"
          aria-hidden="true"
        ></div>
        <p class="relative text-sm font-medium text-brand-300">ACORDOS SEM RUÍDO</p>
        <blockquote
          class="relative max-w-lg text-4xl leading-[1.15] font-medium tracking-[-0.04em]"
        >
          “Trabalho bom começa com expectativas claras e termina com confiança dos dois lados.”
        </blockquote>
        <p class="relative max-w-sm text-sm leading-6 text-brand-100/80">
          Projetos, etapas e pagamentos protegidos em um só lugar.
        </p>
      </aside>
    </main>
  `,
})
export class AuthFrameComponent {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
