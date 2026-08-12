import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LAYER_DEFINITIONS, ORDERED_LAYERS, TrustLayer } from './layers.ts';
import {
  EVENT_REGISTRY,
  EvidencePolarity,
  Sensitivity,
  canContributeToRisk,
  describeEvent,
  eventsForLayer,
} from './registry.ts';
import { ALL_EVENT_TYPES, TrustEventType, isTrustEventType } from './types.ts';
import { PAYLOAD_SCHEMAS } from '../validation/payloads.ts';

describe('event taxonomy', () => {
  it('registers every declared event type', () => {
    const unregistered = ALL_EVENT_TYPES.filter((type) => EVENT_REGISTRY[type] === undefined);
    assert.deepEqual(unregistered, [], 'every event type needs a registry entry');
  });

  it('registers nothing that is not a declared event type', () => {
    const stray = Object.keys(EVENT_REGISTRY).filter((type) => !isTrustEventType(type));
    assert.deepEqual(stray, []);
  });

  it('has no duplicate event type values across the layer groups', () => {
    assert.equal(new Set(ALL_EVENT_TYPES).size, ALL_EVENT_TYPES.length);
  });

  it('assigns each event to a known layer', () => {
    const layers = new Set<string>(Object.values(TrustLayer));
    for (const definition of Object.values(EVENT_REGISTRY)) {
      assert.ok(layers.has(definition.layer), `${definition.type} has an unknown layer`);
    }
  });

  it('gives every layer at least one event, so no layer is decorative', () => {
    for (const layer of ORDERED_LAYERS) {
      assert.ok(eventsForLayer(layer).length > 0, `${layer} has no events`);
    }
  });

  it('describes an event by type', () => {
    const definition = describeEvent(TrustEventType.CODE_PASTE);
    assert.equal(definition.layer, TrustLayer.TYPING);
  });

  it('throws on an unregistered type rather than returning undefined', () => {
    assert.throws(() => describeEvent('NOT_A_REAL_EVENT' as TrustEventType));
  });
});

describe('scoring policy encoded in the registry', () => {
  it('never lets a risk-contributing event stand on its own', () => {
    const offenders = Object.values(EVENT_REGISTRY).filter(
      (definition) =>
        definition.polarity === EvidencePolarity.RISK_CONTRIBUTING && definition.sufficientAlone,
    );
    assert.deepEqual(
      offenders.map((definition) => definition.type),
      [],
      'a single risk signal must never be sufficient evidence',
    );
  });

  it('treats editor assistance as neutral or supportive, never as inherent risk', () => {
    const aiEvents = eventsForLayer(TrustLayer.AI_ASSISTANCE);
    assert.ok(aiEvents.length > 0);
    for (const definition of aiEvents) {
      assert.notEqual(
        definition.polarity,
        EvidencePolarity.RISK_CONTRIBUTING,
        `${definition.type} must not treat editor assistance as risk`,
      );
    }
  });

  it('exposes no conversational assistant events, since the sandbox has no chat', () => {
    const forbidden = ALL_EVENT_TYPES.filter((type) =>
      /ASK_AI|CHAT|PROMPT|EXPLANATION_REQUESTED|SUGGESTION_REQUESTED|GENERATED_CODE/.test(type),
    );
    assert.deepEqual(
      forbidden,
      [],
      'the sandbox is an editor with completions, not a code-generation chatbot',
    );
  });

  it('has no payload field that could carry a developer prompt', () => {
    for (const definition of eventsForLayer(TrustLayer.AI_ASSISTANCE)) {
      const schema = PAYLOAD_SCHEMAS[definition.type];
      const result = schema.validate({ prompt: 'solve this for me' }, '');
      assert.ok(!result.ok, `${definition.type} must not accept a prompt field`);
      assert.ok(
        result.error.some((issue) => issue.path === 'prompt' && issue.code === 'UNKNOWN_FIELD'),
        `${definition.type} must reject a prompt field outright`,
      );
    }
  });

  it('treats pasting and fast typing as neutral rather than adverse', () => {
    assert.equal(describeEvent(TrustEventType.CODE_PASTE).polarity, EvidencePolarity.NEUTRAL);
    assert.equal(describeEvent(TrustEventType.TYPING_BURST).polarity, EvidencePolarity.SUPPORTIVE);
  });

  it('treats consulting documentation as ordinary behaviour', () => {
    assert.equal(
      describeEvent(TrustEventType.EXTERNAL_RESOURCE_ACCESSED).polarity,
      EvidencePolarity.NEUTRAL,
    );
  });

  it('counts modifying and testing AI output as supportive evidence', () => {
    assert.equal(
      describeEvent(TrustEventType.AI_SUGGESTION_MODIFIED).polarity,
      EvidencePolarity.SUPPORTIVE,
    );
    assert.equal(
      describeEvent(TrustEventType.AI_SUGGESTION_TESTED).polarity,
      EvidencePolarity.SUPPORTIVE,
    );
  });

  it('keeps the risk-contributing set small and deliberate', () => {
    const riskEvents = ALL_EVENT_TYPES.filter(canContributeToRisk);
    assert.deepEqual(
      [...riskEvents].sort(),
      [
        TrustEventType.DEVICE_CONTEXT_CHANGED,
        TrustEventType.EXTERNAL_ORIGIN_IMPORT,
        TrustEventType.LARGE_INSERTION,
        TrustEventType.RUNTIME_INTEGRITY_VIOLATION,
      ].sort(),
      'adding a risk-contributing event is a policy decision and must be explicit',
    );
  });

  it('requires explicit consent for external monitoring and recording', () => {
    for (const definition of eventsForLayer(TrustLayer.EXTERNAL)) {
      assert.equal(definition.requiresConsent, 'external_monitoring');
    }
    for (const definition of eventsForLayer(TrustLayer.INTERVIEW)) {
      assert.equal(definition.requiresConsent, 'recording');
    }
  });

  it('marks interview answers and recordings as personal data', () => {
    assert.equal(
      describeEvent(TrustEventType.INTERVIEW_ANSWER_RECEIVED).sensitivity,
      Sensitivity.PERSONAL,
    );
    assert.equal(
      describeEvent(TrustEventType.INTERVIEW_RECORDING_STORED).sensitivity,
      Sensitivity.PERSONAL,
    );
  });

  it('routes feed problems to confidence rather than to risk', () => {
    for (const definition of eventsForLayer(TrustLayer.SYSTEM)) {
      assert.equal(
        definition.polarity,
        EvidencePolarity.CONFIDENCE_AFFECTING,
        'losing telemetry says nothing about the developer',
      );
    }
  });
});

describe('layer definitions', () => {
  it('orders layers by ordinal', () => {
    const ordinals = ORDERED_LAYERS.map((layer) => LAYER_DEFINITIONS[layer].ordinal);
    assert.deepEqual(ordinals, [...ordinals].sort((a, b) => a - b));
  });

  it('gives every layer a distinct ordinal', () => {
    const ordinals = Object.values(LAYER_DEFINITIONS).map((definition) => definition.ordinal);
    assert.equal(new Set(ordinals).size, ordinals.length);
  });

  it('requires corroboration for every layer that can produce adverse findings', () => {
    const adverseLayers = new Set(
      Object.values(EVENT_REGISTRY)
        .filter((definition) => definition.polarity === EvidencePolarity.RISK_CONTRIBUTING)
        .map((definition) => definition.layer),
    );

    for (const layer of adverseLayers) {
      assert.ok(
        LAYER_DEFINITIONS[layer].corroboratedBy.length > 0,
        `${layer} can raise risk and must name corroborating layers`,
      );
    }
  });

  it('never names a layer as its own corroborator', () => {
    for (const definition of Object.values(LAYER_DEFINITIONS)) {
      assert.ok(
        !definition.corroboratedBy.includes(definition.layer),
        `${definition.layer} cannot corroborate itself`,
      );
    }
  });
});
