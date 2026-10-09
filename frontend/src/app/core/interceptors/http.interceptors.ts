import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { getApiMessages } from '../models/api-error.model';
import { ToastService } from '../services/toast.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthService).token();
  const authenticatedRequest = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authenticatedRequest);
};

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        toast.show('Não foi possível concluir a operação', {
          tone: 'error',
        });
        return throwError(() => error);
      }

      if (error.status === 401 && auth.token()) {
        const returnUrl = router.url.startsWith('/login') ? '/projects?role=client' : router.url;
        auth.clearSession();
        void router.navigate(['/login'], { queryParams: { returnUrl } });
        toast.show('Sua sessão expirou', {
          description: 'Entre novamente para continuar.',
          tone: 'error',
        });
      } else if (!isExpectedFormError(request.url, error.status)) {
        const [message] = getApiMessages(error.error);
        toast.show(message ?? 'Ocorreu um erro inesperado', { tone: 'error' });
      }

      return throwError(() => error);
    }),
  );
};

function isExpectedFormError(url: string, status: number): boolean {
  return status >= 400 && status < 500 && /\/auth\/(login|register)$/.test(url);
}
