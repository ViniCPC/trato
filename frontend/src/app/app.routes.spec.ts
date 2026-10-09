import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { routes } from './app.routes';

describe('app routes', () => {
  it('opens the public landing page at the empty URL', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    });

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');

    expect(router.url).toBe('/');
  });
});
