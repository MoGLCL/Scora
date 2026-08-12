# @scora/trust-skills — Layer 08: skill & technical understanding

Reconciles the skills a developer **claimed** against what the session **evidenced**,
and answers one question per claim: corroborated, contradicted, or neither.

The output is a `SkillAssessment` — findings, coverage, limitations — that feeds
Layer 09 (the interview) and contributes to the Trust score through the two bridge
functions. This package does **not** depend on `@scora/trust-scoring`; it produces
plain data and a small numeric bridge instead.

## The two rules everything here follows

**Absence of evidence is not evidence of absence.** A session that never touched
PostgreSQL says nothing about a claimed PostgreSQL skill. The verdict for that is
`NOT_EXERCISED` — distinct from `CONTRADICTED`, carrying **no penalty**, reported as
its own number rather than folded into a percentage. A reviewer who reads three
`NOT_EXERCISED` lines as three failures has been misled by the report, not by the
developer.

**A claim is not a lie because it is unproven.** Self-assessment runs one step
high more often than it runs one step low. A single-step shortfall is ordinary
noise and reads as `PARTIALLY_CORROBORATED`, not as dishonesty.

## Verdicts

| Verdict | Meaning | Effect on standing |
| --- | --- | --- |
| `CORROBORATED` | Evidence met or exceeded the claim | 1.0 |
| `PARTIALLY_CORROBORATED` | Evidenced level sits below the claim | 1 − gap × 0.2, floor 0.4 |
| `NOT_EXERCISED` | Nothing in the session touched this skill | excluded from the mean |
| `CONTRADICTED` | Wide gap, ≥2 layers, and a failed challenge | 0.1 |
| `INDETERMINATE` | Telemetry too thin to read either way | 0.5 |

`CONTRADICTED` requires **all three**: a level gap wider than the tolerated range,
counter-evidence from at least two layers, and at least one **failed verification
challenge**. Behavioural counter-evidence alone — regressions, unresolved errors,
heavy revision — describes a hard afternoon at least as well as it describes an
overstated skill, and can never produce `CONTRADICTED` by itself.

## Attribution

Observations are attributed **only through links the producer stated**: the
`targetSkills` list on `TASK_STARTED` and the `skillId` on a
`VERIFICATION_CHALLENGE_RESULT`. This module never guesses from a filename, a
language name, or a file extension.

That is a deliberate choice to under-attribute. Inferring "they edited
`queries.sql`, so this is their SQL skill" would generate confident-looking
observations from filename coincidence, and a coincidence is exactly what a
report is not allowed to be built on. The cost is missed observations; the
alternative is accusations the developer cannot defend against.

Task windows are bounded by **`chainPosition`, not timestamps** — timestamps come
from the client, so a window an attacker can stretch is a window they can fill
with someone else's good work. An unsubmitted task stays open to the end of the
log rather than being dropped.

## Observers

| Event | Kind | Weight | Confidence |
| --- | --- | --- | --- |
| Fully passing test run in a task window | `SUPPORTING` (L05) | 0.6 | 0.75 |
| `ERROR_RESOLVED` in a task window | `SUPPORTING` (L05) | 0.3 + 0.15/error, cap 0.8 | 0.8 |
| `REFACTOR_DETECTED` in a task window | `SUPPORTING` (L04) | 0.5 | 0.65 |
| Regression **and** an unresolved error in a window | `COUNTER` (L05) | 0.4 | 0.5 |
| Passed challenge | `DEMONSTRATED` (L08) | max(0.5, score) | 0.9 |
| Failed challenge | `CHALLENGE_FAILED` (L08) | max(0.5, 1 − score) | 0.9 |

Deliberately **not** observed: typing speed, paste size, completion acceptance
rate. Editor mechanics do not measure technical understanding, and the spec
forbids treating them as if they did.

## The bridge to scoring

```ts
import { skillStanding, skillConfidence } from '@scora/trust-skills';

// null — not zero. Nothing was exercised; that is an absence, not a judgement.
const standing: Unit | null = skillStanding(assessment);
const confidence: Unit = skillConfidence(assessment);
```

`skillStanding` averages only the exercised findings — `NOT_EXERCISED` claims are
excluded rather than counted as neutral, so a developer who lists ten skills and
demonstrates the two that were tested scores the same as one who listed two and
demonstrated both. `skillConfidence` scales the mean finding confidence by the
coverage ratio: high confidence in two findings out of nine claims is not high
confidence in the developer's skill profile.

## The output that actually matters

`NOT_EXERCISED` and `INDETERMINATE` findings carry a `nextStep`. `suggestedQuestions`
collects them into the prompt for Layer 09:

```ts
const questions: readonly string[] = suggestedQuestions(assessment);
```

A question generated from the session (a skill the session never touched, a claim
the telemetry could not resolve) cannot be prepared for in advance — which is what
makes it evidence. The interview layer reads this, not the raw events.

## Assessment shape

```
SkillAssessment
 ├─ assessedAt, policyVersion
 ├─ findings: SkillFinding[]     — one per claimed skill
 │    ├─ claim, verdict, evidencedLevel, levelGap
 │    ├─ confidence, layersCorroborating
 │    ├─ observations, evidence  — every observation traces to event ids
 │    ├─ summary, nextStep
 ├─ coverage: SkillCoverage      — claimed / exercised / notExercised / ratio
 └─ limitations: string[]        — ordered by how badly each distorts the report
```

`limitations` is not decoration. It leads with coverage, warns when every finding
rests on incidental behaviour rather than designed challenges, and says outright
when the layer has verified nothing in either direction.

## Guarantees enforced by tests

| Guarantee |
| --- |
| An unexercised claim is `NOT_EXERCISED`, never `CONTRADICTED`, with `levelGap: 0` |
| `NOT_EXERCISED` is excluded from the standing, never averaged in as a failure |
| Counter-evidence from a single layer can never produce `CONTRADICTED` |
| Behavioural counter-evidence without a failed challenge can never produce `CONTRADICTED` |
| A one-step level gap reads as `PARTIALLY_CORROBORATED` noise with no next step |
| A wide shortfall produces an interview question, not a conclusion |
| Work is attributed only through producer-declared links |
| A link to a skill that was never claimed is ignored |
| Work outside any task window is ignored |
| Windows are bounded by `chainPosition`, not client timestamps |
| An unsubmitted task stays open to the end of the log |
| The developer's most recent claim wins; mid-session self-correction is honoured |
| Thin evidence is `INDETERMINATE`, checked before any level comparison |
| A passed challenge with assistance available is still `DEMONSTRATED` |
| Coverage leads `limitations` when most claims went untested |
| `skillStanding` returns `null` — not zero — when nothing was exercised |
| Confidence scales with coverage and can never reach 1 |

## Usage

```ts
import { assessSkills } from '@scora/trust-skills';

const assessment = assessSkills(events, {
  assessedAt: nowEpochMs(),
  // optional: toleratedLevelGap: 1,
  // optional: minimumConfidenceToJudge: 0.35,
});
```
