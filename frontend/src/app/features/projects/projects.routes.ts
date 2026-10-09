import { Routes } from '@angular/router';
import { pendingChangesGuard } from './guards/pending-changes.guard';

export const PROJECTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../dashboard/dashboard-page.component').then((page) => page.DashboardPageComponent),
    title: 'Projetos | Trato',
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/project-form-page.component').then((page) => page.ProjectFormPageComponent),
    canDeactivate: [pendingChangesGuard],
    title: 'Novo projeto | Trato',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/project-detail-page.component').then(
        (page) => page.ProjectDetailPageComponent,
      ),
    title: 'Projeto | Trato',
  },
];
