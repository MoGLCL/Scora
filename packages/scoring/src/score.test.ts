import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TrustEventType, clampUnit } from '@scora/trust-core';
import { extractFeatures } from '@scora/trust-features';
import { TEST_CONTEXT, buildSession, payloads, type EventSpec } from '@scora/trust-features/testing';
import { CLUSTER_CATALOGUE } from './clusters.ts';
import { RECOMMENDATION } from './contract.ts';
import { developerFacingSummary, renderReport } from './report.ts';
import {
  DEPENDENT,
  FAST_DEVELOPER,
  HEAVY_ASSISTANCE_ENGAGED,
  HONEST_SOLO,
  HONEST_WITH_DOCS,
  SPARSE,
  STRUGGLING_BEGINNER,
  sessionStart,
} from './scenarios.ts';
import { score } from './score.ts';

function run(specs: readonly EventSpec[]) {
  return score(extractFeatures(buildSession(specs), TEST_CONTEXT));
}

describe('honest archetypes are never flagged', () => {
  const HONEST: readonly [string, readonly EventSpec[]][] = [
    ['human working alone', HONEST_SOLO],
    ['human reading documentation', HONEST_WITH_DOCS],
    ['fast experienced developer', FAST_DEVELOPER],
    ['heavy but engaged completion use', HEAVY_ASSISTANCE_ENGAGED],
    ['slow struggling beginner', STRUGGLING_BEGINNER],
  ];

  for (const [name, specs] of HONEST) {
    it(`${name}: fires no cluster and carries no risk`, () => {
      const result = run(specs);
      assert.deepEqual(
        result.clusters.filter((f) => f.fired).map((f) => f.definition.id),
        [],
      );
      assert.equal(result.risk, 0);
    });

    it(`${name}: is never given an adverse recommendation`, () => {
      // Without a fired cluster there is nothing to clarify. Anything stronger
      // than SUPPORTED_LOW_CONFIDENCE here would mean the engine had inferred
      // suspicion from the absence of positive evidence.
      const result = run(specs);
      assert.ok(
        result.recommendation === RECOMMENDATION.SUPPORTED ||
          result.recommendation === RECOMMENDATION.SUPPORTED_LOW_CONFIDENCE,
        `${name} received ${result.recommendation}`,
      );
    });
  }

  it('does not penalise the fast developer relative to the slow one', () => {
    // Speed is not evidence. The fast session may score differently on
    // capability, but it must not attract a worse trust posture for being fast.
    const fast = run(FAST_DEVELOPER);
    const slow = run(STRUGGLING_BEGINNER);
    assert.equal(fast.risk, 0);
    assert.equal(slow.risk, 0);
    assert.equal(fast.clusters.filter((f) => f.fired).length, 0);
  });
});

describe('cluster catalogue structure', () => {
  it('requires every cluster to span at least two layers', () => {
    for (const definition of CLUSTER_CATALOGUE) {
      assert.ok(
        definition.layers.length >= 2,
        `${definition.id} draws from one layer and could fire on a single signal`,
      );
    }
  });

  it('tags every condition with the layer its evidence comes from', () => {
    for (const definition of CLUSTER_CATALOGUE) {
      for (const condition of definition.conditions) {
        assert.ok(condition.layer, `${definition.id}/${condition.id} has no layer`);
        assert.ok(
          definition.layers.includes(condition.layer),
          `${definition.id}/${condition.id} reads ${condition.layer}, undeclared on the cluster`,
        );
      }
    }
  });

  it('cannot satisfy its minimum from a single layer', () => {
    // The structural guarantee: even if every condition in the most-represented
    // layer fired, that alone must fall short of the minimum. Otherwise one
    // layer could establish a pattern by itself.
    for (const definition of CLUSTER_CATALOGUE) {
      const perLayer = new Map<string, number>();
      for (const condition of definition.conditions) {
        perLayer.set(condition.layer, (perLayer.get(condition.layer) ?? 0) + 1);
      }
      const largest = Math.max(...perLayer.values());
      assert.ok(
        largest < definition.minimumConditions,
        `${definition.id} has ${largest} conditions in one layer but needs only ${definition.minimumConditions}`,
      );
    }
  });

  it('requires every cluster to need at least two conditions', () => {
    for (const definition of CLUSTER_CATALOGUE) {
      assert.ok(
        definition.minimumConditions >= 2,
        `${definition.id} could fire on one condition`,
      );
      assert.ok(
        definition.conditions.length >= definition.minimumConditions,
        `${definition.id} cannot satisfy its own minimum`,
      );
    }
  });

  it('gives every cluster an interpretation naming what would exonerate', () => {
    for (const definition of CLUSTER_CATALOGUE) {
      assert.match(
        definition.interpretation,
        /exonerat|discharg|not proof|innocent|identical|explain/i,
        `${definition.id} must state how it can be resolved in the developer's favour`,
      );
    }
  });

  it('has unique cluster ids and condition ids', () => {
    const ids = CLUSTER_CATALOGUE.map((definition) => definition.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const definition of CLUSTER_CATALOGUE) {
      const conditionIds = definition.conditions.map((condition) => condition.id);
      assert.equal(new Set(conditionIds).size, conditionIds.length, `${definition.id} has duplicate conditions`);
    }
  });

  it('only ever fires with corroboration from two or more layers', () => {
    for (const specs of [HONEST_SOLO, HONEST_WITH_DOCS, HEAVY_ASSISTANCE_ENGAGED, DEPENDENT, SPARSE]) {
      for (const finding of run(specs).clusters) {
        if (!finding.fired) continue;
        assert.ok(
          finding.layersCorroborating.length >= 2,
          `${finding.definition.id} fired on evidence from one layer`,
        );
      }
    }
  });
});

describe('honest solo session', () => {
  const result = run(HONEST_SOLO);

  it('fires no cluster', () => {
    const fired = result.clusters.filter((finding) => finding.fired);
    assert.deepEqual(fired.map((f) => f.definition.id), []);
  });

  it('reports zero risk', () => {
    assert.equal(result.risk, 0);
  });

  it('recommends support rather than review', () => {
    assert.ok(
      result.recommendation === RECOMMENDATION.SUPPORTED ||
        result.recommendation === RECOMMENDATION.SUPPORTED_LOW_CONFIDENCE,
      `got ${result.recommendation}`,
    );
  });

  it('cites concrete supporting evidence', () => {
    assert.ok(result.explanation.positiveEvidence.length >= 3);
    for (const note of result.explanation.positiveEvidence) {
      assert.ok(note.evidence.length > 0, `${note.name} cited no events`);
    }
  });
});

describe('honest session with documentation', () => {
  const result = run(HONEST_WITH_DOCS);

  it('fires no cluster — reading documentation is not a concern', () => {
    assert.deepEqual(result.clusters.filter((f) => f.fired).map((f) => f.definition.id), []);
    assert.equal(result.risk, 0);
  });

  it('scores at least as well as the same session without documentation', () => {
    const withoutDocs = run(HONEST_SOLO);
    assert.ok(
      result.trust >= withoutDocs.trust - 2,
      `consulting documentation cost ${withoutDocs.trust - result.trust} trust points`,
    );
  });
});

describe('heavy but engaged use of editor completions', () => {
  const result = run(HEAVY_ASSISTANCE_ENGAGED);

  it('fires no cluster', () => {
    assert.deepEqual(result.clusters.filter((f) => f.fired).map((f) => f.definition.id), []);
  });

  it('does not penalise assistance that was modified, tested and rejected', () => {
    assert.equal(result.risk, 0);
    assert.ok(result.trust >= 50, `trust was ${result.trust}`);
  });

  it('scores comparably to a session with no assistance at all', () => {
    const unassisted = run(HONEST_SOLO);
    assert.ok(
      Math.abs(result.trust - unassisted.trust) <= 25,
      `assisted ${result.trust} vs unassisted ${unassisted.trust} — using the editor must not be decisive`,
    );
  });
});

describe('dependent session', () => {
  const result = run(DEPENDENT);

  it('fires corroborated clusters', () => {
    const fired = result.clusters.filter((f) => f.fired);
    assert.ok(fired.length > 0, 'the corroborated pattern should be detected');
    assert.ok(fired.some((f) => f.definition.id === 'unverified_external_import'));
  });

  it('produces meaningfully more risk than an honest session', () => {
    assert.ok(result.risk > run(HONEST_SOLO).risk + 15, `risk was only ${result.risk}`);
  });

  it('routes to a human rather than deciding', () => {
    assert.ok(
      result.recommendation === RECOMMENDATION.HUMAN_REVIEW_REQUIRED ||
        result.recommendation === RECOMMENDATION.CLARIFICATION_SUGGESTED,
      `got ${result.recommendation}`,
    );
  });

  it('never drives trust to zero', () => {
    assert.ok(result.trust >= 10, `trust collapsed to ${result.trust}`);
  });

  it('produces interview questions rather than conclusions', () => {
    assert.ok(result.explanation.suggestedQuestions.length > 0);
    for (const question of result.explanation.suggestedQuestions) {
      // Each must invite the developer to account for their work...
      assert.match(
        question,
        /\?|explain|walk through|talk through|describe|discuss/i,
        `not phrased as an invitation to explain: ${question}`,
      );
      // ...and none may presuppose an answer.
      assert.doesNotMatch(
        question,
        /cheat|copie[dr]|plagiar|did you actually|admit|confess|suspicious/i,
        `presupposes wrongdoing: ${question}`,
      );
    }
  });

  it('shows each condition separately with its own reason', () => {
    const finding = result.clusters.find((f) => f.definition.id === 'unverified_external_import')!;
    assert.equal(finding.outcomes.length, finding.conditionsTotal);
    for (const outcome of finding.outcomes) {
      assert.ok(outcome.reason.length > 0);
    }
  });
});

describe('sparse session', () => {
  const result = run(SPARSE);

  it('declines to judge rather than guessing', () => {
    assert.equal(result.recommendation, RECOMMENDATION.INSUFFICIENT_EVIDENCE);
  });

  it('does not treat missing evidence as adverse', () => {
    assert.equal(result.risk, 0);
    assert.ok(result.trust >= 40, `absent evidence pushed trust to ${result.trust}`);
  });

  it('says so in language that does not blame the developer', () => {
    const summary = developerFacingSummary(result);
    assert.match(summary, /limitation on our side|not a finding/i);
  });
});

describe('no single signal can drive an adverse outcome', () => {
  const base: EventSpec[] = [
    sessionStart,
    { type: TrustEventType.TYPING_BURST, at: 5_000, payload: payloads.typingBurst(400, 40_000, 120) },
    { type: TrustEventType.TEXT_INSERTED, at: 46_000, payload: payloads.insert(400, 16) },
    { type: TrustEventType.CODE_DIFF_APPLIED, at: 50_000, payload: payloads.diff(16, 4) },
    { type: TrustEventType.TEST_RUN_STARTED, at: 60_000, payload: { runId: 'r1', scope: 'all', suiteOrigin: 'authored' } },
    { type: TrustEventType.TEST_RUN_FINISHED, at: 64_000, payload: payloads.testFinished('r1', 5, 0) },
  ];

  it('one large paste alone fires nothing', () => {
    const result = run([
      ...base,
      { type: TrustEventType.CODE_PASTE, at: 30_000, payload: payloads.paste(2_000, 70, 'external') },
      { type: TrustEventType.LARGE_INSERTION, at: 30_100, payload: payloads.largeInsertion(2_000, 70, 'paste') },
    ]);
    assert.deepEqual(result.clusters.filter((f) => f.fired).map((f) => f.definition.id), []);
    assert.equal(result.risk, 0);
  });

  it('one external AI visit alone fires nothing', () => {
    const result = run([
      ...base,
      { type: TrustEventType.EXTERNAL_RESOURCE_ACCESSED, at: 10_000, payload: payloads.externalVisit('v1', 'ai_tool') },
      { type: TrustEventType.EXTERNAL_RESOURCE_LEFT, at: 20_000, payload: { visitId: 'v1', totalDwellMs: 10_000 } },
    ]);
    assert.deepEqual(result.clusters.filter((f) => f.fired).map((f) => f.definition.id), []);
    assert.equal(result.risk, 0);
  });

  it('one instant completion acceptance alone fires nothing', () => {
    const result = run([
      ...base,
      { type: TrustEventType.AI_SUGGESTION_SHOWN, at: 10_000, payload: payloads.suggestionShown('s1', 12, 500) },
      { type: TrustEventType.AI_SUGGESTION_ACCEPTED, at: 10_050, payload: payloads.suggestionAccepted('s1', 12, 500, 50) },
    ]);
    assert.deepEqual(result.clusters.filter((f) => f.fired).map((f) => f.definition.id), []);
  });

  it('one integrity violation alone fires nothing', () => {
    const result = run([
      ...base,
      { type: TrustEventType.RUNTIME_INTEGRITY_VIOLATION, at: 12_000, payload: { violationKind: 'devtools_hook_detected', detectorConfidence: 0.8 } },
    ]);
    assert.deepEqual(result.clusters.filter((f) => f.fired).map((f) => f.definition.id), []);
  });

  it('adding one adverse event to an honest session moves trust only slightly', () => {
    const clean = run(HONEST_SOLO);
    const withPaste = run([
      ...HONEST_SOLO,
      { type: TrustEventType.CODE_PASTE, at: 210_000, payload: payloads.paste(1_500, 50, 'external') },
      { type: TrustEventType.LARGE_INSERTION, at: 210_100, payload: payloads.largeInsertion(1_500, 50, 'paste') },
    ]);
    assert.ok(
      Math.abs(clean.trust - withPaste.trust) <= 15,
      `a single paste moved trust by ${Math.abs(clean.trust - withPaste.trust)} points`,
    );
  });
});

describe('confidence behaviour', () => {
  it('is independent of trust', () => {
    const honest = run(HONEST_SOLO);
    const sparse = run(SPARSE);
    // The sparse session is not accused of anything, but we know far less.
    assert.ok(sparse.confidence < honest.confidence);
  });

  it('never reports full certainty', () => {
    for (const specs of [HONEST_SOLO, HONEST_WITH_DOCS, HEAVY_ASSISTANCE_ENGAGED, DEPENDENT]) {
      const result = run(specs);
      assert.ok(result.confidence < 100, 'trust is never certain');
    }
  });

  it('blocks adverse recommendations when confidence is too low', () => {
    // Corroborated concerns, but almost no telemetry to support them.
    const result = run([
      sessionStart,
      { type: TrustEventType.EXTERNAL_ORIGIN_IMPORT, at: 10_000, payload: payloads.externalImport('v1', 'ai_tool', 2_000, 0) },
      { type: TrustEventType.LARGE_INSERTION, at: 10_100, payload: payloads.largeInsertion(2_000, 60, 'paste') },
    ]);
    assert.notEqual(
      result.recommendation,
      RECOMMENDATION.HUMAN_REVIEW_REQUIRED,
      'thin evidence must not produce an adverse recommendation',
    );
  });

  it('lowers confidence when telemetry is lost', () => {
    const full = run(HONEST_SOLO);
    const gappy = run([
      ...HONEST_SOLO,
      { type: TrustEventType.SANDBOX_DISCONNECTED, at: 206_000, payload: { reason: 'network', lastAcknowledgedSequence: 20 } },
      { type: TrustEventType.SANDBOX_RECONNECTED, at: 320_000, payload: { outageMs: 114_000, eventsReplayed: 0 } },
    ]);
    assert.ok(gappy.confidence <= full.confidence);
    assert.equal(gappy.risk, 0, 'a network outage is not a risk signal');
  });
});

describe('explainability', () => {
  it('always answers why the score came out this way', () => {
    for (const specs of [HONEST_SOLO, HEAVY_ASSISTANCE_ENGAGED, DEPENDENT, SPARSE]) {
      const result = run(specs);
      assert.ok(result.explanation.headline.length > 0);
      assert.ok(result.explanation.confidenceFactors.length > 0);
      assert.ok(result.limitations.length > 0);
    }
  });

  it('always states that trust is not certain', () => {
    const result = run(HONEST_SOLO);
    assert.ok(
      result.limitations.some((limitation) => /never certain/i.test(limitation)),
      'every report must disclaim certainty',
    );
  });

  it('shows mitigating evidence alongside any concern', () => {
    const result = run(DEPENDENT);
    const fired = result.clusters.filter((f) => f.fired);
    assert.ok(fired.length > 0);
    // Mitigations are computed for every fired cluster, even when empty, so a
    // reviewer always sees both sides in the same place.
    for (const finding of fired) {
      assert.ok(Array.isArray(finding.mitigations));
    }
  });

  it('renders a report a human can read', () => {
    const report = renderReport(run(DEPENDENT));
    assert.match(report, /SCORA TRUST REPORT/);
    assert.match(report, /CORROBORATED CONCERNS/);
    assert.match(report, /How to read this/);
    assert.match(report, /LIMITATIONS/);
  });

  it('never tells a developer they triggered a named pattern', () => {
    const summary = developerFacingSummary(run(DEPENDENT));
    for (const definition of CLUSTER_CATALOGUE) {
      assert.ok(!summary.includes(definition.title), 'developers must not be shown raw cluster names');
    }
    assert.doesNotMatch(summary, /cheat|fraud|suspicious|dependence/i);
  });

  it('carries an evidence trail from score back to events', () => {
    const result = run(DEPENDENT);
    const finding = result.clusters.find((f) => f.fired)!;
    assert.ok(finding.evidence.length > 0, 'a fired cluster must cite the events behind it');
  });
});

describe('policy invariants', () => {
  it('emits recommendations, never verdicts', () => {
    const values = Object.values(RECOMMENDATION);
    for (const value of values) {
      assert.doesNotMatch(value, /^(APPROVE|REJECT|PASS|FAIL|CHEAT)/);
    }
  });

  it('produces scores in range for every archetype', () => {
    for (const specs of [HONEST_SOLO, HONEST_WITH_DOCS, HEAVY_ASSISTANCE_ENGAGED, DEPENDENT, SPARSE]) {
      const result = run(specs);
      for (const key of ['trust', 'risk', 'confidence'] as const) {
        assert.ok(
          Number.isInteger(result[key]) && result[key] >= 0 && result[key] <= 100,
          `${key} was ${result[key]}`,
        );
      }
    }
  });

  it('is deterministic', () => {
    const a = run(DEPENDENT);
    const b = run(DEPENDENT);
    assert.deepEqual(
      [a.trust, a.risk, a.confidence, a.recommendation],
      [b.trust, b.risk, b.confidence, b.recommendation],
    );
  });

  it('stamps the policy version so a stored score stays interpretable', () => {
    assert.match(run(HONEST_SOLO).policyVersion, /^\d{4}\.\d{2}-\d+$/);
  });

  it('rates an honest session above a dependent one', () => {
    assert.ok(run(HONEST_SOLO).trust > run(DEPENDENT).trust);
  });
});

describe('interview influence', () => {
  it('lets a strong explanation lift a session with concerns', () => {
    const extraction = extractFeatures(buildSession(DEPENDENT), TEST_CONTEXT);
    const withoutInterview = score(extraction);
    const withInterview = score(extraction, {
      understanding: {
        interviewScore: clampUnit(0.92),
        consistencyWithCode: clampUnit(0.9),
        questionsAsked: 8,
      },
    });
    assert.ok(
      withInterview.trust > withoutInterview.trust,
      'explaining your work must be able to discharge a concern',
    );
  });

  it('lets a failed explanation lower an otherwise clean session', () => {
    const extraction = extractFeatures(buildSession(HONEST_SOLO), TEST_CONTEXT);
    const withoutInterview = score(extraction);
    const withInterview = score(extraction, {
      understanding: {
        interviewScore: clampUnit(0.15),
        consistencyWithCode: clampUnit(0.1),
        questionsAsked: 8,
      },
    });
    assert.ok(withInterview.trust < withoutInterview.trust);
  });

  it('weights the interview by how many questions were actually asked', () => {
    const extraction = extractFeatures(buildSession(HONEST_SOLO), TEST_CONTEXT);
    const oneQuestion = score(extraction, {
      understanding: { interviewScore: clampUnit(0.1), consistencyWithCode: clampUnit(0.1), questionsAsked: 1 },
    });
    const manyQuestions = score(extraction, {
      understanding: { interviewScore: clampUnit(0.1), consistencyWithCode: clampUnit(0.1), questionsAsked: 12 },
    });
    assert.ok(
      manyQuestions.trust < oneQuestion.trust,
      'one bad answer must not carry the weight of twelve',
    );
  });
});
