# The Tractor Store — Angular & Native Federation

A reference micro-frontend (MFE) implementation of [The Tractor Store][tractor-store],
built with Angular 21 (zoneless), [Native Federation v4][nf-v4], and Web
Components. It follows the [Tractor Store Blueprint][blueprint] so it can
be compared head-to-head with implementations in other frameworks.

**Live demo:** [native-federation.github.io/playground](https://native-federation.github.io/playground/)

[tractor-store]: https://micro-frontends.org/tractor-store/
[nf-v4]: https://www.npmjs.com/package/@angular-architects/native-federation-v4
[blueprint]: https://github.com/neuland/tractor-store-blueprint

## What this project demonstrates

Three teams ship three Angular applications into one page, deploy them
independently, and never import each other's code. Three ideas hold the
boundary in place:

- **Custom elements as the integration surface.** Every remote registers
  its UI as `<mfe-*>` web components. Other apps drop the tag into their
  HTML — no Angular type, RxJS Observable, or service crosses the line.
- **A central event bus on `window.__NF_REGISTRY__`.** Remotes publish
  and subscribe to small, stable, *typed* channels instead of calling
  each other directly. Navigation, store selection, and cart sync all
  ride on this bus, and every channel is defined the same way:
  `defineChannel<Payload>('channel:name')`.
- **Intent-based navigation.** A button in *decide* that should open the
  cart never types `'/checkout/cart'`. It emits the intent
  `'checkout.cart'` via the `[appNavigateTo]` directive; the host owns
  the URL.

Each idea is documented in detail under [`docs/`](./docs/) — start there
if you want the why and how.

## Documentation

| Document                                       | What's in it                                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [docs/README.md](./docs/README.md)             | Overview, mental model, and a "where does X live" index. **Start here.**                                           |
| [docs/architecture.md](./docs/architecture.md) | The host/remote contract, the three decoupling mechanisms (custom elements, event bus, intent navigation), and the shared-libraries policy. |
| [docs/navigation.md](./docs/navigation.md)     | The intent-based navigation system — how `[appNavigateTo]` + a host-owned registry replace cross-MFE URL hard-coding. |
| [docs/features.md](./docs/features.md)         | Catalogue of what each team ships, the events they speak, and the cross-remote dependencies between them.          |

## Technologies at a glance

| Aspect                      | Solution                                                |
| --------------------------- | ------------------------------------------------------- |
| 🛠️ Frameworks, libraries    | [angular] (zoneless), [native-federation-v4][nf-v4]     |
| 📝 Rendering                | CSR (client-side rendering)                             |
| 🐚 Application shell        | Host app with route-based shell components              |
| 🧩 Client-side integration  | Custom elements ([@angular/elements]) loaded as remotes |
| 🧩 Server-side integration  | None (static hosting)                                   |
| 📣 Communication            | Typed event channels on `window.__NF_REGISTRY__`        |
| 🗺️ Navigation               | SPA inside host, intent IDs across remotes              |
| 🎨 Styling                  | Self-contained SCSS (one bundle per remote)             |
| 🍱 Design system            | Shared UI library (`@ng-internal/ui`)                   |
| 🔮 Discovery                | Runtime manifest (`federation.manifest.json`)           |
| 🚚 Deployment               | Docker images via Azure Container Registry & Azure Pipelines |
| 🐳 Containerisation          | Multi-stage Docker builds per app, `docker compose` for local dev |
| 👩‍💻 Local development        | [angular-cli], [concurrently], [http-server], or `docker compose` |

[angular]: https://angular.dev/
[@angular/elements]: https://angular.dev/guide/elements
[angular-cli]: https://angular.dev/tools/cli
[concurrently]: https://github.com/open-cli-tools/concurrently
[http-server]: https://github.com/http-party/http-server

## Project structure

The workspace contains four Angular applications and six libraries:

```
tractor-store/
├── projects/
│   ├── host/         # Shell application — owns routing & remote loading
│   ├── explore/      # Catalog, recommendations, header/footer chrome
│   ├── decide/       # Product detail page
│   └── checkout/     # Cart, checkout flow, mini-cart, add-to-cart
├── libs/
│   ├── event-bus/    # @ng-internal/event-bus  — defineChannel factory, nav/store channels
│   ├── navigation/   # @ng-internal/navigation — NavigateToDirective, NavContribution types
│   ├── url/          # @ng-internal/url        — RouteParams, path-template, query helpers
│   ├── federation/   # @ng-internal/federation — env config, CDN helper, slice loader factory
│   ├── logging/      # @ng-internal/logging    — console logger service
│   └── ui/           # @ng-internal/ui         — buttons, spinner
├── public/cdn/       # Static fonts and images (served at :3000 in dev)
└── zarf/docker/      # Docker & CI — Dockerfiles, compose, Azure Pipeline, manifests
```

Each remote exposes a handful of fragments (e.g. `mfe-cart`, `mfe-header`,
`mfe-mini-cart`) registered as custom elements via `@angular/elements`.
The host loads these on demand through Native Federation and renders them
inside route-based shell components.

## How to run locally

The workspace uses pnpm. Clone, install, and start everything:

```bash
git clone git@github.com:native-federation/playground.git
cd playground/angular/tractor-store
pnpm install
pnpm start:all
```

`start:all` boots all four apps and the static CDN concurrently:

| Service         | Port |
| --------------- | ---- |
| host (shell)    | 4200 |
| explore         | 4201 |
| decide          | 4202 |
| checkout        | 4203 |
| cdn (fonts/img) | 3000 |

Open <http://localhost:4200> to see the integrated application. Each
remote can also be opened standalone on its own port — Native Federation
will load the sibling fragments it needs from the URLs declared in that
remote's `public/env.config.json`.

You can also serve a single app:

```bash
pnpm ng serve host       # or explore / decide / checkout
```

### Testing

Unit and component tests are written with [Vitest] using `jsdom`. Run the
full suite per project:

```bash
pnpm ng test host --watch=false
```

[Vitest]: https://vitest.dev/

### Docker

Each app has a multi-stage Dockerfile that builds with pnpm and serves via
nginx. A `docker compose` setup runs all four apps and the CDN together:

```bash
cd zarf/docker
docker compose up --build
open http://localhost:4200
```

The compose environment mounts Docker-specific federation manifests
(`zarf/docker/manifests/`) so sibling remotes discover each other
through the published `localhost:420N` ports. Runtime configuration
is handled by `docker-entrypoint.sh`, which reads environment variables
at container start to override `env.config.json` — no image rebuild
needed for different environments.

Each service:
| Service         | Port | Container name     |
| --------------- | ---- | ------------------ |
| host (shell)    | 4200 | tractor-host       |
| explore         | 4201 | tractor-explore    |
| decide          | 4202 | tractor-decide     |
| checkout        | 4203 | tractor-checkout   |
| cdn (fonts/img) | 3000 | tractor-cdn        |

## Deployment

Docker images are built and pushed to Azure Container Registry by
[`zarf/docker/azure-pipelines.yml`](./zarf/docker/azure-pipelines.yml).

### Branch convention

The pipeline detects which app to build from the branch name:

| Branch pattern                 | Builds            |
| ------------------------------ | ----------------- |
| `feature/host-*` / `fix/host-*` | `host` only       |
| `feature/explore-*` / `fix/explore-*` | `explore` only       |
| `feature/decide-*` / `fix/decide-*` | `decide` only        |
| `feature/checkout-*` / `fix/checkout-*` | `checkout` only      |
| `main`                         | All four apps     |

Create branches like `feature/host-product-card` or `fix/explore-search`
and the pipeline will build only that app's Docker image.

### Manual trigger (override)

```bash
az pipelines run --name "docker-build" --parameters app=explore
```

### What each run does

1. Detects the target app (or apps on `main`) from the branch.
2. Logs into ACR via variable group credentials.
3. Builds `zarf/docker/Dockerfile.<app>` with the repo root as build context.
4. Tags and pushes as `$(acrName)/$(app):$(Build.BuildId)` + `:latest`.

### Prerequisites

Create an Azure DevOps [variable group](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups)
named `acr-connection`:

| Variable       | Description                            |
| -------------- | -------------------------------------- |
| `acrName`      | Registry URL (`myregistry.azurecr.io`) |
| `acrUsername`  | Service principal or admin username    |
| `acrPassword`  | Service principal or admin password    |
| `acrRepository`| Optional — image repo name (defaults to the app name) |

Alternatively, uncomment the `AzureCLI@2` task in the pipeline to use a
service connection instead of static credentials.

## Scope and limitations

This implementation focuses on the micro-frontend aspects. The backend is
mocked with in-memory fixtures, error boundaries are minimal, and
bundle-size or chunking optimisations are out of scope. In a real-world
project these aspects deserve more attention.

Open follow-ups:

- [ ] Web performance optimisations (preload critical remotes, deeper code splitting).
- [ ] Error boundaries / fallback UI when a remote fails to load.
- [ ] Wire a real backend instead of static fixtures.

## About the authors

[The Native Federation team](https://native-federation.com/)
