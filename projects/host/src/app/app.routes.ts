import { Routes } from '@angular/router';

export const hostRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login.page').then((m) => m.LoginPage),
  },
];
