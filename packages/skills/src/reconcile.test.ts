import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TrustLayer, clampUnit, EventId, type EventId as EventIdT } from '@scora/trust-core';
import {
  SkillLevel,
  SkillObservationKind,
  SkillVerdict,
  type SkillClaim,
  type SkillObservation,
} from './contract.ts';
import { aggregateConfidence, inferLevel, reconcileClaim } from './reconcile.ts';

/**
 * The refusals.
 *
 * Every test here guards a case where the layer must decline to conclude. They
 * are written as the accusations the engine is not allowed to make, because that
 * is the failure mode that costs a real person something: a developer who claimed
 * PostgreSQL, was never asked about PostgreSQL, and reads `CONTRADICTED` on their
 * report.
 */

const EVIDENCE: readonly EventIdT[] = [EventId.unsafe('evt_000001')];

function claim(level: SkillLevel = SkillLevel.ADVANCED): SkillClaim {
  return {
    skillId: 'skill_pg',
    skillName: 'PostgreSQL',
    claimedLevel: level,
    claimedYears: 5,
    claimedIn: EventId.unsafe('evt_claim'),
  };
}

function observation(
  kind: SkillObservationKind,
  layer: TrustLayer,
  weight = 0.7,
  confidence = 0.8,
): SkillObservation {
  return {
    kind,
    layer,
    detail: 'test observation',
    weight: clampUnit(weight),
    confidence: clampUnit(confidence),
    evidence: EVIDENCE,
  };
}

describe('an unexercised claim', () => {
  it('is NOT_EXERCISED, never CONTRADICTED', () => {
    const finding = reconcileClaim(claim(SkillLevel.EXPERT), []);

    assert.equal(finding.verdict, SkillVerdict.NOT_EXERCISED);
    assert.notEqual(finding.verdict, SkillVerdict.CONTRADICTED);
  });

  it('reports no level gap, because nothing measured a level', () => {
    // The tempting bug: `claimedLevel - NONE` is a four-step shortfall, and a
    // reviewer scanning a column of numbers would read it as one.
    const finding = reconcileClaim(claim(SkillLevel.EXPERT), []);

    assert.equal(finding.levelGap, 0);
    assert.equal(finding.evidencedLevel, SkillLevel.NONE);
  });

  it('says in plain language that it is not evidence against the claim', () => {
    const finding = reconcileClaim(claim(), []);

    assert.match(finding.summary, /not evidence against the claim/i);
  });

  it('outputs a next step instead of a score', () => {
    const finding = reconcileClaim(claim(), []);

    assert.equal(finding.confidence, 0);
    assert.ok(finding.nextStep !== null);
    assert.match(finding.nextStep, /challenge|task/i);
  });

  it('carries no evidence and no corroborating layers', () => {
    const finding = reconcileClaim(claim(), []);

    assert.deepEqual(finding.evidence, []);
    assert.deepEqual(finding.layersCorroborating, []);
    assert.deepEqual(finding.observations, []);
  });
});

describe('contradiction requires more than disagreement', () => {
  it('will not contradict on counter-evidence from a single layer', () => {
    // Same rule as cluster corroboration. One layer disagreeing is one signal.
    const finding = reconcileClaim(claim(SkillLevel.EXPERT), [
      observation(SkillObservationKind.CHALLENGE_FAILED, TrustLayer.SKILL, 0.9, 0.9),
      observation(SkillObservationKind.CHALLENGE_FAILED, TrustLayer.SKILL, 0.9, 0.9),
    ]);

    assert.notEqual(finding.verdict, SkillVerdict.CONTRADICTED);
  });

  it('will not contradict on behaviour alone, without a failed challenge', () => {
    // A regression plus an unresolved error describes a hard afternoon at least
    // as well as it describes an overstated skill.
    const finding = reconcileClaim(claim(SkillLevel.EXPERT), [
      observation(SkillObservationKind.COUNTER, TrustLayer.RUNTIME, 0.8, 0.9),
      observation(SkillObservationKind.COUNTER, TrustLayer.CODE_EVOLUTION, 0.8, 0.9),
      observation(SkillObservationKind.COUNTER, TrustLayer.INTERACTION, 0.8, 0.9),
    ]);

    assert.equal(finding.verdict, SkillVerdict.PARTIALLY_CORROBORATED);
  });

  it('contradicts only with a wide gap, two layers, and a failed challenge', () => {
    const finding = reconcileClaim(claim(SkillLevel.EXPERT), [
      observation(SkillObservationKind.CHALLENGE_FAILED, TrustLayer.SKILL, 0.9, 0.9),
      observation(SkillObservationKind.COUNTER, TrustLayer.RUNTIME, 0.8, 0.9),
    ]);

    assert.equal(finding.verdict, SkillVerdict.CONTRADICTED);
    assert.ok(finding.layersCorroborating.length >= 2);
    assert.match(finding.summary, /independent layers/);
  });

  it('states what the contradiction rests on, so it can be argued with', () => {
    const finding = reconcileClaim(claim(SkillLevel.EXPERT), [
      observation(SkillObservationKind.CHALLENGE_FAILED, TrustLayer.SKILL, 0.9, 0.9),
      observation(SkillObservationKind.COUNTER, TrustLayer.RUNTIME, 0.8, 0.9),
    ]);

    assert.match(finding.summary, /expert/);
    assert.match(finding.summary, /failed challenge/);
    assert.ok(finding.evidence.length > 0);
  });
});

describe('a level gap', () => {
  it('reads a one-step shortfall as ordinary self-assessment noise', () => {
    // People round their own skills up. That is not dishonesty.
    const finding = reconcileClaim(claim(SkillLevel.ADVANCED), [
      observation(SkillObservationKind.SUPPORTING, TrustLayer.RUNTIME, 0.8, 0.8),
      observation(SkillObservationKind.SUPPORTING, TrustLayer.CODE_EVOLUTION, 0.6, 0.8),
    ]);

    assert.equal(finding.evidencedLevel, SkillLevel.INTERMEDIATE);
    assert.equal(finding.levelGap, 1);
    assert.equal(finding.verdict, SkillVerdict.PARTIALLY_CORROBORATED);
    assert.match(finding.summary, /within ordinary self-assessment range/);
    assert.equal(finding.nextStep, null);
  });

  it('turns a wide shortfall into a question, not a conclusion', () => {
    const finding = reconcileClaim(claim(SkillLevel.EXPERT), [
      observation(SkillObservationKind.SUPPORTING, TrustLayer.RUNTIME, 0.5, 0.8),
      observation(SkillObservationKind.COUNTER, TrustLayer.RUNTIME, 0.3, 0.7),
    ]);

    assert.ok(finding.levelGap > 1);
    assert.equal(finding.verdict, SkillVerdict.PARTIALLY_CORROBORATED);
    assert.match(finding.summary, /not a conclusion about them/);
    assert.match(finding.nextStep ?? '', /interview/i);
  });

  it('corroborates a claim the session met or exceeded', () => {
    const finding = reconcileClaim(claim(SkillLevel.INTERMEDIATE), [
      observation(SkillObservationKind.DEMONSTRATED, TrustLayer.SKILL, 0.9, 0.9),
      observation(SkillObservationKind.SUPPORTING, TrustLayer.RUNTIME, 0.8, 0.8),
      observation(SkillObservationKind.SUPPORTING, TrustLayer.CODE_EVOLUTION, 0.7, 0.8),
    ]);

    assert.equal(finding.verdict, SkillVerdict.CORROBORATED);
    assert.ok(finding.levelGap <= 0);
    assert.equal(finding.nextStep, null);
  });

  it('lets a tenant widen the tolerated gap without touching corroboration', () => {
    const observations = [
      observation(SkillObservationKind.SUPPORTING, TrustLayer.RUNTIME, 0.5, 0.8),
      observation(SkillObservationKind.SUPPORTING, TrustLayer.CODE_EVOLUTION, 0.2, 0.7),
    ];
    const strict = reconcileClaim(claim(SkillLevel.EXPERT), observations, { toleratedLevelGap: 1 });
    const loose = reconcileClaim(claim(SkillLevel.EXPERT), observations, { toleratedLevelGap: 3 });

    assert.match(strict.nextStep ?? '', /interview/i);
    assert.equal(loose.nextStep, null);
    assert.equal(loose.verdict, SkillVerdict.PARTIALLY_CORROBORATED);
  });
});

describe('thin evidence', () => {
  it('is INDETERMINATE rather than a favourable or unfavourable guess', () => {
    const finding = reconcileClaim(claim(SkillLevel.EXPERT), [
      observation(SkillObservationKind.COUNTER, TrustLayer.RUNTIME, 0.4, 0.2),
    ]);

    assert.equal(finding.verdict, SkillVerdict.INDETERMINATE);
    assert.match(finding.summary, /too thin to read the result either way/);
    assert.ok(finding.nextStep !== null);
  });

  it('is checked before the level comparison, so a wide gap cannot leak through', () => {
    // Ordering matters: a low-confidence observation that happens to imply a
    // four-step shortfall must not be reported as a shortfall.
    const finding = reconcileClaim(claim(SkillLevel.EXPERT), [
      observation(SkillObservationKind.CHALLENGE_FAILED, TrustLayer.SKILL, 0.9, 0.1),
      observation(SkillObservationKind.COUNTER, TrustLayer.RUNTIME, 0.9, 0.1),
    ]);

    assert.equal(finding.verdict, SkillVerdict.INDETERMINATE);
  });

  it('still reports the observations it saw, so the caller can look', () => {
    const finding = reconcileClaim(claim(), [
      observation(SkillObservationKind.SUPPORTING, TrustLayer.RUNTIME, 0.4, 0.2),
    ]);

    assert.equal(finding.observations.length, 1);
    assert.deepEqual(finding.evidence, EVIDENCE);
  });
});

describe('inferLevel', () => {
  it('weights a passed challenge above behavioural consistency', () => {
    const designed = inferLevel([
      observation(SkillObservationKind.DEMONSTRATED, TrustLayer.SKILL, 0.8, 0.9),
    ]);
    const behavioural = inferLevel([
      observation(SkillObservationKind.SUPPORTING, TrustLayer.RUNTIME, 0.8, 0.9),
    ]);

    assert.ok(SKILL_ORDER(designed) > SKILL_ORDER(behavioural));
  });

  it('never falls below beginner while any supporting evidence exists', () => {
    const level = inferLevel([
      observation(SkillObservationKind.SUPPORTING, TrustLayer.RUNTIME, 0.2, 0.5),
      observation(SkillObservationKind.COUNTER, TrustLayer.RUNTIME, 1, 1),
      observation(SkillObservationKind.CHALLENGE_FAILED, TrustLayer.SKILL, 1, 1),
    ]);

    assert.equal(level, SkillLevel.BEGINNER);
  });

  it('evidences nothing when there is nothing to evidence', () => {
    assert.equal(inferLevel([]), SkillLevel.NONE);
  });
});

describe('aggregateConfidence', () => {
  it('damps a single observation below its own confidence', () => {
    const one = aggregateConfidence([
      observation(SkillObservationKind.SUPPORTING, TrustLayer.RUNTIME, 0.8, 0.9),
    ]);

    assert.ok(one < 0.9);
  });

  it('rises with breadth of evidence', () => {
    const single = aggregateConfidence([
      observation(SkillObservationKind.SUPPORTING, TrustLayer.RUNTIME, 0.8, 0.8),
    ]);
    const three = aggregateConfidence([
      observation(SkillObservationKind.SUPPORTING, TrustLayer.RUNTIME, 0.8, 0.8),
      observation(SkillObservationKind.SUPPORTING, TrustLayer.CODE_EVOLUTION, 0.8, 0.8),
      observation(SkillObservationKind.DEMONSTRATED, TrustLayer.SKILL, 0.8, 0.8),
    ]);

    assert.ok(three > single);
    // Breadth damping tops out at parity with the evidence's own confidence. It
    // must never manufacture more belief than the observations carry.
    assert.ok(three - 0.8 < 1e-9, `breadth amplified confidence to ${String(three)}`);
  });

  it('is zero with no observations', () => {
    assert.equal(aggregateConfidence([]), 0);
  });
});

function SKILL_ORDER(level: SkillLevel): number {
  return [
    SkillLevel.NONE,
    SkillLevel.BEGINNER,
    SkillLevel.INTERMEDIATE,
    SkillLevel.ADVANCED,
    SkillLevel.EXPERT,
  ].indexOf(level);
}
