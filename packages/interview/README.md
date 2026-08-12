# `@scora/trust-interview` — Layer 09

An adaptive technical interview generated **from the developer's own session**,
with grading that separates *understanding* from *fluency*.

The interview is the layer that most easily lies, so it is built around two
refusals:

> **A question that could be asked of anyone proves nothing.**
> A question must be grounded in a real artefact of this session — an accepted
> completion, a bug that was actually fixed, a dependency that was actually
> added. Without that, the answer could describe any codebase.

> **A wrong answer is not a dishonest answer.**
> Explaining fluently proves little; explaining *under pressure, about code that
> is not yours, without your editor and your error messages in front of you*, is
> hard for an honest developer too. Four independent scores separate "nervous"
> from "didn't write it", and only one of them — `consistencyWithCode` — speaks
> to ownership.

## The port

```ts
export interface Examiner {
  phrase(question: InterviewQuestion): Promise<string>;
  grade(request: GradingRequest): Promise<RawGrade>;
}
```

Everything model-shaped lives behind this port. The engine supplies the
grounding and enforces the rules; the provider supplies language. The model is
**admin configuration**, not code — a tenant without an examiner configured gets
`NOT_CONDUCTED`, never an interview that quietly grades on heuristics.

Two things the port is deliberately **not** given: the developer's identity, and
the Trust score so far. A grader that knows the session is already suspected
will find reasons to agree.

A provider returns a `RawGrade` — plain numbers, **no outcome**. The engine is
the only thing that can produce an `AnswerGrade`, because deciding whether an
answer was consistent is deciding trust, which is not what a model was configured
to do. What a provider can return is discarded when it is not trustworthy:

- `graderConfidence` below the `0.5` floor → `UNGRADED`, rationale preserved.
- `correctness` / `depth` / `specificity` / `consistencyWithCode` /
  `graderConfidence` outside `[0, 1]` → clamped by `normaliseGrade`, the only
  function in the engine that can brand a `Unit`.

## Where questions come from

`planInterview` concatenates generators, keeps only those with non-empty
`groundedIn`, sorts by how many events ground them, and caps the plan at 8.

| Generator | Grounding | Note |
| --- | --- | --- |
| `unverifiedAssistedRegions` | `AI_SUGGESTION_ACCEPTED` | Completions accepted but never modified, tested, or deleted. The region where a question resolves the most uncertainty **in either direction** — not an accusation. `lines < 4` is filtered: asking someone to explain a two-line completion is noise, and reads as harassment. |
| `resolvedErrors` | `RUNTIME_ERROR_OBSERVED` + `ERROR_RESOLVED` | Matched by error signature hash. HARD when the fix took more than 3 attempts. |
| `refactors` | `REFACTOR_DETECTED` | Why the change, and what the change preserved. |
| `dependencies` | `DEPENDENCY_ADDED` | What the dependency does and why it was the right one. |
| `unresolvedSkillClaims` | Layer 08 assessment | `NOT_EXERCISED`, `INDETERMINATE`, or a wide level gap → asked about, grounded in the claim event. Silence on corroborated skills. |

## Grading

`normaliseGrade` maps raw scores to outcomes at the engine's thresholds:
`consistency >= 0.65` → `CONSISTENT`, `<= 0.35` → `INCONSISTENT`, else `PARTIAL`.

`conductInterview` runs the questions **sequentially** so difficulty can adapt.
`adjustDifficulty` is asymmetric on purpose: it refuses to move when the grader
is unsure (`graderConfidence < 0.5` — a grader that is unsure is not evidence
about the developer), rises only at `consistency >= 0.75`, and falls below `0.4`.

## The verdict

`EXPLANATION_INCONSISTENT` — the verdict that sends a human to look for fraud —
requires a **pattern**: at least 2 inconsistent answers **and** more than half of
the graded ones. One low answer out of several high ones is a person
misremembering what they wrote an hour ago.

`NOT_ANSWERED` carries no penalty. Answers under 5 words are not graded.

`summarise`:

- no questions at all → `NOT_CONDUCTED` (contributes nothing, in either
  direction)
- fewer than 2 gradeable answers → `INCONCLUSIVE`
- otherwise: the mean of `consistencyWithCode` over graded answers, clamped,
  with `patternOfInconsistency` overriding to `EXPLANATION_INCONSISTENT`
  - `>= 0.65` → `DEMONSTRATES_OWNERSHIP`
  - else → `PARTIAL_OWNERSHIP` (common, and not adverse)

`confidenceOf` = mean grader confidence × answer rate × breadth — grading a full
interview at high confidence is worth more than one ambiguous answer at high
confidence.

`limitationsOf` always appends:

> Interview performance reflects the ability to explain under time pressure,
> which is not the same as the ability to write code. Treat a weak interview as
> a prompt for human review, never as a finding on its own.

`interviewStanding` returns `null` when `ownership` is `null` — the same rule as
Layer 08. A layer with no evidence lowers Confidence, never Trust. And like
every verdict in SCORA, the interview never claims certainty.

## Not in this package

- The recorder (Layer 05) that answers `collect()` with real keypresses —
  that is the sandbox's job; the interview takes the answers.
- The human review that weak interviews feed — Layer 10, `@scora/trust-review`.
