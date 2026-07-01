import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MockAuthService } from './mock-auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  if (route.data?.['requiresAuth'] !== true) return true;

  const auth = inject(MockAuthService);
  if (auth.canAccessProtectedRoute()) return true;

  return inject(Router).createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
