# @scora/trust-baseline

Per-developer behavioural baselines. This package answers one question: **is this
behaviour unusual _for this person_?**

Almost no behavioural measurement means anything in absolute terms. 300
characters per minute is fast for one developer and slow for another. Accepting a
completion in 200ms is reckless for a beginner and routine for someone who has
written that line a thousand times. The only defensible comparison is against
the same person.

## Comparison order

1. **`SELF`** — the developer's own history. The only genuinely fair comparison.
2. **`COHORT`** — matched population (same task, language, claimed level).
3. **`POPULATION`** — all developers in the tenant. Opt-in, low confidence.
4. **`NONE`** — no fair comparison exists, and none is invented.

A developer with no history is **not** compared to the population by default.
`allowPopulationFallback` defaults to `false` and should stay false for anything
affecting a person's outcome. Comparing someone to a population they may
legitimately differ from is how systems end up penalising the self-taught, the
left-handed, or the developer on an unfamiliar keyboard layout.

## Why robust statistics

Everything in `statistics.ts` resists outliers, because assessment samples are
small and genuinely contain them — the session where the developer was
interrupted, the one where the network died, the one where everything went right.

- **MAD instead of standard deviation.** Scaled by 1.4826 so thresholds
  expressed in "sigmas" keep their usual meaning while gaining outlier
  resistance. One extreme session cannot redefine normal.
- **Weighted median for a person's history.** Sessions with partial telemetry
  contribute proportionally less. Returns an actually-observed value rather than
  interpolating.
- **Interpolating median for populations.** Every developer counts once, so
  interpolation is correct there.
- **`robustZScore` returns `null` when MAD is zero.** Identical history at these
  sample sizes almost always means too little data, not perfect consistency.
  Reporting infinite significance would be fabrication.
- **Recency weighting, 90-day half-life.** Developers improve. A year-old session
  describes a different person from the one being assessed today.

## Guarantees enforced by tests

| Guarantee | Test |
| --- | --- |
| No comparison below 4 sessions | `makes no comparison against an unestablished profile` |
| No silent population fallback | `does not fall back to the population by default` |
| A consistently fast developer is never flagged | `does not flag a consistently fast developer` |
| A consistently slow developer is never flagged | `does not flag a consistently slow developer` |
| Own history beats the population | `prefers the developer own history over the population` |
| Differing from strangers is never notable | `never reports a population comparison as notable` |
| Confidence never reaches 1 | `never claims full confidence` |
| One tenant never sees another's data | `isolates tenants` |
| No risk feature is ever tracked | `tracks no risk-contributing feature` |

## No history of suspicion

`TRACKED_FEATURES` deliberately excludes every risk-contributing feature —
nothing matching `unexplained`, `unadapted`, `dependency_index`,
`integrity_violation`, or `device_context` is ever persisted to a profile.

A baseline exists to interpret behaviour fairly, not to accumulate a permanent
per-developer record of concerns. Tracking risk features here would invert the
platform's purpose and let one bad session follow someone indefinitely. A test
enforces this.

## Notability threshold

`notableDeviations` defaults to |z| ≥ 3 against a robust estimator, and only ever
considers `SELF` comparisons. Even at that magnitude the generated note says
"a question rather than a finding" — and a test asserts the words *cheat*,
*fraud*, and *suspicious* never appear.

## Usage

```ts
import {
  buildProfile,
  compare,
  notableDeviations,
  observationFrom,
  toExtractionBaseline,
} from '@scora/trust-baseline';

// After a session is extracted, record it.
const observation = observationFrom(extraction, {
  tenantId, developerId, sessionId, observedAt: now,
});

// Rebuild the profile from history (it is derived data — always rebuildable).
const profile = buildProfile(tenantId, developerId, history, { now });

// Feed it back into extraction so Layer 03 can resolve rate_vs_baseline.
const baseline = toExtractionBaseline(profile);

// Compare, and see what (if anything) is worth a reviewer's attention.
const deviations = compareSession(observation, profile);
const notable = notableDeviations(deviations); // usually empty
```

`toExtractionBaseline` returns `null` for every dimension when the profile is not
established, so unestablished baselines cannot leak into feature extraction as
if they were real.

## Storage

`BaselineStore` is intentionally narrow. Profiles are derived data, rebuildable
from the event log at any time, so this is a cache with provenance rather than a
system of record. `inMemoryBaselineStore()` is a legitimate production choice for
small deployments and the right one for the calibration harness, where synthetic
developers must never touch a real tenant's storage.
