# @scora/trust-features

Turns an immutable evidence stream into explainable, per-layer feature vectors for **Layers 01–07**.

This stage **measures**. It does not judge. No weighting, no absolute thresholds, no verdicts —
those belong to scoring, which runs later and can weigh all layers together. That is the only
honest place to decide whether signals corroborate one another.

```
Events  →  [ features ]  →  Layer Assessments  →  Trust / Risk / Confidence
             you are here
```

---

## The feature contract

Every feature carries the event ids that produced it. Any number appearing in a report can be
traced back to the exact evidence behind it — without that link, an explanation is just an assertion.

```ts
interface Feature {
  name:       string          // 'assist.post_acceptance_engagement_rate'
  layer:      TrustLayer
  kind:       RATIO | COUNT | DURATION | RATE | INDEX
  polarity:   SUPPORTIVE | NEUTRAL | CONTEXTUAL | RISK_CONTRIBUTING | CONFIDENCE_AFFECTING
  value:      number | null   // null = no evidence to compute it, NOT zero
  sampleSize: number          // how much evidence backed it
  confidence: Unit            // saturating; one observation can never look certain
  evidence:   EventId[]       // the trail
  note:       string          // human-readable, for the reviewer dashboard
}
```

**`null` is not `0`.** A developer who was never shown a completion has a *null* acceptance rate,
not a rate of zero. Conflating those would let absent evidence masquerade as a measured result.

Each feature also has a static `FeatureDefinition` recording its inputs, calculation and — most
importantly — its **interpretation**: how it should and should not be read. A test enforces that
every risk-contributing feature's interpretation explicitly states it cannot stand alone.

---

## 67 features across seven layers

| Layer | Features | Risk-contributing |
|-------|----------|-------------------|
| L01 Environment | 8 | `runtime_integrity_violations`, `device_context_changes` |
| L02 Interaction | 9 | — none possible |
| L03 Typing | 11 | `unexplained_insertion_ratio` |
| L04 Code Evolution | 9 | — |
| L05 Runtime | 11 | — |
| L06 External | 9 | `unadapted_import_count` |
| L07 Editor Assistance | 10 | `dependency_index` |

**5 of 67 features can contribute to risk.** The list is asserted in a test: adding a sixth is a
policy decision that breaks the build.

---

## What the design protects against

### Fast typing is not evidence

There are no absolute speed thresholds anywhere. `typing.rate_vs_baseline` compares a developer
against **their own history** and returns `null` when there is none — it never falls back to a
population average, because that would penalise anyone atypical. `typing.insertion_baseline_multiple`
degrades to a within-session comparison and **halves its own confidence** when it does, because that
is a materially weaker claim.

### Pasting is not evidence

`typing.paste_volume_ratio` is `NEUTRAL`. `typing.internal_paste_ratio` is `SUPPORTIVE` — moving your
own code around is ordinary refactoring. Only `unexplained_insertion_ratio` is risk-contributing, and
it excludes anything sourced from an editor completion or a file import.

### Using the editor is not evidence

Layer 07 covers **editor-level assistance** — completions and inline suggestions, VS Code +
IntelliSense. There is no conversational assistant in the sandbox, so there is nothing here about
prompts or generated solutions.

`assist.acceptance_rate` and `assist.assisted_character_ratio` are `NEUTRAL` **by policy**. The
latter is the number a naive system would misuse as an "AI percentage"; it describes tooling usage,
not trustworthiness. What the layer actually measures is control:

```
assisted     accept → modify → test → understand
dependent    accept → leave untouched → never verify → cannot explain
```

`dependency_index` is conjunctive by design: it requires a **substantial** suggestion (≥3 lines)
**and** near-instant acceptance (<400ms) **and** no subsequent modification, deletion or test.
Accepting a one-line completion in 300ms is exactly how autocomplete works and scores zero.

### Consulting references is not evidence

`external.visit_count` and `external.ai_tool_visit_count` are both `NEUTRAL`.
`external.documentation_ratio` and `external.study_ratio` (returning to a reference) are
`SUPPORTIVE`.

SCORA does not claim it can reliably observe external AI use — a developer with a second device is
invisible. `ai_tool_visit_count` therefore caps its own confidence at **0.4**, and a test enforces
that. Building a system that depends on catching that would be both ineffective and unfair to the
honest developers it misclassifies.

`external.unadapted_import_count` needs an external correlation **and** absent adaptation **and**
absent verification. Any one alone is ordinary behaviour.

### Losing telemetry is not evidence

Gaps, outages and clock drift feed `CONFIDENCE_AFFECTING` features only. A flaky network says nothing
about a developer. `LayerFeatures.coverage` reports how much of a layer could be computed at all, so
"we saw nothing" never silently reads as "nothing to see".

---

## Test coverage

108 tests. The load-bearing ones are the archetype scenarios:

| Archetype | Assertion |
|-----------|-----------|
| Human working alone | trips **no** risk feature |
| Human + documentation | trips **no** risk feature |
| Fast developer + completions | trips **no** risk feature (60ms/keystroke, instant accepts) |
| Genuinely dependent session | flags each signal **separately**, never as a verdict |

Plus explicit guards: pasting your own code, reworking a large completion, a completion-sourced bulk
insertion, a first-time developer with no history, an 80-second telemetry outage, leaving the window
twice, and a 5-minute idle period — none may produce an adverse signal.

Synthetic events in tests are put through the **real** `validateSubmission` before sealing, so a test
cannot assert on a payload shape the engine would reject in production.

---

## Usage

```ts
import { extractFeatures } from '@scora/trust-features'

const result = extractFeatures(events, {
  tenantId, sessionId, developerId, taskId,
  baseline,            // optional; features degrade gracefully and lower their own confidence
})

result.layers                              // per-layer features + coverage + gaps
result.featuresByName.get('assist.dependency_index')
result.all.filter(f => f.polarity === 'RISK_CONTRIBUTING')
```

Extraction is **pure and deterministic** — the same events always produce the same features. That
property is what lets the calibration harness replay thousands of synthetic sessions and compare
scoring changes meaningfully.
