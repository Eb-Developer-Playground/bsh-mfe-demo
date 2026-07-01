# CHECKOUT CART STATE GUIDE

## OVERVIEW
This directory owns cart state synchronization. It keeps cart signals, localStorage persistence, same-tab event propagation, and cross-tab storage updates consistent.

## STRUCTURE
```text
store/
├── cart-bus.ts        # channel + serialization + storage-event bridge
├── cart-store.ts      # signal store and mutation API
├── cart-bus.spec.ts
└── cart-store.spec.ts
```

## WHERE TO LOOK
| Task | File | Notes |
| --- | --- | --- |
| Change cart event contract | `cart-bus.ts` | `cart:updated` is the public checkout state channel |
| Change persistence format | `cart-bus.ts` | `parseCart` / `serializeCart` must stay inverse-compatible |
| Change add/remove/clear semantics | `cart-store.ts` | Mutations flow through `persist()` |
| Debug desync between slices or tabs | `cart-bus.ts`, `cart-store.ts` | Check both bus subscription and storage bridge |

## CONVENTIONS
- `CartStore` is signal-based and rooted in `providedIn: 'root'`.
- All mutations end in `persist(items)` so storage and bus emission stay aligned.
- `cartUpdated` is for synchronization, not arbitrary business events.
- Local storage is best-effort; unavailable storage is intentionally ignored.

## ANTI-PATTERNS
- Do not update `_lineItems` directly outside `persist()` for write paths.
- Do not change the serialized cart wire format casually; it affects storage recovery and cross-tab sync.
- Do not emit `cart:updated` from unrelated features with ad hoc payloads; keep the contract `{ items }` stable.
- Do not remove the storage-event listener unless you replace cross-tab sync with something equivalent.

## TESTING
- Keep `cart-bus.spec.ts` and `cart-store.spec.ts` updated with any payload or persistence change.
- For event-bus failures in tests, confirm the shared registry stub from `libs/event-bus/src/testing/install-registry-stub.ts` is still wired by the test builder.

## NOTES
- This is the checkout remote's real state boundary; the surrounding features mostly observe or trigger it.
- Same-tab sync comes from the event bus; cross-tab sync comes from the browser `storage` event. Both matter.
