import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-ink-50 lg:pl-64">
      <aside
        class="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink-200 bg-white lg:flex"
      >
        <div class="flex h-20 items-center px-7">
          <a
            class="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-ink-900"
            routerLink="/projects"
            [queryParams]="{ role: 'client' }"
          >
            <span class="grid size-8 place-items-center rounded-lg bg-brand-700 text-sm text-white">
              T
            </span>
            trato
          </a>
        </div>

        <nav class="flex-1 space-y-1 px-4 py-4" aria-label="Navegação principal">
          <a
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-500 transition hover:bg-ink-50 hover:text-ink-900"
            routerLink="/projects"
            [queryParams]="{ role: 'client' }"
            routerLinkActive="bg-brand-50 !text-brand-900"
          >
            <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7.5A2.5 2.5 0 0 1 6.5 5h3L11 7h6.5A2.5 2.5 0 0 1 20 9.5v7A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
            </svg>
            Projetos
          </a>
          <a
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-500 transition hover:bg-ink-50 hover:text-ink-900"
            routerLink="/balance"
            routerLinkActive="bg-brand-50 !text-brand-900"
          >
            <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Zm0 2h16m-5 4h2"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            Saldo e extrato
          </a>
          <a
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-500 transition hover:bg-ink-50 hover:text-ink-900"
            routerLink="/activity"
            routerLinkActive="bg-brand-50 !text-brand-900"
          >
            <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 8v4l2.5 1.5M20 12a8 8 0 1 1-2.34-5.66"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
              />
            </svg>
            Atividade
          </a>
          <a
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-500 transition hover:bg-ink-50 hover:text-ink-900"
            routerLink="/wallet"
            routerLinkActive="bg-web3-50 !text-web3-700"
          >
            <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Zm11 4h5v4h-5a2 2 0 1 1 0-4Z"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
            </svg>
            Carteira
          </a>
          @if (isDevelopment) {
            <a
              class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-500 transition hover:bg-ink-50 hover:text-ink-900"
              routerLink="/ui"
              routerLinkActive="bg-brand-50 !text-brand-900"
            >
              <span class="grid size-5 place-items-center font-mono text-xs">UI</span>
              Componentes
            </a>
          }
        </nav>

        <div class="border-t border-ink-200 p-4">
          <div class="flex items-center gap-3 rounded-lg px-2 py-2">
            <div
              class="grid size-9 shrink-0 place-items-center rounded-full bg-ink-100 text-sm font-semibold text-ink-700"
            >
              {{ auth.currentUser()?.name?.charAt(0)?.toUpperCase() }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-ink-900">
                {{ auth.currentUser()?.name }}
              </p>
              <p class="truncate text-xs text-ink-500">{{ auth.currentUser()?.email }}</p>
            </div>
            <button
              class="grid size-9 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-900"
              type="button"
              aria-label="Sair"
              (click)="logout()"
            >
              <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M14 8V5.5A1.5 1.5 0 0 0 12.5 4h-7A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20h7a1.5 1.5 0 0 0 1.5-1.5V16m-3-4h9m0 0-3-3m3 3-3 3"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <header
        class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-ink-200 bg-white/95 px-4 backdrop-blur lg:hidden"
      >
        <a
          class="inline-flex items-center gap-2 text-base font-bold text-ink-900"
          routerLink="/projects"
          [queryParams]="{ role: 'client' }"
        >
          <span class="grid size-7 place-items-center rounded-md bg-brand-700 text-xs text-white"
            >T</span
          >
          trato
        </a>
        <button
          class="grid size-10 place-items-center rounded-lg text-ink-500 hover:bg-ink-100"
          type="button"
          aria-label="Sair"
          (click)="logout()"
        >
          <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M14 8V5.5A1.5 1.5 0 0 0 12.5 4h-7A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20h7a1.5 1.5 0 0 0 1.5-1.5V16m-3-4h9m0 0-3-3m3 3-3 3"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </header>

      <main class="min-h-screen pb-24 lg:pb-0"><router-outlet /></main>

      <nav
        class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-ink-200 bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
        aria-label="Navegação mobile"
      >
        <a
          class="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-ink-500"
          routerLink="/projects"
          [queryParams]="{ role: 'client' }"
          routerLinkActive="!text-brand-700"
        >
          <span class="text-lg" aria-hidden="true">□</span>
          Projetos
        </a>
        <a
          class="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-ink-500"
          routerLink="/balance"
          routerLinkActive="!text-brand-700"
        >
          <span class="text-lg" aria-hidden="true">◫</span>
          Saldo
        </a>
        <a
          class="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-ink-500"
          routerLink="/projects/new"
          routerLinkActive="!text-brand-700"
        >
          <span class="text-xl" aria-hidden="true">+</span>
          Novo
        </a>
        <a
          class="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-ink-500"
          routerLink="/account"
          routerLinkActive="!text-brand-700"
        >
          <span class="text-lg" aria-hidden="true">○</span>
          Conta
        </a>
      </nav>
    </div>
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly isDevelopment = !environment.production;

  protected logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
