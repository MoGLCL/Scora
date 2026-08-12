/**
 * SCORA Trust Engine — domain core.
 *
 * Contains the event taxonomy, the immutable evidence envelope, validation and
 * the ports through which everything else is reached. No I/O, no framework, no
 * runtime dependencies, so it can be embedded in any service that needs to
 * speak the same evidence language.
 *
 * Node-specific adapters live at `@scora/trust-core/node`.
 */
export * from "./primitives/index.js";
export { LAYER_DEFINITIONS, ORDERED_LAYERS, TrustLayer, } from "./events/layers.js";
export { ALL_EVENT_TYPES, AiAssistanceEventType, CodeEvolutionEventType, EnvironmentEventType, ExternalEventType, HumanReviewEventType, InteractionEventType, InterviewEventType, RuntimeEventType, SkillEventType, SystemEventType, TrustEventType, TypingEventType, isTrustEventType, } from "./events/types.js";
export { EVENT_REGISTRY, EvidencePolarity, Sensitivity, canContributeToRisk, describeEvent, eventsForLayer, eventsRequiringConsent, } from "./events/registry.js";
export { EVENT_SCHEMA_VERSION, EventSource, UNTRUSTED_SOURCES, isTrustEvent, isUntrustedSource, } from "./events/envelope.js";
export { CanonicalizationError, assertCanonicalizable, canonicalize, } from "./evidence/canonical.js";
export { ChainViolationCode, GENESIS_HASH, anchorBody, computeEventHash, isGenesis, nextChainPosition, sealEvent, verifyChain, verifyEventHash, } from "./evidence/chain.js";
export { formatIssues, v, validate, } from "./validation/schema.js";
export { PAYLOAD_SCHEMAS, eventTypesMissingSchemas, payloadSchemaFor, } from "./validation/payloads.js";
export { RejectionCode, validateSubmission, } from "./validation/submission.js";
//# sourceMappingURL=index.js.map