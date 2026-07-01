import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  UrlTree,
  type ActivatedRouteSnapshot,
} from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { authGuard } from './auth.guard';
import { MockAuthService } from './mock-auth.service';

const routeSnapshot = (requiresAuth: boolean): ActivatedRouteSnapshot =>
  ({
    data: { requiresAuth },
  }) as unknown as ActivatedRouteSnapshot;

describe('authGuard', () => {
  beforeEach(() => {
    window.localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
  });

  it('allows public routes through', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard(routeSnapshot(false), {
        url: '/explore',
      } as never),
    );

    expect(result).toBe(true);
  });

  it('redirects unauthenticated users away from protected routes', () => {
    const router = TestBed.inject(Router);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(routeSnapshot(true), {
        url: '/checkout/cart',
      } as never),
    );

    expect(result).not.toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe(
      '/login?returnUrl=%2Fcheckout%2Fcart',
    );
  });

  it('allows authenticated users through protected routes', () => {
    const auth = TestBed.inject(MockAuthService);
    auth.initialize();
    auth.login();

    const result = TestBed.runInInjectionContext(() =>
      authGuard(routeSnapshot(true), {
        url: '/checkout/cart',
      } as never),
    );

    expect(result).toBe(true);
  });
});
