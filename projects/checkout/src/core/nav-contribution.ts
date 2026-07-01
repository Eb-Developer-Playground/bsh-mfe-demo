import { NavContribution } from '@ng-internal/navigation';

export const navContribution: NavContribution = {
  source: '@tractor-store/checkout',
  basePath: 'checkout',
  intents: [
    { id: 'cart', path: '/cart', element: 'mfe-cart', requiresAuth: true },
    { id: 'checkout', path: '/checkout', element: 'mfe-checkout', requiresAuth: true },
    { id: 'thanks', path: '/thanks', element: 'mfe-thanks', requiresAuth: true },
  ],
};
