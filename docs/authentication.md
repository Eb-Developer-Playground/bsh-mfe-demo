# Authentication

Authentication in the Tractor Store is host-owned. The shell keeps the
session, decides which routes are protected, owns the login screen, and
returns the user to the originally requested URL after login succeeds.

Remotes do not own auth state. They subscribe to the host's auth
snapshot and emit small requests back to the host when they need login
or logout.

## The runtime contract

The host owns four pieces:

- the single auth source of truth (`MockAuthService`)
- protected-route enforcement (`authGuard`)
- the `/login` route
- the `returnUrl` redirect-back flow

Relevant files:

- `projects/host/src/app/auth/mock-auth.service.ts`
- `projects/host/src/app/auth/auth.guard.ts`
- `projects/host/src/app/auth/login.page.ts`
- `projects/host/src/app/app.routes.ts`

## Public vs protected routes

Only **explore** is public.

Public:

- `/explore/`
- `/explore/products`
- `/explore/products/{category}`
- `/explore/stores`
- `/login`

Protected:

- `/decide/product/{id}`
- `/checkout/cart`
- `/checkout/checkout`
- `/checkout/thanks`

The host reads `requiresAuth?: boolean` from each remote's
`nav-contribution` and applies the guard when building runtime routes.

## Redirect flow

When an anonymous user opens a protected route:

1. `authGuard` checks `MockAuthService.canAccessProtectedRoute()`.
2. If access is denied, the guard returns a `UrlTree` for:

   ```text
   /login?returnUrl=<original-url>
   ```

3. The login page reads `returnUrl` from the query string.
4. After successful login, the host navigates back with
   `router.navigateByUrl(returnUrl)`.

Unsafe `returnUrl` values are normalized back to `/explore`.

## Auth channels

Auth state crosses MFE boundaries through typed channels on
`window.__NF_REGISTRY__`.

| Channel | Direction | Purpose |
| --- | --- | --- |
| `auth:state` | host → remotes | Broadcast the current auth snapshot |
| `auth:login-request` | remotes → host | Ask the host to simulate login |
| `auth:logout-request` | remotes → host | Ask the host to simulate logout |

The channel definitions live in `libs/event-bus/src/lib/auth-event-bus.ts`.

## What remotes may do

Remotes may:

- subscribe to `auth:state`
- show authenticated / anonymous UI
- emit `auth:login-request`
- emit `auth:logout-request`

Remotes must not:

- declare their own login routes
- persist their own auth session
- bypass host route protection
- import host auth services directly
