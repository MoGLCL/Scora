import { TrustLayer } from './layers.ts';
import {
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
} from './types.ts';

/**
 * How sensitive an event's payload is, which drives retention, encryption and
 * who may see it in the reviewer dashboard.
 *
 * Data minimisation is a design requirement, not a policy document: the class
 * is attached to the event type here so storage and access control can enforce
 * it mechanically rather than relying on each producer to remember.
 */
export const Sensitivity = {
  /** Counters and timings. No content, no identifying detail. */
  METRIC: 'METRIC',
  /** Structural detail: file paths, resource categories, error classes. */
  STRUCTURAL: 'STRUCTURAL',
  /** Developer-authored or developer-directed content: code, queries, answers. */
  CONTENT: 'CONTENT',
  /** Personal data or recordings. Strictest handling; explicit consent required. */
  PERSONAL: 'PERSONAL',
} as const;

export type Sensitivity = (typeof Sensitivity)[keyof typeof Sensitivity];

/**
 * How an event may influence scoring.
 *
 * This encodes the platform's central rule in the type system. An event marked
 * NEUTRAL cannot raise Risk under any circumstances — the scoring stage is not
 * permitted to read it as adverse, no matter how it correlates. Documentation
 * lookups, AI usage and fast typing all live here deliberately.
 */
export const EvidencePolarity = {
  /** Can support Trust. Never raises Risk. */
  SUPPORTIVE: 'SUPPORTIVE',
  /** Context only. Never moves Trust or Risk on its own in either direction. */
  NEUTRAL: 'NEUTRAL',
  /** May contribute to Risk, but only as part of a corroborated cluster. */
  RISK_CONTRIBUTING: 'RISK_CONTRIBUTING',
  /** Affects Confidence only: how much the evidence base can be relied on. */
  CONFIDENCE_AFFECTING: 'CONFIDENCE_AFFECTING',
} as const;

export type EvidencePolarity = (typeof EvidencePolarity)[keyof typeof EvidencePolarity];

export interface EventDefinition {
  readonly type: TrustEventType;
  readonly layer: TrustLayer;
  readonly sensitivity: Sensitivity;
  readonly polarity: EvidencePolarity;
  /**
   * Whether this event may ever appear alone in an explanation as grounds for
   * a negative outcome. Always false for RISK_CONTRIBUTING events — that is the
   * mechanism preventing "one paste = cheating".
   */
  readonly sufficientAlone: boolean;
  /** Expected volume, used for sampling and storage planning. */
  readonly cardinality: 'low' | 'medium' | 'high';
  /** Consent scope that must be granted for this event to be collected at all. */
  readonly requiresConsent: 'none' | 'assessment' | 'external_monitoring' | 'recording';
  readonly description: string;
}

type DefinitionSeed = Omit<EventDefinition, 'type' | 'sufficientAlone'> &
  Partial<Pick<EventDefinition, 'sufficientAlone'>>;

function define(
  entries: Readonly<Record<string, DefinitionSeed>>,
): Record<string, EventDefinition> {
  const out: Record<string, EventDefinition> = {};
  for (const [type, seed] of Object.entries(entries)) {
    out[type] = {
      ...seed,
      type: type as TrustEventType,
      // Enforced invariant: nothing that can raise Risk is ever sufficient by
      // itself. Producers cannot opt out of this.
      sufficientAlone:
        seed.polarity === EvidencePolarity.RISK_CONTRIBUTING
          ? false
          : (seed.sufficientAlone ?? false),
    };
  }
  return out;
}

const SYSTEM_DEFINITIONS = define({
  [SystemEventType.EVENT_REJECTED]: {
    layer: TrustLayer.SYSTEM,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.CONFIDENCE_AFFECTING,
    cardinality: 'low',
    requiresConsent: 'none',
    description: 'An inbound event failed validation and was not admitted to the evidence log.',
  },
  [SystemEventType.EVENT_SEQUENCE_GAP]: {
    layer: TrustLayer.SYSTEM,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.CONFIDENCE_AFFECTING,
    cardinality: 'low',
    requiresConsent: 'none',
    description: 'A gap in the per-session sequence numbers indicates telemetry was lost in transit.',
  },
  [SystemEventType.EVENT_DUPLICATE_DROPPED]: {
    layer: TrustLayer.SYSTEM,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.CONFIDENCE_AFFECTING,
    cardinality: 'low',
    requiresConsent: 'none',
    description: 'A replayed event id was dropped by the idempotent ingestion path.',
  },
  [SystemEventType.INGESTION_ANOMALY]: {
    layer: TrustLayer.SYSTEM,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.CONFIDENCE_AFFECTING,
    cardinality: 'low',
    requiresConsent: 'none',
    description: 'Ingestion observed a malformed batch, implausible timing or unexpected producer.',
  },
  [SystemEventType.CLOCK_SYNC_SAMPLE]: {
    layer: TrustLayer.SYSTEM,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.CONFIDENCE_AFFECTING,
    cardinality: 'medium',
    requiresConsent: 'none',
    description: 'A client/server clock offset measurement used to rebase client timestamps.',
  },
  [SystemEventType.CHAIN_BREAK_DETECTED]: {
    layer: TrustLayer.SYSTEM,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.CONFIDENCE_AFFECTING,
    cardinality: 'low',
    requiresConsent: 'none',
    description: 'Hash-chain verification failed, meaning the stored evidence log may be incomplete or altered.',
  },
});

const ENVIRONMENT_DEFINITIONS = define({
  [EnvironmentEventType.SESSION_STARTED]: {
    layer: TrustLayer.ENVIRONMENT,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'An assessment session began.',
  },
  [EnvironmentEventType.SESSION_RESUMED]: {
    layer: TrustLayer.ENVIRONMENT,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'A paused or disconnected session resumed.',
  },
  [EnvironmentEventType.SESSION_PAUSED]: {
    layer: TrustLayer.ENVIRONMENT,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'The session was paused, by the developer or by the platform.',
  },
  [EnvironmentEventType.SESSION_ENDED]: {
    layer: TrustLayer.ENVIRONMENT,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'The session ended, whether by submission, timeout or abandonment.',
  },
  [EnvironmentEventType.SESSION_HEARTBEAT]: {
    layer: TrustLayer.ENVIRONMENT,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.CONFIDENCE_AFFECTING,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description: 'Periodic liveness signal establishing that telemetry coverage was continuous.',
  },
  [EnvironmentEventType.SANDBOX_CONNECTED]: {
    layer: TrustLayer.ENVIRONMENT,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'The sandbox runtime established its transport connection.',
  },
  [EnvironmentEventType.SANDBOX_DISCONNECTED]: {
    layer: TrustLayer.ENVIRONMENT,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.CONFIDENCE_AFFECTING,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'The sandbox lost its transport connection, creating a potential evidence gap.',
  },
  [EnvironmentEventType.SANDBOX_RECONNECTED]: {
    layer: TrustLayer.ENVIRONMENT,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'The sandbox transport recovered after a disconnection.',
  },
  [EnvironmentEventType.WINDOW_FOCUS_GAINED]: {
    layer: TrustLayer.ENVIRONMENT,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description: 'The assessment window regained focus.',
  },
  [EnvironmentEventType.WINDOW_FOCUS_LOST]: {
    layer: TrustLayer.ENVIRONMENT,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description:
      'The assessment window lost focus. Ordinary during any real work session; never adverse on its own.',
  },
  [EnvironmentEventType.TAB_VISIBLE]: {
    layer: TrustLayer.ENVIRONMENT,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description: 'The assessment tab became visible.',
  },
  [EnvironmentEventType.TAB_HIDDEN]: {
    layer: TrustLayer.ENVIRONMENT,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description: 'The assessment tab was hidden.',
  },
  [EnvironmentEventType.ENVIRONMENT_INTERRUPTION]: {
    layer: TrustLayer.ENVIRONMENT,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.CONFIDENCE_AFFECTING,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'The environment was interrupted: crash, reload, forced navigation or power event.',
  },
  [EnvironmentEventType.NETWORK_QUALITY_CHANGED]: {
    layer: TrustLayer.ENVIRONMENT,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.CONFIDENCE_AFFECTING,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description: 'Measured network conditions changed enough to affect telemetry reliability.',
  },
  [EnvironmentEventType.DEVICE_CONTEXT_CHANGED]: {
    layer: TrustLayer.ENVIRONMENT,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.RISK_CONTRIBUTING,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description:
      'The reported device, browser or screen configuration changed mid-session. Corroboration required before this carries any weight.',
  },
  [EnvironmentEventType.RUNTIME_INTEGRITY_VIOLATION]: {
    layer: TrustLayer.ENVIRONMENT,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.RISK_CONTRIBUTING,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description:
      'The sandbox runtime detected tampering with its own instrumentation, such as patched APIs or a disabled reporter.',
  },
});

const INTERACTION_DEFINITIONS = define({
  [InteractionEventType.FILE_OPENED]: {
    layer: TrustLayer.INTERACTION,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description: 'A file was opened in the editor.',
  },
  [InteractionEventType.FILE_CLOSED]: {
    layer: TrustLayer.INTERACTION,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description: 'A file was closed.',
  },
  [InteractionEventType.FILE_CREATED]: {
    layer: TrustLayer.INTERACTION,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description: 'A file was created, evidencing deliberate structuring of the solution.',
  },
  [InteractionEventType.FILE_DELETED]: {
    layer: TrustLayer.INTERACTION,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description: 'A file was deleted.',
  },
  [InteractionEventType.FILE_RENAMED]: {
    layer: TrustLayer.INTERACTION,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'A file was renamed or moved.',
  },
  [InteractionEventType.CURSOR_ACTIVITY_SAMPLE]: {
    layer: TrustLayer.INTERACTION,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description: 'Aggregated cursor movement over a sampling window. Never raw keystroke positions.',
  },
  [InteractionEventType.TEXT_SELECTED]: {
    layer: TrustLayer.INTERACTION,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description: 'Text was selected, often indicating reading or targeted revision.',
  },
  [InteractionEventType.EDITOR_SCROLLED]: {
    layer: TrustLayer.INTERACTION,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description: 'The editor viewport was scrolled.',
  },
  [InteractionEventType.SEARCH_PERFORMED]: {
    layer: TrustLayer.INTERACTION,
    sensitivity: Sensitivity.CONTENT,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description: 'An in-workspace search was run, evidencing navigation of the codebase.',
  },
  [InteractionEventType.NAVIGATION_JUMP]: {
    layer: TrustLayer.INTERACTION,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description: 'A go-to-definition or symbol jump, evidencing structural understanding of the code.',
  },
  [InteractionEventType.PANEL_SWITCHED]: {
    layer: TrustLayer.INTERACTION,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description: 'The developer switched between editor, terminal, tests or preview panels.',
  },
  [InteractionEventType.TERMINAL_OPENED]: {
    layer: TrustLayer.INTERACTION,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'A terminal panel was opened.',
  },
  [InteractionEventType.TERMINAL_COMMAND_ENTERED]: {
    layer: TrustLayer.INTERACTION,
    sensitivity: Sensitivity.CONTENT,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description: 'A command was executed in the sandbox terminal.',
  },
  [InteractionEventType.IDLE_PERIOD_DETECTED]: {
    layer: TrustLayer.INTERACTION,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description:
      'No interaction for an extended period. Thinking, reading and breaks are all ordinary; never adverse on its own.',
  },
});

const TYPING_DEFINITIONS = define({
  [TypingEventType.TYPING_BURST]: {
    layer: TrustLayer.TYPING,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description:
      'A continuous run of typing, summarised as counts and timings. Keystroke content is never captured.',
  },
  [TypingEventType.TYPING_PAUSE]: {
    layer: TrustLayer.TYPING,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description: 'A pause between typing bursts.',
  },
  [TypingEventType.TEXT_INSERTED]: {
    layer: TrustLayer.TYPING,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description: 'Text was inserted through ordinary typing.',
  },
  [TypingEventType.TEXT_DELETED]: {
    layer: TrustLayer.TYPING,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description: 'Text was deleted.',
  },
  [TypingEventType.BACKSPACE_BURST]: {
    layer: TrustLayer.TYPING,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description:
      'A run of corrections. Self-correction is evidence of authorship, not of weakness.',
  },
  [TypingEventType.CODE_PASTE]: {
    layer: TrustLayer.TYPING,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description:
      'Content was pasted into the editor. Pasting is normal developer behaviour; only the surrounding cluster gives it meaning.',
  },
  [TypingEventType.LARGE_INSERTION]: {
    layer: TrustLayer.TYPING,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.RISK_CONTRIBUTING,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description:
      'A single insertion far above the developer own baseline. Meaningful only when corroborated by unmodified AI output, absent testing and a failed explanation.',
  },
  [TypingEventType.UNDO_PERFORMED]: {
    layer: TrustLayer.TYPING,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description: 'An undo was performed.',
  },
  [TypingEventType.REDO_PERFORMED]: {
    layer: TrustLayer.TYPING,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'A redo was performed.',
  },
  [TypingEventType.REWRITE_DETECTED]: {
    layer: TrustLayer.TYPING,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description:
      'An existing region was substantially rewritten, evidencing engagement with code already present.',
  },
});

const CODE_EVOLUTION_DEFINITIONS = define({
  [CodeEvolutionEventType.CODE_SNAPSHOT]: {
    layer: TrustLayer.CODE_EVOLUTION,
    sensitivity: Sensitivity.CONTENT,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description: 'A point-in-time capture of the workspace, anchoring the evolution timeline.',
  },
  [CodeEvolutionEventType.CODE_DIFF_APPLIED]: {
    layer: TrustLayer.CODE_EVOLUTION,
    sensitivity: Sensitivity.CONTENT,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description: 'A structured diff between consecutive states of a file.',
  },
  [CodeEvolutionEventType.FILE_SAVED]: {
    layer: TrustLayer.CODE_EVOLUTION,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description: 'A file was written to the sandbox filesystem.',
  },
  [CodeEvolutionEventType.REFACTOR_DETECTED]: {
    layer: TrustLayer.CODE_EVOLUTION,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description:
      'A structure-preserving transformation such as extraction or renaming, which requires understanding of the code being changed.',
  },
  [CodeEvolutionEventType.DEPENDENCY_ADDED]: {
    layer: TrustLayer.CODE_EVOLUTION,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'A dependency was added to the project.',
  },
  [CodeEvolutionEventType.DEPENDENCY_REMOVED]: {
    layer: TrustLayer.CODE_EVOLUTION,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'A dependency was removed from the project.',
  },
});

const RUNTIME_DEFINITIONS = define({
  [RuntimeEventType.CODE_EXECUTION_STARTED]: {
    layer: TrustLayer.RUNTIME,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description: 'The developer ran the code.',
  },
  [RuntimeEventType.CODE_EXECUTION_FINISHED]: {
    layer: TrustLayer.RUNTIME,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description: 'An execution completed, with its exit status.',
  },
  [RuntimeEventType.BUILD_STARTED]: {
    layer: TrustLayer.RUNTIME,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description: 'A build or compilation began.',
  },
  [RuntimeEventType.BUILD_FINISHED]: {
    layer: TrustLayer.RUNTIME,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description: 'A build finished, with its result.',
  },
  [RuntimeEventType.TEST_RUN_STARTED]: {
    layer: TrustLayer.RUNTIME,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description: 'A test run began. Verifying one own work is strong positive evidence.',
  },
  [RuntimeEventType.TEST_RUN_FINISHED]: {
    layer: TrustLayer.RUNTIME,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description: 'A test run finished, with pass and fail counts.',
  },
  [RuntimeEventType.RUNTIME_ERROR_OBSERVED]: {
    layer: TrustLayer.RUNTIME,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description: 'An error surfaced at runtime. Encountering errors is normal; what follows is what matters.',
  },
  [RuntimeEventType.DEBUG_SESSION_STARTED]: {
    layer: TrustLayer.RUNTIME,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'A debugging session was started.',
  },
  [RuntimeEventType.DEBUG_SESSION_ENDED]: {
    layer: TrustLayer.RUNTIME,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'A debugging session ended.',
  },
  [RuntimeEventType.BREAKPOINT_SET]: {
    layer: TrustLayer.RUNTIME,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description:
      'A breakpoint was placed. Where a developer chooses to break reveals their model of the code.',
  },
  [RuntimeEventType.BREAKPOINT_HIT]: {
    layer: TrustLayer.RUNTIME,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description: 'Execution paused at a breakpoint.',
  },
  [RuntimeEventType.FIX_ATTEMPTED]: {
    layer: TrustLayer.RUNTIME,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description: 'A change was made in direct response to an observed failure.',
  },
  [RuntimeEventType.ERROR_RESOLVED]: {
    layer: TrustLayer.RUNTIME,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description:
      'A previously failing condition now passes. Among the strongest available evidence of genuine problem solving.',
  },
  [RuntimeEventType.REGRESSION_DETECTED]: {
    layer: TrustLayer.RUNTIME,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'A change broke something that previously worked.',
  },
});

const EXTERNAL_DEFINITIONS = define({
  [ExternalEventType.EXTERNAL_RESOURCE_ACCESSED]: {
    layer: TrustLayer.EXTERNAL,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'medium',
    requiresConsent: 'external_monitoring',
    description:
      'An external resource was opened, recorded by category rather than full URL. Consulting documentation is ordinary professional practice.',
  },
  [ExternalEventType.EXTERNAL_RESOURCE_DWELL]: {
    layer: TrustLayer.EXTERNAL,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'medium',
    requiresConsent: 'external_monitoring',
    description: 'Time spent on an external resource before returning to the sandbox.',
  },
  [ExternalEventType.EXTERNAL_RESOURCE_LEFT]: {
    layer: TrustLayer.EXTERNAL,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'medium',
    requiresConsent: 'external_monitoring',
    description: 'The developer navigated away from an external resource.',
  },
  [ExternalEventType.EXTERNAL_ORIGIN_IMPORT]: {
    layer: TrustLayer.EXTERNAL,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.RISK_CONTRIBUTING,
    cardinality: 'low',
    requiresConsent: 'external_monitoring',
    description:
      'Code entering the workspace was correlated in time with an external resource visit. Adaptation and understanding still decide how this is read.',
  },
});

const AI_DEFINITIONS = define({
  [AiAssistanceEventType.AI_SUGGESTION_SHOWN]: {
    layer: TrustLayer.AI_ASSISTANCE,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description:
      'The editor displayed a code-completion suggestion. Editor-level assistance like IntelliSense; the developer remains in control of what enters the workspace.',
  },
  [AiAssistanceEventType.AI_SUGGESTION_ACCEPTED]: {
    layer: TrustLayer.AI_ASSISTANCE,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description:
      'A completion suggestion was accepted into the workspace. Acceptance alone is neutral; what the developer did next gives it meaning.',
  },
  [AiAssistanceEventType.AI_SUGGESTION_REJECTED]: {
    layer: TrustLayer.AI_ASSISTANCE,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description:
      'A suggestion was declined or replaced with the developer own code. Rejecting a suggestion requires understanding it.',
  },
  [AiAssistanceEventType.AI_SUGGESTION_PARTIALLY_ACCEPTED]: {
    layer: TrustLayer.AI_ASSISTANCE,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description:
      'Part of a suggestion was accepted and the rest declined. Selective adoption indicates the developer read and evaluated it.',
  },
  [AiAssistanceEventType.AI_SUGGESTION_MODIFIED]: {
    layer: TrustLayer.AI_ASSISTANCE,
    sensitivity: Sensitivity.CONTENT,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description:
      'Accepted suggestion output was subsequently changed by the developer. This is the primary signal separating assisted from dependent use.',
  },
  [AiAssistanceEventType.AI_SUGGESTION_DELETED]: {
    layer: TrustLayer.AI_ASSISTANCE,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description:
      'Accepted suggestion output was later deleted, indicating review rather than blind retention.',
  },
  [AiAssistanceEventType.AI_SUGGESTION_TESTED]: {
    layer: TrustLayer.AI_ASSISTANCE,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'medium',
    requiresConsent: 'assessment',
    description:
      'Suggestion-derived code was executed or tested. Verifying assistance instead of trusting it is evidence of effective use.',
  },
  [AiAssistanceEventType.INLINE_COMPLETION_SHOWN]: {
    layer: TrustLayer.AI_ASSISTANCE,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description: 'Ghost-text inline completion was displayed while the developer was typing.',
  },
  [AiAssistanceEventType.INLINE_COMPLETION_ACCEPTED]: {
    layer: TrustLayer.AI_ASSISTANCE,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description: 'An inline completion was accepted, typically by pressing Tab.',
  },
  [AiAssistanceEventType.INLINE_COMPLETION_REJECTED]: {
    layer: TrustLayer.AI_ASSISTANCE,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.SUPPORTIVE,
    cardinality: 'high',
    requiresConsent: 'assessment',
    description:
      'An inline completion was declined by continuing to type. The developer preferred their own code.',
  },
});

const SKILL_DEFINITIONS = define({
  [SkillEventType.SKILL_CLAIMED]: {
    layer: TrustLayer.SKILL,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'The developer claimed a skill, establishing what the engine must verify.',
  },
  [SkillEventType.ASSESSMENT_STARTED]: {
    layer: TrustLayer.SKILL,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'An assessment began.',
  },
  [SkillEventType.TASK_STARTED]: {
    layer: TrustLayer.SKILL,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'A task within the assessment began.',
  },
  [SkillEventType.TASK_SUBMITTED]: {
    layer: TrustLayer.SKILL,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'A task was submitted.',
  },
  [SkillEventType.ASSESSMENT_SUBMITTED]: {
    layer: TrustLayer.SKILL,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'The assessment was submitted in full.',
  },
  [SkillEventType.VERIFICATION_CHALLENGE_ISSUED]: {
    layer: TrustLayer.SKILL,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description: 'A targeted challenge was issued to test a specific claimed skill.',
  },
  [SkillEventType.VERIFICATION_CHALLENGE_RESULT]: {
    layer: TrustLayer.SKILL,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.SUPPORTIVE,
    sufficientAlone: true,
    cardinality: 'low',
    requiresConsent: 'assessment',
    description:
      'The outcome of a verification challenge. Direct, designed evidence of capability, so it may stand on its own when positive.',
  },
});

const INTERVIEW_DEFINITIONS = define({
  [InterviewEventType.INTERVIEW_STARTED]: {
    layer: TrustLayer.INTERVIEW,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'recording',
    description: 'The AI interview began.',
  },
  [InterviewEventType.INTERVIEW_QUESTION_ASKED]: {
    layer: TrustLayer.INTERVIEW,
    sensitivity: Sensitivity.CONTENT,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'medium',
    requiresConsent: 'recording',
    description: 'A question generated from the developer own session was put to them.',
  },
  [InterviewEventType.INTERVIEW_ANSWER_RECEIVED]: {
    layer: TrustLayer.INTERVIEW,
    sensitivity: Sensitivity.PERSONAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'medium',
    requiresConsent: 'recording',
    description: 'The developer answer, as transcript and recording reference.',
  },
  [InterviewEventType.INTERVIEW_ANSWER_SCORED]: {
    layer: TrustLayer.INTERVIEW,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.SUPPORTIVE,
    sufficientAlone: true,
    cardinality: 'medium',
    requiresConsent: 'recording',
    description:
      'An answer was assessed for understanding. Explaining one own work is the most direct evidence of ownership.',
  },
  [InterviewEventType.INTERVIEW_DIFFICULTY_ADJUSTED]: {
    layer: TrustLayer.INTERVIEW,
    sensitivity: Sensitivity.METRIC,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'medium',
    requiresConsent: 'recording',
    description: 'The examiner raised or lowered difficulty in response to demonstrated understanding.',
  },
  [InterviewEventType.INTERVIEW_ENDED]: {
    layer: TrustLayer.INTERVIEW,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'recording',
    description: 'The interview concluded.',
  },
  [InterviewEventType.INTERVIEW_RECORDING_STORED]: {
    layer: TrustLayer.INTERVIEW,
    sensitivity: Sensitivity.PERSONAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'recording',
    description: 'A recording was written to secure storage and made available for human review.',
  },
});

const HUMAN_REVIEW_DEFINITIONS = define({
  [HumanReviewEventType.REVIEW_ASSIGNED]: {
    layer: TrustLayer.HUMAN_REVIEW,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'none',
    description: 'A reviewer was assigned to the evidence package.',
  },
  [HumanReviewEventType.REVIEW_OPENED]: {
    layer: TrustLayer.HUMAN_REVIEW,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'none',
    description: 'A reviewer opened the package.',
  },
  [HumanReviewEventType.REVIEW_EVIDENCE_ACCESSED]: {
    layer: TrustLayer.HUMAN_REVIEW,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'medium',
    requiresConsent: 'none',
    description:
      'A reviewer accessed a specific piece of evidence. Access to a developer data is itself logged.',
  },
  [HumanReviewEventType.REVIEW_DECISION_RECORDED]: {
    layer: TrustLayer.HUMAN_REVIEW,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.SUPPORTIVE,
    sufficientAlone: true,
    cardinality: 'low',
    requiresConsent: 'none',
    description:
      'A human decision of approve, reject or request review. Authoritative over the engine recommendation.',
  },
  [HumanReviewEventType.RECOMMENDATION_OVERRIDDEN]: {
    layer: TrustLayer.HUMAN_REVIEW,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.SUPPORTIVE,
    sufficientAlone: true,
    cardinality: 'low',
    requiresConsent: 'none',
    description:
      'A reviewer overrode the engine recommendation, with a recorded rationale. Also the primary training signal for calibration.',
  },
  [HumanReviewEventType.RESULT_RELEASED]: {
    layer: TrustLayer.HUMAN_REVIEW,
    sensitivity: Sensitivity.STRUCTURAL,
    polarity: EvidencePolarity.NEUTRAL,
    cardinality: 'low',
    requiresConsent: 'none',
    description: 'The result was released to the developer under the configured release policy.',
  },
});

export const EVENT_REGISTRY: Readonly<Record<TrustEventType, EventDefinition>> = {
  ...SYSTEM_DEFINITIONS,
  ...ENVIRONMENT_DEFINITIONS,
  ...INTERACTION_DEFINITIONS,
  ...TYPING_DEFINITIONS,
  ...CODE_EVOLUTION_DEFINITIONS,
  ...RUNTIME_DEFINITIONS,
  ...EXTERNAL_DEFINITIONS,
  ...AI_DEFINITIONS,
  ...SKILL_DEFINITIONS,
  ...INTERVIEW_DEFINITIONS,
  ...HUMAN_REVIEW_DEFINITIONS,
} as Readonly<Record<TrustEventType, EventDefinition>>;

export function describeEvent(type: TrustEventType): EventDefinition {
  const definition = EVENT_REGISTRY[type];
  if (definition === undefined) {
    throw new Error(`Event type is not present in the registry: ${type}`);
  }
  return definition;
}

export function eventsForLayer(layer: TrustLayer): readonly EventDefinition[] {
  return Object.values(EVENT_REGISTRY).filter((definition) => definition.layer === layer);
}

export function eventsRequiringConsent(
  scope: EventDefinition['requiresConsent'],
): readonly EventDefinition[] {
  return Object.values(EVENT_REGISTRY).filter(
    (definition) => definition.requiresConsent === scope,
  );
}

/** True when an event may contribute to Risk — always as part of a cluster, never alone. */
export function canContributeToRisk(type: TrustEventType): boolean {
  return describeEvent(type).polarity === EvidencePolarity.RISK_CONTRIBUTING;
}
