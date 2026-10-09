import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/auth.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/login-page.component').then((page) => page.LoginPageComponent),
    title: 'Entrar | Trato',
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/register-page.component').then((page) => page.RegisterPageComponent),
    title: 'Criar conta | Trato',
  },
];
