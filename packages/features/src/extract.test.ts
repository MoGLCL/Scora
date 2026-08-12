import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TrustEventType, TrustLayer } from '@scora/trust-core';
import { FeaturePolarity } from './contract.ts';
import { EXTRACTED_LAYERS, FEATURE_DEFINITIONS, extractFeatures } from './extract.ts';
import { TEST_CONTEXT, buildSession, hexHash, payloads, type EventSpec } from './testing.ts';

/**
 * Scenario-driven tests.
 *
 * The archetypes below are the ones the anti-false-positive requirement names:
 * a human working alone, a human with documentation, a human using editor
 * completions well, and a genuinely dependent session. The load-bearing
 * assertions are the ones proving the first three do NOT trip risk features.
 */

function extract(specs: readonly EventSpec[]) {
  return extractFeatures(buildSession(specs), TEST_CONTEXT);
}

function value(result: ReturnType<typeof extract>, name: string): number | null {
  const feature = result.featuresByName.get(name);
  assert.ok(feature !== undefined, `feature ${name} was not produced`);
  return feature.value;
}

const sessionStart: EventSpec = {
  type: TrustEventType.SESSION_STARTED,
  at: 0,
  payload: payloads.sessionStart(),
};

describe('extraction contract', () => {
  it('covers Layers 01 through 07', () => {
    assert.deepEqual(EXTRACTED_LAYERS, [
      TrustLayer.ENVIRONMENT,
      TrustLayer.INTERACTION,
      TrustLayer.TYPING,
      TrustLayer.CODE_EVOLUTION,
      TrustLayer.RUNTIME,
      TrustLayer.EXTERNAL,
      TrustLayer.AI_ASSISTANCE,
    ]);
  });

  it('documents every feature it produces', () => {
    const result = extract([sessionStart]);
    for (const feature of result.all) {
      const definition = FEATURE_DEFINITIONS.get(feature.name);
      assert.ok(definition !== undefined, `${feature.name} has no definition`);
      assert.equal(definition.layer, feature.layer);
      assert.ok(definition.interpretation.length > 0, `${feature.name} has no interpretation`);
      assert.ok(definition.inputs.length > 0, `${feature.name} declares no input events`);
    }
  });

  it('produces no feature without a definition and no definition without a feature', () => {
    const produced = new Set(extract([sessionStart]).all.map((feature) => feature.name));
    const defined = new Set(FEATURE_DEFINITIONS.keys());
    assert.deepEqual([...defined].filter((name) => !produced.has(name)), []);
    assert.deepEqual([...produced].filter((name) => !defined.has(name)), []);
  });

  it('gives every computed feature traceable evidence', () => {
    const result = extract([
      sessionStart,
      { type: TrustEventType.TYPING_BURST, at: 1000, payload: payloads.typingBurst(200, 12_000) },
      { type: TrustEventType.CODE_DIFF_APPLIED, at: 14_000, payload: payloads.diff(10, 2) },
      { type: TrustEventType.AI_SUGGESTION_SHOWN, at: 20_000, payload: payloads.suggestionShown('s1', 2, 50) },
      { type: TrustEventType.AI_SUGGESTION_ACCEPTED, at: 22_000, payload: payloads.suggestionAccepted('s1', 2, 50, 2_000) },
    ]);

    // Any feature that measured something must be able to say what it measured
    // it from. Session-level features derived from the window itself are the
    // only exception and are named explicitly.
    const windowDerived = new Set(['env.session_continuity', 'env.telemetry_coverage']);
    const unevidenced = result.all
      .filter(
        (feature) =>
          feature.value !== null &&
          feature.sampleSize > 0 &&
          feature.evidence.length === 0 &&
          !windowDerived.has(feature.name),
      )
      .map((feature) => feature.name);

    assert.deepEqual(unevidenced, [], 'these features produced a value with no evidence trail');
  });

  it('reports null rather than zero when evidence is absent', () => {
    const result = extract([sessionStart]);
    // No suggestions were ever shown, so an acceptance rate is unknowable —
    // reporting 0 would imply the developer declined everything.
    assert.equal(value(result, 'assist.acceptance_rate'), null);
    assert.equal(result.featuresByName.get('assist.acceptance_rate')!.confidence, 0);
  });

  it('never lets a single-sample feature claim high confidence', () => {
    const result = extract([
      sessionStart,
      { type: TrustEventType.TYPING_BURST, at: 1000, payload: payloads.typingBurst(50, 3000) },
    ]);
    const authored = result.featuresByName.get('typing.characters_authored')!;
    assert.ok(authored.confidence < 0.3, `single observation claimed confidence ${authored.confidence}`);
  });

  it('is deterministic', () => {
    const specs: EventSpec[] = [
      sessionStart,
      { type: TrustEventType.TYPING_BURST, at: 1000, payload: payloads.typingBurst(300, 20_000) },
      { type: TrustEventType.CODE_DIFF_APPLIED, at: 22_000, payload: payloads.diff(15, 3) },
    ];
    const first = extract(specs);
    const second = extract(specs);
    assert.deepEqual(
      first.all.map((f) => [f.name, f.value, f.confidence]),
      second.all.map((f) => [f.name, f.value, f.confidence]),
    );
  });
});

describe('archetype: human working alone', () => {
  const specs: EventSpec[] = [
    sessionStart,
    { type: TrustEventType.FILE_OPENED, at: 2_000, payload: { path: 'src/app.ts', language: 'typescript', lineCount: 40 } },
    { type: TrustEventType.TYPING_BURST, at: 5_000, payload: payloads.typingBurst(420, 60_000, 140) },
    { type: TrustEventType.TEXT_INSERTED, at: 65_000, payload: payloads.insert(420, 18) },
    { type: TrustEventType.BACKSPACE_BURST, at: 70_000, payload: { path: 'src/app.ts', backspaceCount: 45, durationMs: 4_000 } },
    { type: TrustEventType.TYPING_BURST, at: 80_000, payload: payloads.typingBurst(260, 40_000, 165) },
    { type: TrustEventType.CODE_DIFF_APPLIED, at: 122_000, payload: payloads.diff(20, 6) },
    { type: TrustEventType.CODE_EXECUTION_STARTED, at: 130_000, payload: { executionId: 'x1', trigger: 'manual', entryPoint: 'src/app.ts' } },
    { type: TrustEventType.RUNTIME_ERROR_OBSERVED, at: 132_000, payload: payloads.error('sig1') },
    { type: TrustEventType.FIX_ATTEMPTED, at: 150_000, payload: { errorSignatureHash: hexHash('sig1'), attemptNumber: 1, path: 'src/app.ts', charactersChanged: 60, timeSinceErrorMs: 18_000 } },
    { type: TrustEventType.CODE_DIFF_APPLIED, at: 155_000, payload: payloads.diff(4, 3) },
    { type: TrustEventType.ERROR_RESOLVED, at: 170_000, payload: payloads.errorResolved('sig1', 2, 38_000) },
    { type: TrustEventType.TEST_RUN_STARTED, at: 175_000, payload: { runId: 'r1', scope: 'all', suiteOrigin: 'authored' } },
    { type: TrustEventType.TEST_RUN_FINISHED, at: 180_000, payload: payloads.testFinished('r1', 8, 0) },
    { type: TrustEventType.TASK_SUBMITTED, at: 185_000, payload: { taskId: 'task_test', durationMs: 185_000, finalDigest: 'a'.repeat(64), testsPassing: 8, testsTotal: 8 } },
  ];

  it('trips no risk-contributing feature', () => {
    const result = extract(specs);
    for (const feature of result.all) {
      if (feature.polarity === FeaturePolarity.RISK_CONTRIBUTING) {
        assert.ok(
          feature.value === null || feature.value === 0,
          `${feature.name} fired at ${feature.value} for an honest solo session`,
        );
      }
    }
  });

  it('credits self-correction as evidence of authorship', () => {
    const result = extract(specs);
    assert.ok((value(result, 'typing.correction_ratio') ?? 0) > 0);
    assert.equal(value(result, 'typing.authorship_ratio'), 1);
  });

  it('credits debugging and verification', () => {
    const result = extract(specs);
    assert.equal(value(result, 'runtime.error_resolution_rate'), 1);
    assert.equal(value(result, 'runtime.authored_test_ratio'), 1);
    assert.equal(value(result, 'runtime.verification_before_submit'), 1);
    assert.equal(value(result, 'runtime.final_test_pass_ratio'), 1);
  });
});

describe('archetype: human with documentation', () => {
  const specs: EventSpec[] = [
    sessionStart,
    { type: TrustEventType.EXTERNAL_RESOURCE_ACCESSED, at: 10_000, payload: payloads.externalVisit('v1', 'official_documentation') },
    { type: TrustEventType.EXTERNAL_RESOURCE_DWELL, at: 12_000, payload: { visitId: 'v1', category: 'official_documentation', dwellMs: 90_000, returnVisitNumber: 1 } },
    { type: TrustEventType.EXTERNAL_RESOURCE_LEFT, at: 100_000, payload: { visitId: 'v1', totalDwellMs: 90_000 } },
    { type: TrustEventType.TYPING_BURST, at: 105_000, payload: payloads.typingBurst(380, 55_000, 145) },
    { type: TrustEventType.TEXT_INSERTED, at: 160_000, payload: payloads.insert(380, 16) },
    { type: TrustEventType.EXTERNAL_RESOURCE_ACCESSED, at: 170_000, payload: payloads.externalVisit('v2', 'official_documentation') },
    { type: TrustEventType.EXTERNAL_RESOURCE_DWELL, at: 172_000, payload: { visitId: 'v2', category: 'official_documentation', dwellMs: 40_000, returnVisitNumber: 2 } },
    { type: TrustEventType.CODE_DIFF_APPLIED, at: 220_000, payload: payloads.diff(16, 4) },
    { type: TrustEventType.TEST_RUN_STARTED, at: 230_000, payload: { runId: 'r1', scope: 'all', suiteOrigin: 'provided' } },
    { type: TrustEventType.TEST_RUN_FINISHED, at: 234_000, payload: payloads.testFinished('r1', 6, 0) },
  ];

  it('treats documentation use as supportive, never as risk', () => {
    const result = extract(specs);
    assert.equal(value(result, 'external.documentation_ratio'), 1);
    // No imports were correlated at all, so nothing can be flagged.
    assert.equal(value(result, 'external.unadapted_import_count'), 0);
    assert.equal(
      result.featuresByName.get('external.visit_count')!.polarity,
      FeaturePolarity.NEUTRAL,
    );
  });

  it('credits returning to a reference as study', () => {
    const result = extract(specs);
    assert.equal(value(result, 'external.study_ratio'), 0.5);
  });

  it('trips no risk-contributing feature', () => {
    const result = extract(specs);
    const fired = result.all.filter(
      (f) => f.polarity === FeaturePolarity.RISK_CONTRIBUTING && (f.value ?? 0) > 0,
    );
    assert.deepEqual(fired.map((f) => f.name), []);
  });
});

describe('archetype: fast developer using editor completions well', () => {
  const specs: EventSpec[] = [
    sessionStart,
    { type: TrustEventType.AI_SUGGESTION_SHOWN, at: 5_000, payload: payloads.suggestionShown('s1', 1, 12) },
    { type: TrustEventType.AI_SUGGESTION_ACCEPTED, at: 5_300, payload: payloads.suggestionAccepted('s1', 1, 12, 300) },
    { type: TrustEventType.AI_SUGGESTION_SHOWN, at: 20_000, payload: payloads.suggestionShown('s2', 4, 180) },
    { type: TrustEventType.AI_SUGGESTION_ACCEPTED, at: 24_000, payload: payloads.suggestionAccepted('s2', 4, 180, 4_000) },
    { type: TrustEventType.AI_SUGGESTION_MODIFIED, at: 40_000, payload: payloads.suggestionModified('s2', 0.45) },
    { type: TrustEventType.AI_SUGGESTION_TESTED, at: 60_000, payload: payloads.suggestionTested('s2') },
    { type: TrustEventType.AI_SUGGESTION_SHOWN, at: 70_000, payload: payloads.suggestionShown('s3', 6, 240) },
    { type: TrustEventType.AI_SUGGESTION_REJECTED, at: 73_000, payload: { suggestionId: 's3', deliberationMs: 3_000, reason: 'replaced_with_own' } },
    { type: TrustEventType.TYPING_BURST, at: 75_000, payload: payloads.typingBurst(500, 30_000, 60) },
    { type: TrustEventType.CODE_DIFF_APPLIED, at: 110_000, payload: payloads.diff(24, 8) },
    { type: TrustEventType.TEST_RUN_STARTED, at: 115_000, payload: { runId: 'r1', scope: 'all', suiteOrigin: 'authored' } },
    { type: TrustEventType.TEST_RUN_FINISHED, at: 119_000, payload: payloads.testFinished('r1', 10, 0) },
  ];

  it('does not treat a single-token completion accepted in 300ms as dependency', () => {
    const result = extract(specs);
    // s1 was one line: fast acceptance is exactly how autocomplete works.
    assert.equal(value(result, 'assist.dependency_index'), 0);
  });

  it('does not treat fast typing as adverse', () => {
    const result = extract(specs);
    // 60ms mean interval is a very fast typist. Nothing here may fire.
    const fired = result.all.filter(
      (f) => f.polarity === FeaturePolarity.RISK_CONTRIBUTING && (f.value ?? 0) > 0,
    );
    assert.deepEqual(fired.map((f) => f.name), []);
  });

  it('credits modification, testing and rejection of suggestions', () => {
    const result = extract(specs);
    assert.equal(value(result, 'assist.modification_ratio'), 0.45);
    assert.ok((value(result, 'assist.post_acceptance_engagement_rate') ?? 0) >= 0.5);
    assert.ok((value(result, 'assist.rejection_rate') ?? 0) > 0);
  });

  it('keeps the assisted-character ratio neutral rather than adverse', () => {
    const result = extract(specs);
    const feature = result.featuresByName.get('assist.assisted_character_ratio')!;
    assert.equal(feature.polarity, FeaturePolarity.NEUTRAL);
    assert.ok((feature.value ?? 0) > 0, 'assistance was used and should be visible');
  });
});

describe('archetype: dependent session', () => {
  const specs: EventSpec[] = [
    sessionStart,
    { type: TrustEventType.EXTERNAL_RESOURCE_ACCESSED, at: 5_000, payload: payloads.externalVisit('v1', 'ai_tool') },
    { type: TrustEventType.EXTERNAL_RESOURCE_LEFT, at: 30_000, payload: { visitId: 'v1', totalDwellMs: 25_000 } },
    { type: TrustEventType.EXTERNAL_ORIGIN_IMPORT, at: 38_000, payload: payloads.externalImport('v1', 'ai_tool', 2_400, 0.02) },
    { type: TrustEventType.LARGE_INSERTION, at: 38_500, payload: payloads.largeInsertion(2_400, 82, 'paste') },
    { type: TrustEventType.CODE_PASTE, at: 38_600, payload: payloads.paste(2_400, 82, 'external') },
    { type: TrustEventType.AI_SUGGESTION_SHOWN, at: 50_000, payload: payloads.suggestionShown('s1', 12, 600) },
    { type: TrustEventType.AI_SUGGESTION_ACCEPTED, at: 50_100, payload: payloads.suggestionAccepted('s1', 12, 600, 100) },
    { type: TrustEventType.TASK_SUBMITTED, at: 60_000, payload: { taskId: 'task_test', durationMs: 60_000, finalDigest: 'a'.repeat(64), testsPassing: null, testsTotal: null } },
  ];

  it('flags the unadapted external import', () => {
    const result = extract(specs);
    assert.equal(value(result, 'external.unadapted_import_count'), 1);
    assert.equal(value(result, 'external.adaptation_ratio'), 0);
  });

  it('flags a substantial suggestion accepted instantly and never examined', () => {
    const result = extract(specs);
    assert.equal(value(result, 'assist.dependency_index'), 1);
    assert.equal(value(result, 'assist.post_acceptance_engagement_rate'), 0);
  });

  it('records that nothing was verified before submission', () => {
    const result = extract(specs);
    assert.equal(value(result, 'runtime.verification_before_submit'), 0);
    assert.equal(value(result, 'evolution.post_insertion_revision_ratio'), 0);
  });

  it('still reports each signal separately rather than as a verdict', () => {
    const result = extract(specs);
    // Feature extraction measures; it must not conclude. No feature named
    // anything like a judgement may exist.
    const judgemental = result.all.filter((f) => /cheat|fraud|guilty|suspicious/i.test(f.name));
    assert.deepEqual(judgemental, []);
  });
});

describe('false-positive guards', () => {
  it('does not penalise pasting the developer own code', () => {
    const result = extract([
      sessionStart,
      { type: TrustEventType.CODE_PASTE, at: 10_000, payload: payloads.paste(1_800, 60, 'internal') },
      { type: TrustEventType.LARGE_INSERTION, at: 10_100, payload: payloads.largeInsertion(1_800, 60, 'paste') },
      { type: TrustEventType.CODE_DIFF_APPLIED, at: 30_000, payload: payloads.diff(60, 12) },
    ]);
    assert.equal(value(result, 'typing.unexplained_insertion_ratio'), 0);
    assert.equal(value(result, 'typing.internal_paste_ratio'), 1);
  });

  it('does not penalise accepting a large completion that was then reworked', () => {
    const result = extract([
      sessionStart,
      { type: TrustEventType.AI_SUGGESTION_SHOWN, at: 5_000, payload: payloads.suggestionShown('s1', 20, 900) },
      { type: TrustEventType.AI_SUGGESTION_ACCEPTED, at: 5_200, payload: payloads.suggestionAccepted('s1', 20, 900, 200) },
      { type: TrustEventType.AI_SUGGESTION_MODIFIED, at: 40_000, payload: payloads.suggestionModified('s1', 0.6) },
    ]);
    assert.equal(
      value(result, 'assist.dependency_index'),
      0,
      'instant acceptance followed by substantial rework is not dependency',
    );
  });

  it('does not treat a completion-sourced bulk insertion as an unexplained import', () => {
    const result = extract([
      sessionStart,
      { type: TrustEventType.LARGE_INSERTION, at: 10_000, payload: payloads.largeInsertion(900, 30, 'completion_accept') },
    ]);
    assert.equal(value(result, 'typing.unexplained_insertion_ratio'), 0);
  });

  it('does not compare a first-time developer against anyone else', () => {
    const result = extract([
      sessionStart,
      { type: TrustEventType.TYPING_BURST, at: 1_000, payload: payloads.typingBurst(900, 20_000, 22) },
    ]);
    // Extremely fast typing with no history must produce no comparison at all,
    // rather than a comparison against a population average.
    assert.equal(value(result, 'typing.rate_vs_baseline'), null);
  });

  it('lowers confidence when comparing against the session instead of history', () => {
    const withoutHistory = extractFeatures(
      buildSession([
        sessionStart,
        { type: TrustEventType.TEXT_INSERTED, at: 1_000, payload: payloads.insert(40, 2) },
        { type: TrustEventType.LARGE_INSERTION, at: 5_000, payload: payloads.largeInsertion(1_200, 40, 'paste') },
      ]),
      TEST_CONTEXT,
    );
    const withHistory = extractFeatures(
      buildSession([
        sessionStart,
        { type: TrustEventType.TEXT_INSERTED, at: 1_000, payload: payloads.insert(40, 2) },
        { type: TrustEventType.LARGE_INSERTION, at: 5_000, payload: payloads.largeInsertion(1_200, 40, 'paste') },
      ]),
      {
        ...TEST_CONTEXT,
        baseline: {
          developerId: TEST_CONTEXT.developerId,
          sessionsObserved: 12,
          medianTypingRateCpm: 300,
          medianInsertionChars: 40,
          medianCorrectionRatio: 0.1,
          medianSuggestionAcceptanceRate: 0.5,
          medianErrorRecoveryMs: 30_000,
        },
      },
    );

    const a = withoutHistory.featuresByName.get('typing.insertion_baseline_multiple')!;
    const b = withHistory.featuresByName.get('typing.insertion_baseline_multiple')!;
    assert.ok(a.confidence < b.confidence, 'a within-session comparison is a weaker claim');
  });

  it('does not treat losing telemetry as a risk signal', () => {
    const result = extract([
      sessionStart,
      { type: TrustEventType.SANDBOX_DISCONNECTED, at: 10_000, payload: { reason: 'network', lastAcknowledgedSequence: 1 } },
      { type: TrustEventType.SANDBOX_RECONNECTED, at: 90_000, payload: { outageMs: 80_000, eventsReplayed: 0 } },
    ]);
    const coverage = result.featuresByName.get('env.telemetry_coverage')!;
    assert.equal(coverage.polarity, FeaturePolarity.CONFIDENCE_AFFECTING);
    assert.ok((coverage.value ?? 1) < 1, 'the gap should be visible');
    assert.equal(value(result, 'env.runtime_integrity_violations'), 0);
  });

  it('does not treat leaving the window as adverse', () => {
    const result = extract([
      sessionStart,
      { type: TrustEventType.WINDOW_FOCUS_LOST, at: 10_000, payload: { focusedDurationMs: 10_000 } },
      { type: TrustEventType.WINDOW_FOCUS_GAINED, at: 70_000, payload: { awayMs: 60_000 } },
      { type: TrustEventType.WINDOW_FOCUS_LOST, at: 80_000, payload: { focusedDurationMs: 10_000 } },
      { type: TrustEventType.WINDOW_FOCUS_GAINED, at: 140_000, payload: { awayMs: 60_000 } },
    ]);
    const retention = result.featuresByName.get('env.focus_retention')!;
    assert.equal(retention.polarity, FeaturePolarity.NEUTRAL);
  });

  it('does not treat long idle periods as adverse', () => {
    const result = extract([
      sessionStart,
      { type: TrustEventType.IDLE_PERIOD_DETECTED, at: 60_000, payload: { idleMs: 300_000, precededBy: 'session_start' } },
      { type: TrustEventType.TYPING_BURST, at: 370_000, payload: payloads.typingBurst(400, 30_000) },
    ]);
    const idle = result.featuresByName.get('interaction.idle_ratio')!;
    assert.equal(idle.polarity, FeaturePolarity.NEUTRAL);
    assert.ok((idle.value ?? 0) > 0);
  });
});

describe('policy invariants', () => {
  it('keeps the risk-contributing feature set small and explicit', () => {
    const risky = [...FEATURE_DEFINITIONS.values()]
      .filter((definition) => definition.polarity === FeaturePolarity.RISK_CONTRIBUTING)
      .map((definition) => definition.name)
      .sort();

    assert.deepEqual(risky, [
      'assist.dependency_index',
      'env.device_context_changes',
      'env.runtime_integrity_violations',
      'external.unadapted_import_count',
      'typing.unexplained_insertion_ratio',
    ], 'adding a risk-contributing feature is a policy decision and must be deliberate');
  });

  it('gives every risk-contributing feature an interpretation demanding corroboration', () => {
    for (const definition of FEATURE_DEFINITIONS.values()) {
      if (definition.polarity !== FeaturePolarity.RISK_CONTRIBUTING) continue;
      assert.match(
        definition.interpretation,
        /corroborat|cluster|alone|conjunctive|not a (conclusion|verdict|finding)/i,
        `${definition.name} must state that it cannot stand alone`,
      );
    }
  });

  it('has no risk-contributing feature in the interaction layer', () => {
    for (const definition of FEATURE_DEFINITIONS.values()) {
      if (definition.layer !== TrustLayer.INTERACTION) continue;
      assert.notEqual(definition.polarity, FeaturePolarity.RISK_CONTRIBUTING);
    }
  });

  it('keeps raw editor-assistance usage neutral', () => {
    for (const name of ['assist.acceptance_rate', 'assist.assisted_character_ratio', 'assist.suggestions_shown']) {
      assert.equal(
        FEATURE_DEFINITIONS.get(name)!.polarity,
        FeaturePolarity.NEUTRAL,
        `${name} must not imply that using the editor is adverse`,
      );
    }
  });

  it('keeps external access itself neutral', () => {
    assert.equal(FEATURE_DEFINITIONS.get('external.visit_count')!.polarity, FeaturePolarity.NEUTRAL);
    assert.equal(
      FEATURE_DEFINITIONS.get('external.ai_tool_visit_count')!.polarity,
      FeaturePolarity.NEUTRAL,
    );
  });

  it('never claims certainty about external AI observability', () => {
    const result = extract([
      sessionStart,
      { type: TrustEventType.EXTERNAL_RESOURCE_ACCESSED, at: 5_000, payload: payloads.externalVisit('v1', 'ai_tool') },
    ]);
    const feature = result.featuresByName.get('external.ai_tool_visit_count')!;
    assert.ok(feature.confidence <= 0.5, 'external AI use cannot be observed reliably');
    assert.match(FEATURE_DEFINITIONS.get('external.ai_tool_visit_count')!.interpretation, /not.*reliable|incomplete/i);
  });
});
