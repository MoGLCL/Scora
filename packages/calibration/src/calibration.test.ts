import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HumanReviewEventType, TrustEventType, type TrustEvent } from '@scora/trust-core';
import {
  TEST_DEVELOPER,
  TEST_SESSION,
  TEST_TENANT,
  buildSession,
  type EventSpec,
} from '@scora/trust-features/testing';
import { POLICY_VERSION, RECOMMENDATION, type Recommendation } from '@scora/trust-scoring';
import { ReviewDecision } from '@scora/trust-review';
import {
  CaseLabel,
  CaseTrait,
  Consequence,
  LabelSource,
  type CaseOutcome,
  type LabelledCase,
} from './contract.ts';
import { CORPUS } from './corpus.ts';
import {
  GATE,
  MAXIMUM_CALIBRATION_ERROR,
  MINIMUM_CASES,
  TARGET_RECALL,
  evaluate,
  limitationsOf,
} from './gates.ts';
import {
  bySubgroup,
  calibrationCurve,
  consequenceOf,
  isCorrect,
  rates,
  tally,
} from './metrics.ts';
import { confirmedFalseNegatives, confirmedFalsePositives, fromReviews, overrideRates } from './overrides.ts';
import { calibrate, renderReport, runCase } from './run.ts';

/**
 * Tests for the harness that tests the engine.
 *
 * The thing most worth testing here is not the arithmetic — it is that the
 * harness reports an untested engine as untested rather than as a pass. A
 * calibration suite that silently turns empty denominators into zeroes would
 * produce a clean report for an engine nobody had measured, which is a worse
 * outcome than having no harness at all.
 */

/** A synthetic outcome, so gate behaviour can be tested without a real session. */
function outcome(
  label: CaseLabel,
  consequence: Consequence,
  overrides: Partial<CaseOutcome> = {},
): CaseOutcome {
  const labelled: LabelledCase = {
    caseId: `case:${label}:${consequence}`,
    description: 'synthetic',
    label,
    labelSource: LabelSource.SYNTHETIC,
    traits: [],
    justification: 'constructed for a gate test',
  };

  return {
    case: labelled,
    recommendation: RECOMMENDATION.SUPPORTED,
    consequence,
    trust: 60,
    risk: 0,
    confidence: 55,
    firedClusters: [],
    falsePositive: label === CaseLabel.OWNS_WORK && consequence === Consequence.ESCALATED,
    falseNegative: label === CaseLabel.WARRANTS_REVIEW && consequence !== Consequence.ESCALATED,
    overclaim: label === CaseLabel.INDETERMINATE && consequence !== Consequence.DECLINED,
    rationale: [],
    ...overrides,
  };
}

/** Wraps outcomes into the shape `evaluate` expects. */
function reportOf(outcomes: readonly CaseOutcome[]) {
  const counts = tally(outcomes);
  return {
    policyVersion: 'test',
    counts,
    rates: rates(counts),
    calibration: calibrationCurve(outcomes),
    subgroups: bySubgroup(outcomes, Object.values(CaseTrait)),
    outcomes,
    limitations: [] as readonly string[],
  };
}

function gatesOf(outcomes: readonly CaseOutcome[]): readonly string[] {
  return evaluate(reportOf(outcomes)).map((failure) => failure.gate);
}

/** Clean cases, so a gate under test is the only thing failing. */
function padding(count = MINIMUM_CASES): readonly CaseOutcome[] {
  return Array.from({ length: count }, (_, index) => {
    const clean = outcome(CaseLabel.OWNS_WORK, Consequence.NONE);
    return { ...clean, case: { ...clean.case, caseId: `pad:${String(index)}` } };
  });
}

describe('what a recommendation costs the developer', () => {
  const EXPECTED: readonly [Recommendation, Consequence][] = [
    [RECOMMENDATION.SUPPORTED, Consequence.NONE],
    [RECOMMENDATION.SUPPORTED_LOW_CONFIDENCE, Consequence.NONE],
    [RECOMMENDATION.CLARIFICATION_SUGGESTED, Consequence.QUESTIONED],
    [RECOMMENDATION.HUMAN_REVIEW_REQUIRED, Consequence.ESCALATED],
    [RECOMMENDATION.INSUFFICIENT_EVIDENCE, Consequence.DECLINED],
  ];

  for (const [recommendation, consequence] of EXPECTED) {
    it(`${recommendation} costs ${consequence}`, () => {
      assert.equal(consequenceOf(recommendation), consequence);
    });
  }

  it('covers every recommendation the engine can produce', () => {
    // A new recommendation added to the scoring contract without a consequence
    // mapping would silently fall through to DECLINED, which would understate
    // the harm of whatever the new value is.
    assert.deepEqual(
      Object.values(RECOMMENDATION).slice().sort(),
      EXPECTED.map(([recommendation]) => recommendation).sort(),
    );
  });
});

describe('correctness is asymmetric on purpose', () => {
  it('treats a clarifying question as correct for someone who owns their work', () => {
    // Being asked to explain your own code is not an accusation. An engine
    // forbidden from ever asking would have no way to resolve an ambiguity in
    // the developer's favour.
    assert.equal(
      isCorrect({ case: outcome(CaseLabel.OWNS_WORK, Consequence.QUESTIONED).case, consequence: Consequence.QUESTIONED }),
      true,
    );
  });

  it('does not accept a question where a human should have read the package', () => {
    assert.equal(
      isCorrect({ case: outcome(CaseLabel.WARRANTS_REVIEW, Consequence.QUESTIONED).case, consequence: Consequence.QUESTIONED }),
      false,
    );
  });

  it('accepts only a declination for an indeterminate session', () => {
    const indeterminate = outcome(CaseLabel.INDETERMINATE, Consequence.DECLINED).case;
    assert.equal(isCorrect({ case: indeterminate, consequence: Consequence.DECLINED }), true);
    for (const consequence of [Consequence.NONE, Consequence.QUESTIONED, Consequence.ESCALATED]) {
      assert.equal(isCorrect({ case: indeterminate, consequence }), false);
    }
  });
});

describe('an empty denominator is not a passing grade', () => {
  it('reports null, never zero, when nothing was measured', () => {
    const empty = rates(tally([]));
    assert.equal(empty.falsePositiveRate, null);
    assert.equal(empty.falseNegativeRate, null);
    assert.equal(empty.precision, null);
    assert.equal(empty.recall, null);
    assert.equal(empty.overclaimRate, null);
    assert.equal(empty.sampleSize, 0);
  });

  it('distinguishes a measured zero from an unmeasured one', () => {
    const measured = rates(tally([outcome(CaseLabel.OWNS_WORK, Consequence.NONE)]));
    assert.equal(measured.falsePositiveRate, 0);
    assert.equal(measured.recall, null);
  });
});

describe('counting', () => {
  it('sorts each label into the bucket that names its harm', () => {
    const counts = tally([
      outcome(CaseLabel.OWNS_WORK, Consequence.NONE),
      outcome(CaseLabel.OWNS_WORK, Consequence.ESCALATED),
      outcome(CaseLabel.WARRANTS_REVIEW, Consequence.ESCALATED),
      outcome(CaseLabel.WARRANTS_REVIEW, Consequence.NONE),
      outcome(CaseLabel.INDETERMINATE, Consequence.DECLINED),
      outcome(CaseLabel.INDETERMINATE, Consequence.NONE),
    ]);

    assert.deepEqual(counts, {
      truePositives: 1,
      falsePositives: 1,
      trueNegatives: 1,
      falseNegatives: 1,
      correctRefusals: 1,
      overclaims: 1,
    });
  });

  it('counts a questioned honest developer as left alone, not as escalated', () => {
    const counts = tally([outcome(CaseLabel.OWNS_WORK, Consequence.QUESTIONED)]);
    assert.equal(counts.falsePositives, 0);
    assert.equal(counts.trueNegatives, 1);
  });
});

describe('subgroups do not dilute each other', () => {
  const tagged = (traits: readonly CaseTrait[], consequence: Consequence): CaseOutcome => {
    const base = outcome(CaseLabel.OWNS_WORK, consequence);
    return { ...base, case: { ...base.case, caseId: `t:${traits.join('+')}`, traits } };
  };

  it('reports a case under every trait it carries', () => {
    const reports = bySubgroup(
      [tagged([CaseTrait.ASSISTIVE_INPUT, CaseTrait.FAST_TYPIST], Consequence.ESCALATED)],
      Object.values(CaseTrait),
    );

    assert.deepEqual(
      reports.map((report) => report.trait).sort(),
      [CaseTrait.ASSISTIVE_INPUT, CaseTrait.FAST_TYPIST].sort(),
    );
    for (const report of reports) {
      assert.equal(report.rates.falsePositiveRate, 1);
      assert.deepEqual(report.falsePositiveCaseIds, ['t:ASSISTIVE_INPUT+FAST_TYPIST']);
    }
  });

  it('omits a trait with no cases rather than reporting it clean', () => {
    // A trait reported at 0.00 with n=0 reads as evidence of safety. It is the
    // absence of evidence, and the two must not look the same.
    const reports = bySubgroup([tagged([CaseTrait.ASSISTIVE_INPUT], Consequence.NONE)], Object.values(CaseTrait));
    assert.deepEqual(reports.map((report) => report.trait), [CaseTrait.ASSISTIVE_INPUT]);
  });
});

describe('does a stated confidence mean what it says', () => {
  const at = (confidence: number, correct: boolean): CaseOutcome => ({
    ...outcome(CaseLabel.OWNS_WORK, correct ? Consequence.NONE : Consequence.ESCALATED),
    confidence,
  });

  it('buckets by stated confidence and includes 100 in the last bin', () => {
    const curve = calibrationCurve([at(0, true), at(19, true), at(20, true), at(100, true)]);
    assert.deepEqual(
      curve.bins.map((bin) => bin.count),
      [2, 1, 0, 0, 1],
    );
  });

  it('names overconfidence as negative and underconfidence as positive', () => {
    const overconfident = calibrationCurve([at(90, false), at(90, false), at(90, true)]);
    const bin = overconfident.bins.find((candidate) => candidate.count > 0);
    assert.ok(bin);
    assert.ok((bin.gap ?? 0) < 0, 'claiming 90 while right a third of the time is overconfident');

    const underconfident = calibrationCurve([at(30, true), at(30, true)]);
    const modest = underconfident.bins.find((candidate) => candidate.count > 0);
    assert.ok(modest);
    assert.ok((modest.gap ?? 0) > 0);
  });

  it('separates the two directions of error, and gates only one', () => {
    const overconfident = calibrationCurve([at(90, false)]);
    assert.ok((overconfident.overconfidenceError ?? 0) > 0);
    assert.equal(overconfident.underconfidenceError, 0);

    const modest = calibrationCurve([at(30, true)]);
    // Hedging about a developer the engine was right about costs that developer
    // nothing, so it must not contribute to the gated number.
    assert.equal(modest.overconfidenceError, 0);
    assert.ok((modest.underconfidenceError ?? 0) > 0);
  });

  it('reports no worst overconfidence when the engine was never overconfident', () => {
    // Not zero: zero would claim a bin sat exactly on the line.
    assert.equal(calibrationCurve([at(30, true)]).worstOverconfidence, null);
  });

  it('keeps the symmetric error available and unmodified', () => {
    const modest = calibrationCurve([at(30, true)]);
    assert.ok((modest.expectedCalibrationError ?? 0) > 0, 'stays comparable with published figures');
  });

  it('excludes declined sessions, whose confidence is not a claim about anyone', () => {
    const declined: CaseOutcome = { ...outcome(CaseLabel.INDETERMINATE, Consequence.DECLINED), confidence: 10 };
    const curve = calibrationCurve([declined]);
    assert.equal(curve.expectedCalibrationError, null);
    assert.equal(curve.brierScore, null);
  });

  it('punishes being confidently wrong harder than being unsure and wrong', () => {
    const sure = calibrationCurve([at(95, false)]).brierScore ?? 0;
    const unsure = calibrationCurve([at(40, false)]).brierScore ?? 0;
    assert.ok(sure > unsure);
  });
});

describe('the gates', () => {
  it('fails on a single false positive, and names the person', () => {
    const failures = evaluate(reportOf([...padding(), outcome(CaseLabel.OWNS_WORK, Consequence.ESCALATED)]));
    const failure = failures.find((candidate) => candidate.gate === GATE.NO_FALSE_POSITIVES);

    assert.ok(failure, 'one escalated honest developer must fail the build');
    assert.deepEqual(failure.caseIds, ['case:OWNS_WORK:ESCALATED']);
    assert.match(failure.detail, /person this engine would have accused/);
  });

  it('does not fail a build for a clarifying question', () => {
    assert.deepEqual(gatesOf([...padding(), outcome(CaseLabel.OWNS_WORK, Consequence.QUESTIONED)]), []);
  });

  it('fails when harm concentrates on a trait, separately from the aggregate', () => {
    const base = outcome(CaseLabel.OWNS_WORK, Consequence.ESCALATED);
    const escalated: CaseOutcome = {
      ...base,
      case: { ...base.case, caseId: 'dictation', traits: [CaseTrait.ASSISTIVE_INPUT] },
    };

    const gates = gatesOf([...padding(), escalated]);
    assert.ok(gates.includes(GATE.NO_SUBGROUP_HARM));
    assert.ok(gates.includes(GATE.NO_FALSE_POSITIVES));
  });

  it('fails when a session with too little evidence is assessed anyway', () => {
    const gates = gatesOf([...padding(), outcome(CaseLabel.INDETERMINATE, Consequence.NONE)]);
    assert.ok(gates.includes(GATE.NO_OVERCLAIM));
  });

  it('fails when an escalation has no fired cluster to point at', () => {
    // Risk that did not come from corroborated evidence is the one thing the
    // scoring contract forbids outright.
    const base = outcome(CaseLabel.WARRANTS_REVIEW, Consequence.ESCALATED);
    const gates = gatesOf([...padding(), { ...base, firedClusters: [] }]);
    assert.ok(gates.includes(GATE.EXPLAINED_ESCALATIONS));
  });

  it('accepts an escalation that names its clusters', () => {
    const base = outcome(CaseLabel.WARRANTS_REVIEW, Consequence.ESCALATED);
    const gates = gatesOf([...padding(), { ...base, firedClusters: ['unverified-acceptance'] }]);
    assert.ok(!gates.includes(GATE.EXPLAINED_ESCALATIONS));
  });

  it('fails when recall falls below target, but not when there is nothing to recall', () => {
    const missed = Array.from({ length: 4 }, (_, index) => {
      const base = outcome(CaseLabel.WARRANTS_REVIEW, Consequence.NONE);
      return { ...base, case: { ...base.case, caseId: `missed:${String(index)}` } };
    });
    const caught = { ...outcome(CaseLabel.WARRANTS_REVIEW, Consequence.ESCALATED), firedClusters: ['dependency'] };

    const failing = evaluate(reportOf([...padding(), ...missed, caught]));
    const recall = failing.find((candidate) => candidate.gate === GATE.MINIMUM_RECALL);
    assert.ok(recall, `recall of 0.2 is below the ${String(TARGET_RECALL)} target`);
    assert.equal(recall.caseIds.length, 4, 'names every session let through');

    // A corpus with no concerning cases must not fail for containing none.
    assert.ok(!gatesOf(padding()).includes(GATE.MINIMUM_RECALL));
  });

  it('reports the corpus itself as the finding when it is too small', () => {
    const failure = evaluate(reportOf(padding(3))).find(
      (candidate) => candidate.gate === GATE.MINIMUM_CORPUS,
    );
    assert.ok(failure);
    assert.match(failure.detail, /passing them proves nothing at this size/);
  });

  it('gates overconfidence and ignores hedging', () => {
    const wrongAndSure = Array.from({ length: 10 }, (_, index) => {
      const base = outcome(CaseLabel.OWNS_WORK, Consequence.ESCALATED);
      return { ...base, case: { ...base.case, caseId: `sure:${String(index)}` }, confidence: 95 };
    });
    const overconfident = evaluate(reportOf(wrongAndSure));
    assert.ok(overconfident.some((failure) => failure.gate === GATE.CALIBRATION_ERROR));
    assert.ok(overconfident.some((failure) => failure.gate === GATE.OVERCONFIDENCE));

    // Right about everyone while claiming 30% confidence: a large symmetric
    // calibration error, and not a failure. The cheapest way to pass a gate on
    // the symmetric number is to inflate confidence, which is forbidden.
    const modest = padding().map((entry) => ({ ...entry, confidence: 30 }));
    const curve = calibrationCurve(modest);
    assert.ok((curve.expectedCalibrationError ?? 0) > MAXIMUM_CALIBRATION_ERROR);
    assert.deepEqual(gatesOf(modest), []);
  });

  it('returns every failure at once rather than stopping at the first', () => {
    const gates = gatesOf([
      outcome(CaseLabel.OWNS_WORK, Consequence.ESCALATED),
      outcome(CaseLabel.INDETERMINATE, Consequence.NONE),
    ]);
    assert.ok(gates.length >= 3, 'a reader fixing one thing at a time stops reading');
    assert.ok(gates.includes(GATE.MINIMUM_CORPUS));
  });
});

describe('what the report does not establish', () => {
  it('always says the rates describe the corpus and not the world', () => {
    const limitations = limitationsOf(reportOf(padding()));
    assert.ok(limitations.some((line) => /describe the corpus, not the world/.test(line)));
    assert.ok(
      limitations.some((line) => /should be quoted to a customer or to a developer/.test(line)),
      'the sentence that stops an accuracy figure being repeated',
    );
  });

  it('says so when every label is a design decision rather than a human judgement', () => {
    const limitations = limitationsOf(reportOf(padding()));
    assert.ok(limitations.some((line) => /measures self-consistency and nothing more/.test(line)));
  });

  it('drops that caveat once real reviewed sessions are folded in', () => {
    const human = padding().map((entry) => ({
      ...entry,
      case: { ...entry.case, labelSource: LabelSource.HUMAN_REVIEW },
    }));
    const limitations = limitationsOf(reportOf(human));
    assert.ok(!limitations.some((line) => /measures self-consistency/.test(line)));
  });

  it('warns that a thin subgroup is untested rather than safe', () => {
    const base = outcome(CaseLabel.OWNS_WORK, Consequence.NONE);
    const lonely: CaseOutcome = {
      ...base,
      case: { ...base.case, caseId: 'lonely', traits: [CaseTrait.ASSISTIVE_INPUT] },
    };
    const limitations = limitationsOf(reportOf([...padding(), lonely]));
    assert.ok(
      limitations.some((line) => /treat a clean result there as untested, not as safe/.test(line)),
    );
  });
});

describe('ground truth from Layer 10', () => {
  interface ReviewShape {
    readonly reviewId: string;
    readonly decision: 'APPROVE' | 'REJECT' | 'REQUEST_REVIEW';
    readonly engineRecommendation?: 'APPROVE' | 'REJECT' | 'REQUEST_REVIEW';
    readonly openedEvidence?: boolean;
    readonly rationaleLength?: number;
    readonly reviewDurationMs?: number;
  }

  /** Real Layer 10 events, built through the validating session builder. */
  function log(reviews: readonly ReviewShape[]): readonly TrustEvent[] {
    const specs = reviews.flatMap((review, index) => {
      const at = 1_000 + index * 10_000;
      const identity = { reviewId: review.reviewId, reviewerId: 'staff:mira' };

      // Annotated, not inferred. Left to itself TypeScript narrows the element
      // type to the two events in the initialiser and then rejects every later
      // push — the events this fixture exists to produce.
      const built: EventSpec[] = [
        {
          type: HumanReviewEventType.REVIEW_ASSIGNED,
          at,
          payload: { ...identity, assignedBy: 'staff:lead', priority: 'normal' },
        },
        { type: HumanReviewEventType.REVIEW_OPENED, at: at + 500, payload: identity },
      ];

      if (review.openedEvidence ?? true) {
        built.push({
          type: HumanReviewEventType.REVIEW_EVIDENCE_ACCESSED,
          at: at + 1_000,
          payload: { ...identity, evidenceKind: 'final_code', viewDurationMs: 90_000 },
        });
      }

      built.push({
        type: HumanReviewEventType.REVIEW_DECISION_RECORDED,
        at: at + 2_000,
        payload: {
          ...identity,
          decision: review.decision,
          rationaleLength: review.rationaleLength ?? 240,
          rationaleHash: 'b'.repeat(64),
          reviewDurationMs: review.reviewDurationMs ?? 600_000,
        },
      });

      if (review.engineRecommendation !== undefined) {
        built.push({
          type: HumanReviewEventType.RECOMMENDATION_OVERRIDDEN,
          at: at + 2_500,
          payload: {
            ...identity,
            engineRecommendation: review.engineRecommendation,
            humanDecision: review.decision,
            engineTrustScore: 42,
            rationaleHash: 'b'.repeat(64),
          },
        });
      }

      return built;
    });

    return buildSession(specs);
  }

  it('turns a recorded decision into a labelled case', () => {
    const cases = fromReviews(log([{ reviewId: 'rev_1', decision: 'APPROVE' }]));

    assert.equal(cases.length, 1);
    const [entry] = cases;
    assert.ok(entry);
    assert.equal(entry.caseId, 'review:rev_1');
    assert.equal(entry.label, CaseLabel.OWNS_WORK);
    assert.equal(entry.labelSource, LabelSource.HUMAN_REVIEW);
    assert.equal(entry.humanDecision, ReviewDecision.APPROVE);
    assert.equal(entry.wasOverride, false);
    assert.equal(entry.sessionId, TEST_SESSION);
    assert.equal(entry.developerId, TEST_DEVELOPER);
    assert.equal(entry.tenantId, TEST_TENANT);
  });

  it('never infers a trait from a decision', () => {
    // Guessing that someone uses assistive input because their session looked
    // unusual would be the inference this package exists to prevent, aimed at a
    // protected characteristic.
    const [entry] = fromReviews(log([{ reviewId: 'rev_1', decision: 'REJECT' }]));
    assert.ok(entry);
    assert.deepEqual(entry.traits, []);
  });

  it('produces no label when a reviewer asked for more work', () => {
    // They have not concluded anything, and forcing that into a binary would
    // invent a judgement they declined to make.
    assert.deepEqual(fromReviews(log([{ reviewId: 'rev_1', decision: 'REQUEST_REVIEW' }])), []);
  });

  it('refuses to learn from a decision made without opening the evidence', () => {
    const events = log([{ reviewId: 'rev_1', decision: 'REJECT', openedEvidence: false }]);
    assert.deepEqual(fromReviews(events), []);
    assert.equal(fromReviews(events, { citableOnly: false }).length, 1);
  });

  it('identifies a confirmed false positive: the engine flagged, a human cleared', () => {
    const cases = fromReviews(
      log([
        { reviewId: 'rev_cleared', decision: 'APPROVE', engineRecommendation: 'REQUEST_REVIEW' },
        { reviewId: 'rev_agreed', decision: 'APPROVE' },
        { reviewId: 'rev_rejected', decision: 'REJECT', engineRecommendation: 'APPROVE' },
      ]),
    );

    assert.deepEqual(
      confirmedFalsePositives(cases).map((entry) => entry.caseId),
      ['review:rev_cleared'],
    );
    assert.deepEqual(
      confirmedFalseNegatives(cases).map((entry) => entry.caseId),
      ['review:rev_rejected'],
    );
  });

  it('reports both readings of an override rate, because the number cannot choose', () => {
    const cases = fromReviews(
      log([
        { reviewId: 'rev_1', decision: 'APPROVE', engineRecommendation: 'REQUEST_REVIEW' },
        { reviewId: 'rev_2', decision: 'APPROVE', engineRecommendation: 'REQUEST_REVIEW' },
        { reviewId: 'rev_3', decision: 'REJECT', engineRecommendation: 'APPROVE' },
        { reviewId: 'rev_4', decision: 'APPROVE' },
      ]),
    );

    const measured = overrideRates(cases);
    assert.equal(measured.total, 4);
    assert.equal(measured.overrides, 3);
    assert.equal(measured.cleared, 2);
    assert.equal(measured.rejected, 1);
    assert.equal(measured.overrideRate, 0.75);
    assert.ok(measured.readings.some((line) => /escalating people it should not/.test(line)));
  });

  it('treats perfect agreement as a finding, not a success', () => {
    const agreeable = Array.from({ length: 22 }, (_, index) => ({
      reviewId: `rev_${String(index)}`,
      decision: 'APPROVE' as const,
    }));

    const measured = overrideRates(fromReviews(log(agreeable)));
    assert.equal(measured.overrides, 0);
    assert.equal(measured.clearedRate, null, 'no overrides is not a cleared rate of zero');
    assert.ok(measured.readings.some((line) => /people have stopped checking/.test(line)));
  });

  it('says nothing either way about an empty log', () => {
    const measured = overrideRates([]);
    assert.equal(measured.overrideRate, null);
    assert.equal(measured.clearedRate, null);
    assert.deepEqual(measured.readings, []);
  });
});

describe('the engine against the corpus', () => {
  const report = calibrate();

  it('escalates nobody who owns their work', () => {
    const accused = report.outcomes.filter((entry) => entry.falsePositive);
    assert.deepEqual(
      accused.map((entry) => entry.case.caseId),
      [],
      'each of these is a specific person the engine would have accused',
    );
  });

  it('passes every gate', () => {
    assert.deepEqual(
      report.failures.map((failure) => `${failure.gate}: ${failure.detail}`),
      [],
    );
  });

  it('never escalates without naming the clusters that caused it', () => {
    for (const entry of report.outcomes) {
      if (entry.consequence !== Consequence.ESCALATED) continue;
      assert.ok(
        entry.firedClusters.length > 0,
        `${entry.case.caseId} escalated with no cluster to point at`,
      );
    }
  });

  it('clears the behaviours a naive detector treats as proof of guilt', () => {
    // Every one of these trips "fast = AI", "paste = cheating", "gaps = evasion"
    // or "AI usage = cheating". The engine has to clear them without being told
    // which cases they are.
    const FORBIDDEN_RULES: readonly string[] = [
      'fast-developer',
      'assistive-dictation',
      'reuses-own-library',
      'degraded-connection',
      'minimal-consent',
      'external-ai-adapted',
      'heavy-assistance-engaged',
      'honest-with-docs',
      'struggling-beginner',
    ];

    for (const caseId of FORBIDDEN_RULES) {
      const entry = report.outcomes.find((candidate) => candidate.case.caseId === caseId);
      assert.ok(entry, `${caseId} is missing from the corpus`);
      assert.notEqual(entry.consequence, Consequence.ESCALATED, `${caseId} was escalated`);
      assert.equal(entry.risk, 0, `${caseId} carries risk with nothing corroborating it`);
    }
  });

  it('declines when there is nothing to verify, rather than guessing kindly', () => {
    // A favourable verdict on unsubmitted work is still an assertion without
    // evidence. Declining is the correct output and is not a failure.
    for (const caseId of ['sparse', 'truncated']) {
      const entry = report.outcomes.find((candidate) => candidate.case.caseId === caseId);
      assert.ok(entry);
      assert.equal(entry.consequence, Consequence.DECLINED, `${caseId} was assessed anyway`);
      assert.equal(entry.overclaim, false);
    }
  });

  it('still finds the sessions a reviewer should read', () => {
    const escalated = report.outcomes
      .filter((entry) => entry.consequence === Consequence.ESCALATED)
      .map((entry) => entry.case.caseId);

    assert.deepEqual(escalated.slice().sort(), ['dependent', 'unverified-assistance']);
    assert.equal(report.rates.recall, 1);
  });

  it('does not claim certainty about anyone', () => {
    for (const entry of report.outcomes) {
      assert.ok(entry.confidence < 100, `${entry.case.caseId} claims total certainty`);
    }
  });

  it('carries its limitations on every report, unconditionally', () => {
    assert.ok(report.limitations.length > 0);
    assert.ok(report.limitations.some((line) => /describe the corpus, not the world/.test(line)));
  });

  it('is stamped with the policy version that produced it', () => {
    assert.equal(report.policyVersion, POLICY_VERSION);
  });

  it('runs a single case without a corpus', () => {
    const [first] = CORPUS;
    assert.ok(first);
    const single = runCase(first);
    assert.equal(single.case.caseId, first.caseId);
    // The specs must not survive into the outcome: a report is something a
    // reviewer reads, not a session to replay.
    assert.ok(!Object.hasOwn(single.case, 'specs'));
  });

  it('renders a report that leads with what went wrong', () => {
    const text = renderReport(report);
    assert.match(text, /All gates passed\./);
    assert.ok(
      text.indexOf('Counts') < text.indexOf('Cases'),
      'a reader at the end of a red build should not scroll past a curve',
    );
    assert.match(text, /What this does not establish/);
    for (const entry of report.outcomes) assert.ok(text.includes(entry.case.caseId));
  });

  it('reports a failing corpus without throwing', () => {
    // The harness must survive a red run: a gate that threw would stop the
    // report being printed at exactly the moment it matters.
    const [first] = CORPUS;
    assert.ok(first);
    const mislabelled = calibrate([{ ...first, label: CaseLabel.WARRANTS_REVIEW }]);
    assert.ok(mislabelled.failures.length > 0);
    assert.match(renderReport(mislabelled), /gate\(s\) FAILED/);
  });
});
