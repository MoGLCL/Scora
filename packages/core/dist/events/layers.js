/**
 * The ten Trust Engine layers, plus an internal layer for the engine's own
 * observations about its telemetry feed.
 *
 * Layers are evidence domains, not a pipeline. Each one produces independent
 * observations; the scoring stage is what combines them. Keeping them separate
 * is what makes "never decide from a single signal" enforceable rather than a
 * good intention.
 */
export const TrustLayer = {
    /** Not a spec layer. The engine's observations about its own feed. */
    SYSTEM: 'L00_SYSTEM',
    ENVIRONMENT: 'L01_ENVIRONMENT_INTEGRITY',
    INTERACTION: 'L02_INTERACTION_BEHAVIOR',
    TYPING: 'L03_TYPING_EDITING',
    CODE_EVOLUTION: 'L04_CODE_EVOLUTION',
    RUNTIME: 'L05_RUNTIME_DEBUGGING',
    EXTERNAL: 'L06_EXTERNAL_ACTIVITY',
    AI_ASSISTANCE: 'L07_AI_ASSISTANCE',
    SKILL: 'L08_SKILL_UNDERSTANDING',
    INTERVIEW: 'L09_AI_INTERVIEW',
    HUMAN_REVIEW: 'L10_HUMAN_REVIEW',
};
export const LAYER_DEFINITIONS = {
    [TrustLayer.SYSTEM]: {
        layer: TrustLayer.SYSTEM,
        ordinal: 0,
        name: 'System & Feed Integrity',
        purpose: 'Observations the engine makes about the telemetry feed itself: rejected events, sequence gaps, clock anomalies. Degrades Confidence rather than Trust.',
        outputs: ['Feed Integrity', 'Evidence Completeness'],
        corroboratedBy: [],
        benignByDefault: false,
    },
    [TrustLayer.ENVIRONMENT]: {
        layer: TrustLayer.ENVIRONMENT,
        ordinal: 1,
        name: 'Environment Integrity',
        purpose: 'Integrity and reliability of the assessment environment: session lifecycle, sandbox connectivity, focus and visibility, interruptions, runtime integrity.',
        outputs: ['Environment Integrity', 'Environment Risk', 'Evidence Confidence'],
        corroboratedBy: [TrustLayer.SYSTEM],
        benignByDefault: false,
    },
    [TrustLayer.INTERACTION]: {
        layer: TrustLayer.INTERACTION,
        ordinal: 2,
        name: 'Interaction Behavior',
        purpose: 'How the developer moves through the sandbox: files, navigation, search, terminal, panels, test runs. Behavioural evidence only.',
        outputs: ['Interaction Profile', 'Engagement Depth'],
        corroboratedBy: [TrustLayer.TYPING, TrustLayer.CODE_EVOLUTION],
        benignByDefault: true,
    },
    [TrustLayer.TYPING]: {
        layer: TrustLayer.TYPING,
        ordinal: 3,
        name: 'Typing & Editing Behavior',
        purpose: 'How code is written and revised: rhythm, bursts, pauses, corrections, pastes, rewrites. Interpreted against the developer own baseline, never against a fixed threshold.',
        outputs: ['Authorship Continuity', 'Editing Profile', 'Baseline Deviation'],
        corroboratedBy: [TrustLayer.CODE_EVOLUTION, TrustLayer.AI_ASSISTANCE, TrustLayer.INTERVIEW],
        benignByDefault: true,
    },
    [TrustLayer.CODE_EVOLUTION]: {
        layer: TrustLayer.CODE_EVOLUTION,
        ordinal: 4,
        name: 'Code Evolution',
        purpose: 'The whole trajectory of the code rather than the final submission: snapshots, diffs, refactors, growth curve, and when the significant changes happened.',
        outputs: ['Evolution Timeline', 'Development Continuity', 'Insertion Profile'],
        corroboratedBy: [TrustLayer.TYPING, TrustLayer.RUNTIME, TrustLayer.INTERVIEW],
        benignByDefault: true,
    },
    [TrustLayer.RUNTIME]: {
        layer: TrustLayer.RUNTIME,
        ordinal: 5,
        name: 'Runtime & Debugging Behavior',
        purpose: 'How the developer engages with running code: executions, tests, errors, debugging cycles, fix attempts, recovery time, regressions.',
        outputs: ['Debugging Competence', 'Recovery Profile', 'Problem Solving Evidence'],
        corroboratedBy: [TrustLayer.CODE_EVOLUTION],
        benignByDefault: true,
    },
    [TrustLayer.EXTERNAL]: {
        layer: TrustLayer.EXTERNAL,
        ordinal: 6,
        name: 'External Activity',
        purpose: 'Use of resources outside the sandbox, where monitoring is lawful and disclosed. Documentation and search are normal professional behaviour; what matters is whether the developer adapted and understood what they found.',
        outputs: ['Resource Usage Profile', 'Adaptation Evidence'],
        corroboratedBy: [TrustLayer.CODE_EVOLUTION, TrustLayer.TYPING, TrustLayer.INTERVIEW],
        benignByDefault: true,
    },
    [TrustLayer.AI_ASSISTANCE]: {
        layer: TrustLayer.AI_ASSISTANCE,
        ordinal: 7,
        name: 'AI Assistance & Dependency',
        purpose: 'Controlled editor-level assistance: code completion and inline suggestions, as in a professional editor with IntelliSense. The sandbox provides no conversational assistant, so this layer measures whether the developer uses ordinary tooling effectively or leans on generated output without understanding it. Usage alone is never adverse.',
        outputs: [
            'AI Assistance Level',
            'AI Dependency Level',
            'AI Adaptation Level',
            'AI Verification Level',
        ],
        corroboratedBy: [TrustLayer.CODE_EVOLUTION, TrustLayer.RUNTIME, TrustLayer.INTERVIEW],
        benignByDefault: true,
    },
    [TrustLayer.SKILL]: {
        layer: TrustLayer.SKILL,
        ordinal: 8,
        name: 'Skill & Technical Understanding',
        purpose: 'Reconciles claimed skills against assessment performance, observed behaviour, code evidence, runtime evidence and understanding evidence.',
        outputs: ['Skill Confidence', 'Supporting Evidence', 'Contradicting Evidence', 'Verification Status'],
        corroboratedBy: [TrustLayer.CODE_EVOLUTION, TrustLayer.RUNTIME, TrustLayer.INTERVIEW],
        benignByDefault: false,
    },
    [TrustLayer.INTERVIEW]: {
        layer: TrustLayer.INTERVIEW,
        ordinal: 9,
        name: 'AI Interview & Explanation',
        purpose: 'Adaptive technical interview generated from the developer actual session. The strongest available test of ownership and understanding.',
        outputs: ['Interview Score', 'Explanation Quality', 'Understanding Confidence'],
        corroboratedBy: [TrustLayer.CODE_EVOLUTION, TrustLayer.SKILL],
        benignByDefault: false,
    },
    [TrustLayer.HUMAN_REVIEW]: {
        layer: TrustLayer.HUMAN_REVIEW,
        ordinal: 10,
        name: 'Human Review & Validation',
        purpose: 'Human adjudication over the full evidence package. Authoritative: a reviewer decision overrides the engine recommendation and is recorded immutably.',
        outputs: ['Review Decision', 'Override Record', 'Audit Trail'],
        corroboratedBy: [],
        benignByDefault: false,
    },
};
export const ORDERED_LAYERS = Object.values(LAYER_DEFINITIONS)
    .slice()
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((definition) => definition.layer);
//# sourceMappingURL=layers.js.map