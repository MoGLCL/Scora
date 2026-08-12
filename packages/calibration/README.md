# `@scora/trust-calibration` — the harness the engine has to pass

A labelled corpus, the error rates it produces, and the gates that stop a
regression reaching a real developer.

Every other package asks *what does the evidence say about this session?* This
one asks a different question, and it is the question the project's premise
depends on:

> **How often is the engine wrong about someone who did nothing wrong, and who
> exactly are they?**

An aggregate accuracy figure cannot answer that. This package is built so the
answer is always a named list of people.

## The asymmetry is the design

A false positive and a false negative are not two sides of one number here.

- A **false positive** is a developer who owns their work being sent to human
  review. It costs them time, attention, and standing, whether or not the
  reviewer clears them. `NO_FALSE_POSITIVES` is gated to **zero**, with no
  tolerance and no rate — one is a build failure, and the failure names the case.
- A **false negative** is a session a reviewer would have wanted to see, going
  unseen. Recall is gated at `TARGET_RECALL = 0.6`, deliberately loose.

The engine is permitted to miss things. It is not permitted to accuse people.

`CLARIFICATION_SUGGESTED` sits between the two and is not counted as harm: being
asked to explain your own code is a normal part of an assessment, and an engine
forbidden from ever asking a question would have no way to resolve a genuine
ambiguity in the developer's favour. It is not free either, so the gates track it
separately.

## The forbidden rules, as executable tests

The spec forbids four inferences. Each one has a corpus case whose entire purpose
is to trip a system that makes it, and a test that fails if any of them is
escalated *or carries any risk at all*:

| Forbidden rule | Case | What it is really |
| --- | --- | --- |
| Fast typing = AI | `fast-developer`, `assistive-dictation` | A fast typist, and someone using dictation software |
| Paste = cheating | `reuses-own-library` | A developer pasting from a library they wrote |
| External page = cheating | `honest-with-docs`, `external-ai-adapted` | Reading documentation; adapting an answer from an external AI |
| AI usage = cheating | `heavy-assistance-engaged` | Heavy, declared AI use by someone who understands the result |

`degraded-connection` and `minimal-consent` cover the two ways evidence goes
missing without anyone misbehaving — a bad network, and a developer exercising a
consent right. Neither may be read as evasion.

## An empty denominator is not a passing grade

One rule runs through `metrics.ts`: **a rate with no cases under it is `null`,
never `0`.** A false-positive rate of zero across zero honest cases is not a
pass — it is an untested engine, and a harness that reports the two identically
is worse than no harness at all. `MINIMUM_CORPUS` fails the build below
`MINIMUM_CASES`, reporting the corpus itself as the finding.

Subgroups follow the same logic. A trait with one case is reported with the
caveat *treat a clean result there as untested, not as safe*, and traits with no
cases are omitted rather than shown clean.

## Aggregates hide the harm they cause

`NO_SUBGROUP_HARM` evaluates every `CaseTrait` separately, because a 2% false
positive rate is worthless information if all of it lands on developers who
dictate their code. Cases appear in every subgroup they are tagged with, so the
groups overlap and do not sum to the whole — that is intended. The question each
answers is *among developers who dictate, how often are we wrong*, and the answer
must not be diluted by the developers who do not.

## Only overconfidence is gated

Textbook calibration error is symmetric: it treats "claimed 80%, right 40%" and
"claimed 54%, right 100%" as equally wrong. Here they are not remotely equal.

The first is the engine overstating what it knows about a person. The second is
the engine hedging about a developer it turned out to be right about, which costs
that developer nothing. So `CalibrationCurve` reports three numbers —
`expectedCalibrationError` (symmetric, standard, comparable with published
figures), `overconfidenceError`, and `underconfidenceError` — and the
`CALIBRATION_ERROR` gate reads **only the second**.

This is not a technicality. A gate on the symmetric number would fail the current
build for being too modest, and the cheapest way to pass it would be to raise
stated confidence — the exact change `Never claim that Trust is 100% certain`
forbids. Underconfidence is reported as a limitation instead.

`worstOverconfidence` is `null` when no bin was overconfident, not `0`. Zero
would claim a bin sat exactly on the line.

## Ground truth from Layer 10

The corpus tests what someone thought to construct. `fromReviews(events)` does
something the corpus structurally cannot: it turns **recorded human decisions**
into labelled cases, and those are the only labels that can surface a false
positive nobody imagined.

```ts
const cases = fromReviews(await store.read(sessionId));
const missed = confirmedFalsePositives(cases); // engine flagged, a human cleared
```

Two refusals govern it:

- **A decision only becomes a label if it can bear the weight.** `citableOnly`
  defaults to `true` and delegates to Layer 10's own `assessReviewQuality` —
  decided without opening the evidence, or in nine seconds, and it does not
  become a label. Turning it off is a deliberate act.
- **The engine never relabels itself.** Nothing here reads the engine's score to
  decide a label. That would be a system marking its own homework, and the rates
  would converge on whatever it already believed.

`REQUEST_REVIEW` produces no label. A reviewer asking for more work has not
concluded anything, and forcing that into a binary invents a judgement they
declined to make.

`overrideRates` reports **both readings** of a falling override rate — the engine
improving, or reviewers deferring to it — because the number cannot distinguish
them and a summary that picked one would mislead. Perfect agreement across 20+
decisions is reported as a finding, not a success.

`ReviewCase` carries `tenantId` so a corpus can be scoped to one customer.
Without it, labels from every tenant would pool into one corpus and one tenant's
reviewers would silently calibrate the engine for another's — a tenant isolation
breach wearing the costume of a larger sample.

## Running it

```bash
npm run calibrate --workspace @scora/trust-calibration   # report to stdout, non-zero on failure
npm test --workspace @scora/trust-calibration            # 56 tests
```

The report prints in full on success as well as on failure. A green run that
prints nothing teaches people the harness is noise; a green run that prints its
limitations teaches them what the pass does and does not mean.

## What a green run does not mean

`limitationsOf` is unconditional — the caveats print on every report, including a
clean one, and cannot be suppressed. Currently they say, among other things:

> These rates describe the corpus, not the world. A synthetic case tests what
> someone thought to construct, so this harness can only find false positives
> that were imagined in advance.

> The corpus cannot be used to claim an accuracy figure for the engine, and no
> figure derived from it should be quoted to a customer or to a developer.

> The engine was right about every scored case, so the calibration curve has no
> incorrect predictions to calibrate against. At this size the calibration error
> is a restatement of the corpus being easy.

Fourteen synthetic cases are a smoke test for the failure modes we could name.
The harness becomes a measurement when `fromReviews` is fed real reviewed
sessions, and not before.
