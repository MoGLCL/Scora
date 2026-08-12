/**
 * The ten Trust Engine layers, plus an internal layer for the engine's own
 * observations about its telemetry feed.
 *
 * Layers are evidence domains, not a pipeline. Each one produces independent
 * observations; the scoring stage is what combines them. Keeping them separate
 * is what makes "never decide from a single signal" enforceable rather than a
 * good intention.
 */
export declare const TrustLayer: {
    /** Not a spec layer. The engine's observations about its own feed. */
    readonly SYSTEM: "L00_SYSTEM";
    readonly ENVIRONMENT: "L01_ENVIRONMENT_INTEGRITY";
    readonly INTERACTION: "L02_INTERACTION_BEHAVIOR";
    readonly TYPING: "L03_TYPING_EDITING";
    readonly CODE_EVOLUTION: "L04_CODE_EVOLUTION";
    readonly RUNTIME: "L05_RUNTIME_DEBUGGING";
    readonly EXTERNAL: "L06_EXTERNAL_ACTIVITY";
    readonly AI_ASSISTANCE: "L07_AI_ASSISTANCE";
    readonly SKILL: "L08_SKILL_UNDERSTANDING";
    readonly INTERVIEW: "L09_AI_INTERVIEW";
    readonly HUMAN_REVIEW: "L10_HUMAN_REVIEW";
};
export type TrustLayer = (typeof TrustLayer)[keyof typeof TrustLayer];
export interface TrustLayerDefinition {
    readonly layer: TrustLayer;
    readonly ordinal: number;
    readonly name: string;
    readonly purpose: string;
    /** What this layer contributes to the final report. */
    readonly outputs: readonly string[];
    /**
     * Layers that must independently agree before this layer's risk signals are
     * allowed to move the Risk score materially.
     *
     * This is the structural expression of the core rule: a large paste is not
     * evidence of anything on its own, but a large paste plus unmodified AI
     * output plus a failed explanation is. A layer with an empty list here can
     * never escalate risk by itself.
     */
    readonly corroboratedBy: readonly TrustLayer[];
    /**
     * True when observations in this layer are commonly produced by entirely
     * legitimate developer behaviour and must never be read as adverse on their
     * own. Documentation lookups and AI assistance both live here.
     */
    readonly benignByDefault: boolean;
}
export declare const LAYER_DEFINITIONS: Readonly<Record<TrustLayer, TrustLayerDefinition>>;
export declare const ORDERED_LAYERS: readonly TrustLayer[];
//# sourceMappingURL=layers.d.ts.map