# @scora/trust-scoring

Layer assessment, evidence clustering, and explainable Trust / Risk / Confidence scoring.

```
features  →  layer assessments  →  clusters  →  Trust / Risk / Confidence
                                                    you are here
```

This is the only stage permitted to form a judgement — and it is deliberately constrained in how.

---

## The three outputs

| Score | Meaning |
|-------|---------|
| **Trust** 0–100 | How well the evidence supports that the developer owns and understands the work |
| **Risk** 0–100 | *Corroborated* concern. Rises only from fired clusters |
| **Confidence** 0–100 | How much the evidence justifies believing the other two |

Confidence is computed from evidence quality **alone** and never borrows from Trust. That keeps
"confidently trustworthy" and "probably fine, but we barely saw anything" distinguishable — a
distinction a single blended score would destroy.

---

## Risk can only come from a cluster

There is **no code path** from a single feature to a non-zero Risk score. Risk originates
exclusively from *clusters*: named patterns requiring several independent conditions to hold.

Two structural rules are enforced at fire time, not just declared:

1. **Cross-layer corroboration.** A cluster fires only when the satisfied conditions come from
   **≥2 distinct layers**. Two conditions reading the same layer are one signal stated twice.
2. **Minimum conditions.** Every cluster's `minimumConditions` exceeds the count of conditions in
   its most-represented layer — so no single layer can establish a pattern by itself.

A test asserts rule 2 holds for every cluster in the catalogue. This is what makes
*"large paste = cheating"* structurally impossible rather than merely discouraged.

### The catalogue

| Cluster | Needs | Layers | Max severity |
|---------|-------|--------|--------------|
| `unverified_external_import` | 3 of 4 | External + Typing + Evolution + Runtime | 0.80 |
| `assistance_dependence` | 3 of 4 | Assistance + Typing + Runtime | 0.55 |
| `environment_integrity_compromise` | 3 of 3 | Environment + System | 0.60 |
| `absent_development_process` | 3 of 4 | Evolution + Typing + Runtime | 0.50 |

Severity ceilings are graded by how ordinary the behaviour is. Accepting IntelliSense output is
normal professional practice, so `assistance_dependence` is capped well below external import.
`absent_development_process` is the weakest by design — a developer transcribing a design they
worked out beforehand produces exactly that shape.

Every cluster's `interpretation` must name **what would exonerate**, and a test enforces it.

### Mitigation actually does something

Contrary evidence is not merely noted — it reduces severity. `evaluateCluster` collects mitigating
features per cluster and damps severity by up to 60%. A reviewer always sees both sides of the
argument in the same place as the accusation.

---

## Anti-false-positive results

Every honest archetype lands on a supportive recommendation with **zero risk** and **zero clusters**:

| Scenario | Trust | Risk | Conf | Fired | Recommendation |
|----------|-------|------|------|-------|----------------|
| Human working alone | 68 | **0** | 56 | 0 | `SUPPORTED` |
| Human + documentation | 67 | **0** | 62 | 0 | `SUPPORTED` |
| Fast expert (60ms/keystroke, instant accepts) | 40 | **0** | 59 | 0 | `SUPPORTED_LOW_CONFIDENCE` |
| Heavy completion use, engaged | 61 | **0** | 59 | 0 | `SUPPORTED` |
| Slow struggling beginner | 79 | **0** | 44 | 0 | `SUPPORTED_LOW_CONFIDENCE` |
| **Dependent session** | 15 | **67** | 64 | 3 | `HUMAN_REVIEW_REQUIRED` |
| Sparse telemetry | 50 | **0** | 27 | 0 | `INSUFFICIENT_EVIDENCE` |

Three guarantees, each with a test:

- **Clarification requires something to clarify.** With no fired cluster and no material risk, the
  engine cannot ask for clarification — flagging someone for having *less positive evidence* would
  turn absence of evidence into an accusation. A developer who solved the task cleanly and quickly,
  hitting no bugs and needing no help, generates little supporting evidence *precisely because they
  did well*.
- **Adverse recommendations are blocked below 45% confidence.** Corroborated concerns on thin
  evidence produce `CLARIFICATION_SUGGESTED`, never `HUMAN_REVIEW_REQUIRED`.
- **One adverse event moves Trust ≤15 points.** Asserted directly: adding a large external paste to
  an honest session cannot swing the outcome, because clusters need corroboration to fire.

---

## Recommendations, not verdicts

```
SUPPORTED · SUPPORTED_LOW_CONFIDENCE · CLARIFICATION_SUGGESTED
HUMAN_REVIEW_REQUIRED · INSUFFICIENT_EVIDENCE
```

Deliberately **not** `APPROVE`/`REJECT`. Layer 10 exists because a human must make that call with the
evidence in front of them; naming these after decisions would quietly relocate the decision into the
algorithm. A test asserts no recommendation is named after a verdict.

Trust is also floored at 15 when risk is present — the engine is not entitled to declare someone
untrustworthy. Below that floor, the recommendation routes to a human instead.

---

## Explainability

Every result answers *"why did this developer get this score"*:

- **Supporting evidence** — ranked features, each citing its event ids
- **Corroborated concerns** — per-condition breakdown with `[x] / [-] / [?]` marks, plus how to read it
- **Mitigating evidence** — shown alongside the concern, not buried
- **Confidence factors** and **limitations** — including a mandatory disclaimer that trust is never certain
- **Suggested interview questions** — a fired cluster is a *question*, not an answer

Two audiences, two renderings. `renderReport()` is for reviewers; `developerFacingSummary()` is the
one sentence a developer sees, and it never names a cluster — nobody should be told by an automated
system that they "triggered the dependence pattern" before a human has looked.

Question wording is policy, not presentation, which is why it lives here rather than in the UI. Tests
assert questions invite explanation and never presuppose wrongdoing.

---

## Interview influence

When Layer 09 has run, `ScoringOptions.understanding` feeds in. It is weighted by how many questions
were actually asked, so one bad answer never carries the weight of twelve. A strong explanation can
**discharge** a fired cluster; a failed one can lower an otherwise clean session. That is the design
intent: explaining your own work is the most direct evidence of ownership available.

---

## Usage

```ts
import { score, renderReport } from '@scora/trust-scoring'

const result = score(extraction, {
  understanding: { interviewScore, consistencyWithCode, questionsAsked },  // optional
})

result.trust            // 0–100
result.risk             // 0–100, non-zero only if a cluster fired
result.recommendation   // never APPROVE/REJECT
result.clusters.filter(c => c.fired)
console.log(renderReport(result))
```

Scoring is deterministic and stamped with `policyVersion`, so a stored score stays interpretable
after the policy changes.
