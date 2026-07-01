# HOST NAVIGATION GUIDE

## OVERVIEW
This directory is the host's routing contract layer. It loads remote nav contributions, turns intent IDs into URLs, and rewrites the shell router config at runtime.

## STRUCTURE
```text
nav/
├── load-contributions.ts   # federation load of each remote's nav-contribution module
├── nav-registry.ts         # intent registry + URL resolver
├── remote-routes.ts        # route objects that mount remote shells
├── setup-shell-nav.ts      # orchestration entrypoint
└── provide-shell-nav.ts    # app initializer bridge into Angular DI
```

## WHERE TO LOOK
| Task | File | Notes |
| --- | --- | --- |
| Load remote nav metadata | `load-contributions.ts` | Validates `nav-contribution` shape, warns per-remote on failure |
| Register or debug intents | `nav-registry.ts` | Duplicate IDs warn and overwrite |
| Change runtime router setup | `setup-shell-nav.ts` | Emits `navIntents`, subscribes to `navigateTo`, calls `resetConfig` |
| Change route object shape | `remote-routes.ts` | Boundary into `RemoteShellComponent` |
| Change bootstrap timing | `provide-shell-nav.ts` | Runs via `provideAppInitializer` |

## CONVENTIONS
- `basePath.intentId` is the public ID format. Example: `checkout.cart`.
- `NavRegistry` stays Angular-free on purpose; it accepts a `NavNavigator` function instead of importing Router types deeply.
- The host tolerates missing or invalid remote contributions with warnings; it does not fail the whole shell eagerly.
- Query params are whatever payload keys were not consumed by the path template.

## ANTI-PATTERNS
- Do not hard-code host routes separately from contributions; runtime contribution loading is the source of truth.
- Do not turn duplicate intent warnings into silent behavior changes; collisions are already easy to miss.
- Do not make `NavRegistry` depend directly on Angular Router internals; it is intentionally unit-testable without Angular.
- Do not subscribe to `navigateTo` without handling async failures; `setup-shell-nav.ts` logs navigation errors intentionally.

## TESTING
- Paired `*.spec.ts` files here are the fastest safety net when changing registry behavior.
- Use `projects/host/src/testing/router.stub.ts`, `native-federation.stub.ts`, and nav-contribution fixtures before inventing new doubles.

## NOTES
- This is the sharpest seam in the repo: a small change here can break every remote's navigation story.
- If intent links disappear in the UI, check whether `navIntents.emit(...)` still runs before feature directives subscribe.
