# EXPLORE DATA LAYER GUIDE

## OVERVIEW
This directory owns Explore's data translation pipeline. Contracts define raw shapes, HTTP services fetch them, and mappers normalize them into UI-facing models.

## STRUCTURE
```text
data/
├── contracts/
│   ├── endpoints/   # endpoint constants and request contracts
│   └── models/      # DTO shapes from fixtures or API responses
├── http/            # fetch-facing resource services and fixtures
└── mappers/         # DTO → view-model normalization
```

## WHERE TO LOOK
| Task | Location | Notes |
| --- | --- | --- |
| Add or change API shape | `contracts/models/`, `contracts/endpoints/` | Start here before touching components |
| Change resource fetching | `http/` | `recommendation-http.ts` is the richest example |
| Change UI-facing model shape | `mappers/` | Mapper specs document the expected projection |
| Find realistic test data | `projects/explore/src/testing/` | Product, category, store, teaser, recommendation fixtures |

## CONVENTIONS
- Keep the pipeline one-way: contract DTOs in, mapped models out.
- HTTP services here stay narrow and feature-specific; they should not absorb presentation logic.
- Mapper files have matching specs for non-trivial shape changes; preserve that pairing.
- Recommendation and list-style data use local stubs/fixtures heavily; update them with schema changes.

## ANTI-PATTERNS
- Do not skip contracts and map raw HTTP objects directly in components.
- Do not mix DTO types with UI model types in the same surface unless the mapping is truly identity.
- Do not hide endpoint or payload shape changes inside fixtures only; update contracts and mapper specs too.
- Do not push cross-MFE concerns into this layer; it is Explore-local data plumbing, not a shared lib boundary.

## TESTING
- Fixtures live in `projects/explore/src/testing/`; reuse them before inventing new inline objects.
- `recommendation.fixture.ts` is tuned for recommendation logic; treat edits there as behavioral changes, not cosmetic cleanup.
- Specs in `mappers/` and `http/` give the quickest regression signal for data-shape work.

## NOTES
- Explore has the densest test and fixture footprint of the remotes.
- If UI work suddenly needs many fallback guards, the real issue is usually an unmapped contract change here.
