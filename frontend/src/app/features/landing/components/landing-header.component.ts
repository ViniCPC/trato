import { ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BrandLogoComponent } from './brand-logo.component';
import { LandingIconComponent } from './landing-icon.component';

const SECTIONS = [
  { label: 'Como funciona', fragment: 'como-funciona' },
  { label: 'Para quem', fragment: 'para-quem' },
  { label: 'Segurança', fragment: 'seguranca' },
  { label: 'Dúvidas', fragment: 'duvidas' },
] as const;

@Component({
  selector: 'app-landing-header',
  imports: [BrandLogoComponent, LandingIconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'sticky top-0 z-40 block',
    '(window:scroll)': 'onScroll()',
    '(document:keydown.escape)': 'menuOpen.set(false)',
  },
  template: `
    <div
      class="border-b transition-colors duration-200"
      [class]="
        scrolled() || menuOpen()
          ? 'border-ink-200 bg-ink-50/90 backdrop-blur-xl'
          : 'border-transparent bg-ink-50'
      "
    >
      <div class="container-page flex h-17 items-center gap-8">
        <a routerLink="/" class="shrink-0 rounded-xl" aria-label="Trato, página inicial">
          <app-brand-logo />
        </a>

        <nav aria-label="Seções da página" class="hidden md:block">
          <ul class="flex items-center gap-1">
            @for (section of sections; track section.fragment) {
              <li>
                <a
                  routerLink="/"
                  [fragment]="section.fragment"
                  class="rounded-full px-3 py-2 text-sm text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-950"
                >
                  {{ section.label }}
                </a>
              </li>
            }
          </ul>
        </nav>

        <div class="ml-auto hidden items-center gap-2 md:flex">
          <a
            routerLink="/login"
            class="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold text-ink-700 transition hover:bg-ink-100"
          >
            Entrar
          </a>
          <a
            routerLink="/register"
            class="inline-flex min-h-10 items-center rounded-full bg-brand-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
          >
            Criar conta
          </a>
        </div>

        <button
          type="button"
          class="ml-auto grid size-10 place-items-center rounded-full text-ink-900 transition hover:bg-ink-100 md:hidden"
          aria-controls="menu-mobile"
          [attr.aria-expanded]="menuOpen()"
          [attr.aria-label]="menuOpen() ? 'Fechar menu' : 'Abrir menu'"
          (click)="toggleMenu()"
        >
          <app-landing-icon class="size-5" [name]="menuOpen() ? 'close' : 'menu'" />
        </button>
      </div>

      @if (menuOpen()) {
        <nav
          id="menu-mobile"
          aria-label="Seções da página"
          class="border-t border-ink-200 md:hidden"
        >
          <div class="container-page pt-2 pb-6">
            <ul class="flex flex-col">
              @for (section of sections; track section.fragment) {
                <li>
                  <a
                    routerLink="/"
                    [fragment]="section.fragment"
                    class="block rounded-xl px-3 py-3 text-base text-ink-900 hover:bg-ink-100"
                    (click)="menuOpen.set(false)"
                  >
                    {{ section.label }}
                  </a>
                </li>
              }
            </ul>
            <div class="mt-4 grid grid-cols-2 gap-3">
              <a
                routerLink="/login"
                class="inline-flex min-h-11 items-center justify-center rounded-full border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-800"
                (click)="menuOpen.set(false)"
              >
                Entrar
              </a>
              <a
                routerLink="/register"
                class="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-700 px-4 text-sm font-semibold text-white"
                (click)="menuOpen.set(false)"
              >
                Criar conta
              </a>
            </div>
          </div>
        </nav>
      }
    </div>
  `,
})
export class LandingHeaderComponent {
  protected readonly sections = SECTIONS;
  protected readonly menuOpen = signal(false);
  protected readonly scrolled = signal(false);

  constructor() {
    inject(ViewportScroller).setOffset([0, 80]);
  }

  protected onScroll(): void {
    this.scrolled.set(window.scrollY > 8);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }
}
