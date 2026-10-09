import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthService } from './core/auth/auth.service';
import { routes } from './app.routes';

describe('app routes', () => {
  it('redirects the empty URL to login for an anonymous user', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: { isAuthenticated: () => false },
        },
      ],
    });

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');

    expect(router.url).toBe('/login?returnUrl=%2Fprojects');
  });
});
