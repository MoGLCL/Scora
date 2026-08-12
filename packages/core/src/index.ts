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

export * from './primitives/index.ts';

export {
  LAYER_DEFINITIONS,
  ORDERED_LAYERS,
  TrustLayer,
  type TrustLayerDefinition,
} from './events/layers.ts';

export {
  ALL_EVENT_TYPES,
  AiAssistanceEventType,
  CodeEvolutionEventType,
  EnvironmentEventType,
  ExternalEventType,
  HumanReviewEventType,
  InteractionEventType,
  InterviewEventType,
  RuntimeEventType,
  SkillEventType,
  SystemEventType,
  TrustEventType,
  TypingEventType,
  isTrustEventType,
} from './events/types.ts';

export {
  EVENT_REGISTRY,
  EvidencePolarity,
  Sensitivity,
  canContributeToRisk,
  describeEvent,
  eventsForLayer,
  eventsRequiringConsent,
  type EventDefinition,
} from './events/registry.ts';

export {
  EVENT_SCHEMA_VERSION,
  EventSource,
  UNTRUSTED_SOURCES,
  isTrustEvent,
  isUntrustedSource,
  type EventIntegrity,
  type EventSubmission,
  type TrustEvent,
} from './events/envelope.ts';

export {
  CanonicalizationError,
  assertCanonicalizable,
  canonicalize,
  type CanonicalValue,
} from './evidence/canonical.ts';

export {
  ChainViolationCode,
  GENESIS_HASH,
  anchorBody,
  computeEventHash,
  isGenesis,
  nextChainPosition,
  sealEvent,
  verifyChain,
  verifyEventHash,
  type ChainAnchor,
  type ChainVerification,
  type ChainViolation,
  type HashFn,
} from './evidence/chain.ts';

export {
  formatIssues,
  v,
  validate,
  type FieldIssue,
  type Validated,
  type Validator,
} from './validation/schema.ts';

export {
  PAYLOAD_SCHEMAS,
  eventTypesMissingSchemas,
  payloadSchemaFor,
} from './validation/payloads.ts';

export {
  RejectionCode,
  validateSubmission,
  type EventRejection,
  type ValidatedSubmission,
} from './validation/submission.ts';

export type {
  AppendResult,
  ChainHead,
  Clock,
  ConsentPort,
  CoreDependencies,
  CryptoPort,
  EventPage,
  EventQuery,
  EventStore,
  EvidenceLifecycle,
  IdGenerator,
  Logger,
  SessionSummary,
} from './ports/index.ts';
