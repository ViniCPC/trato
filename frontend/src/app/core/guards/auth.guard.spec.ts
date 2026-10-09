import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { authGuard, guestGuard } from './auth.guard';

describe('auth guards', () => {
  let authenticated = false;
  let loginTree: UrlTree;
  let projectsTree: UrlTree;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authenticated = false;
    loginTree = {} as UrlTree;
    projectsTree = {} as UrlTree;
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    router.createUrlTree.and.callFake((commands: readonly unknown[]) =>
      commands.includes('/login') ? loginTree : projectsTree,
    );

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: () => authenticated } },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('allows authenticated users into private routes', () => {
    authenticated = true;
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/projects/123' } as RouterStateSnapshot),
    );
    expect(result).toBeTrue();
  });

  it('redirects anonymous users and keeps the return URL', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/projects/123' } as RouterStateSnapshot),
    );
    expect(result).toBe(loginTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/projects/123' },
    });
  });

  it('keeps anonymous users on guest routes', () => {
    const result = TestBed.runInInjectionContext(() =>
      guestGuard({} as ActivatedRouteSnapshot, { url: '/login' } as RouterStateSnapshot),
    );
    expect(result).toBeTrue();
  });

  it('redirects authenticated users away from guest routes', () => {
    authenticated = true;
    const result = TestBed.runInInjectionContext(() =>
      guestGuard({} as ActivatedRouteSnapshot, { url: '/login' } as RouterStateSnapshot),
    );
    expect(result).toBe(projectsTree);
  });
});
