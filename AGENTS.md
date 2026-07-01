# PROJECT KNOWLEDGE BASE

**Generated:** 2026-07-01 Africa/Nairobi
**Git metadata:** unavailable locally (workspace not opened as a git repo)

## OVERVIEW
Angular 21 micro-frontend workspace for the Tractor Store reference app. One host owns routing and runtime composition; three remotes ship custom elements and communicate through typed event channels, not direct imports.

## STRUCTURE
```text
bsh-mfe-demo/
├── projects/
│   ├── host/       # shell; router, nav registry, remote loading
│   ├── explore/    # catalog, header/footer, stores, recommendations
│   ├── decide/     # product detail flow
│   └── checkout/   # cart, mini-cart, add-to-cart, checkout flow
├── libs/
│   ├── event-bus/  # typed channels on window.__NF_REGISTRY__
│   ├── navigation/ # intent types + [appNavigateTo]
│   ├── url/        # path/query/route-param helpers
│   ├── federation/ # slice loader + env helpers
│   ├── ui/         # shared button/spinner
│   └── logging/    # simple console logger; low-value utility
├── docs/           # architecture, navigation, feature ownership
└── public/cdn/     # shared fonts, images, helper assets
```

## WHERE TO LOOK
| Task | Location | Notes |
| --- | --- | --- |
| Understand the system first | `docs/README.md`, `docs/architecture.md`, `docs/navigation.md`, `docs/features.md` | Canonical vocabulary and boundaries |
| Host bootstrap | `projects/host/src/main.ts`, `projects/host/src/app/bootstrap.ts` | Registry must exist before federation init |
| Dynamic routing and intent resolution | `projects/host/src/app/nav/` | Highest-leverage host seam |
| Remote shell mounting | `projects/host/src/app/loader/remote-shell.component.ts` | Turns routes into `<mfe-*>` elements |
| Cross-MFE events | `libs/event-bus/src/lib/` | `defineChannel`, nav/store channels |
| Intent-based links | `libs/navigation/src/lib/navigate-to.directive.ts` | Emits `nav:navigate`, renders real `href` |
| URL and route-param helpers | `libs/url/src/lib/` | Shared pure helpers; used everywhere |
| Remote loading contract | `libs/federation/src/lib/federation.ts` | `createSliceLoader`, `ComponentBootstrap` |
| Explore data mapping | `projects/explore/src/core/data/` | Contracts → HTTP → mappers |
| Checkout cart state | `projects/checkout/src/core/data/store/` | `cart:updated`, localStorage sync |
| Test fixtures and stubs | `projects/*/src/testing/`, `libs/event-bus/src/testing/` | Project-local fixtures; shared registry stub |

## CODE MAP
| Symbol | Type | Location | Role |
| --- | --- | --- | --- |
| `appConfig` | provider factory | `projects/host/src/app/app.config.ts` | Wires env, slice loader, router, zoneless mode |
| `setupShellNavigation` | orchestration function | `projects/host/src/app/nav/setup-shell-nav.ts` | Loads remote contributions, broadcasts intents, resets routes |
| `NavRegistry` | class | `projects/host/src/app/nav/nav-registry.ts` | Resolves intent + payload into concrete URLs |
| `defineChannel` | factory | `libs/event-bus/src/lib/event-bus-setup.ts` | Typed wrapper around federation registry |
| `NavigateToDirective` | directive | `libs/navigation/src/lib/navigate-to.directive.ts` | Intent-driven navigation surface for templates |
| `createSliceLoader` | factory | `libs/federation/src/lib/federation.ts` | Lazy, idempotent remote custom-element loader |
| `CartStore` | service | `projects/checkout/src/core/data/store/cart-store.ts` | Cart signal store with bus + localStorage sync |

## CONVENTIONS
- Standalone Angular only. No NgModules.
- Zoneless globally via `provideZonelessChangeDetection()`.
- `@ng-internal/*` path aliases are the only shared code entry points.
- Apps do **not** import from other `projects/*` apps.
- Public library entrypoints are `src/public-api.ts`, not ad hoc deep imports.
- Feature layout is consistent: `features/` for UI slices, `core/` for data/contracts, `testing/` for local fixtures/stubs.
- Tests use Vitest + jsdom through Angular's unit-test builder.
- Formatting baseline comes from `.editorconfig`: 2 spaces, single quotes in TS.

## ANTI-PATTERNS (THIS PROJECT)
- Do not hard-code cross-MFE URLs like `/checkout/cart`; use intent IDs via `[appNavigateTo]` or `navigateTo.emit`.
- Do not import one remote from another at source level. Share only through `libs/*`, custom elements, or typed channels.
- Do not touch `window.__NF_REGISTRY__` directly from features; define/import channels in `@ng-internal/event-bus`.
- Do not move business/domain logic into shared libs. Shared libs are for contracts, wiring, or UI primitives.
- Do not register custom elements without guarding `customElements.get(tag)` first.
- Do not break bootstrap order in `projects/host/src/main.ts`; the registry must exist before any channel definition runs.
- Do not pass route data via generic DOM attributes like `id`, `title`, or `style`; use `routeParams` helpers.

## UNIQUE STYLES
- Three load-bearing contracts define the architecture: custom elements, typed event channels, intent-based navigation.
- `@ng-internal/federation` is intentionally bundled locally per app; unlike the other libs, it is not treated as a shared singleton contract.
- The host builds its router config at runtime from remote `nav-contribution` modules; routes are not statically authored up front.
- Some remotes load other remotes directly through the injected slice-loader closure; the host is not the only composition point.

## COMMANDS
```bash
pnpm install
pnpm start:all
pnpm ng serve host
pnpm ng serve explore
pnpm ng serve decide
pnpm ng serve checkout
pnpm ng test host --watch=false
pnpm ng test explore --watch=false
pnpm ng test decide --watch=false
pnpm ng test checkout --watch=false
pnpm ng build host
```

## HOTSPOT GUIDES
- `projects/host/src/app/nav/AGENTS.md`
- `projects/explore/src/core/data/AGENTS.md`
- `projects/checkout/src/core/data/store/AGENTS.md`

## NOTES
- `pnpm-workspace.yaml` lists `apps/*`, but the real workspace lives under `projects/*`.
- `dist/` is generated output; do not treat it as source-of-truth documentation.
- The shared test registry stub lives in `libs/event-bus/src/testing/install-registry-stub.ts`; it is required for channel definitions in tests.
- `libs/logging` exists but is currently low-impact compared with the event, navigation, and federation libraries.
