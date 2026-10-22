import { Routes } from '@angular/router';
import { environment } from '../environments/environment';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/landing/landing-page.component').then((page) => page.LandingPageComponent),
    title: 'Trato: pagamento por etapas para freelancers',
  },
  {
    path: 'regras',
    loadComponent: () =>
      import('./features/landing/rules-page.component').then((page) => page.RulesPageComponent),
    title: 'Regras do escrow | Trato',
  },
  {
    path: '',
    loadChildren: () => import('./features/auth/auth.routes').then((routes) => routes.AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layout/shell.component').then((layout) => layout.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'projects' },
      {
        path: 'projects',
        loadChildren: () =>
          import('./features/projects/projects.routes').then((routes) => routes.PROJECTS_ROUTES),
      },
      {
        path: 'balance',
        loadComponent: () =>
          import('./features/finance/pages/balance-page.component').then(
            (page) => page.BalancePageComponent,
          ),
        title: 'Saldo e extrato | Trato',
      },
      {
        path: 'withdrawals',
        loadComponent: () =>
          import('./features/finance/pages/withdrawal-history-page.component').then(
            (page) => page.WithdrawalHistoryPageComponent,
          ),
        title: 'Histórico de saques | Trato',
      },
      {
        path: 'withdrawals/new',
        loadComponent: () =>
          import('./features/finance/pages/withdrawal-page.component').then(
            (page) => page.WithdrawalPageComponent,
          ),
        title: 'Sacar via Pix | Trato',
      },
      {
        path: 'withdrawals/:id',
        loadComponent: () =>
          import('./features/finance/pages/withdrawal-status-page.component').then(
            (page) => page.WithdrawalStatusPageComponent,
          ),
        title: 'Status do saque | Trato',
      },
      {
        path: 'activity',
        loadComponent: () =>
          import('./features/placeholders/placeholder-page.component').then(
            (page) => page.PlaceholderPageComponent,
          ),
        data: {
          pageTitle: 'Atividade',
          description: 'A timeline consolidada será conectada aos eventos dos projetos.',
        },
      },
      {
        path: 'wallet',
        loadComponent: () =>
          import('./features/wallet/pages/wallet-page.component').then(
            (page) => page.WalletPageComponent,
          ),
        data: {
          pageTitle: 'Carteira',
          description: 'A conexão web3 usará o vocabulário visual violeta reservado.',
        },
      },
      {
        path: 'account',
        loadComponent: () =>
          import('./features/placeholders/placeholder-page.component').then(
            (page) => page.PlaceholderPageComponent,
          ),
        data: {
          pageTitle: 'Sua conta',
          description: 'Os dados de perfil e preferências entrarão nas próximas sprints.',
        },
      },
      ...(environment.production
        ? []
        : [
            {
              path: 'ui',
              loadComponent: () =>
                import('./features/ui-showcase/ui-showcase-page.component').then(
                  (page) => page.UiShowcasePageComponent,
                ),
              title: 'UI | Trato',
            },
          ]),
    ],
  },
  { path: '**', redirectTo: '' },
];
