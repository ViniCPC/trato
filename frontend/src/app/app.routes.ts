import { Routes } from '@angular/router';
import { environment } from '../environments/environment';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
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
