import { AssessmentId, DeveloperId, SessionId, TaskId, TenantId, EventSource, type TrustEvent, type TrustEventType } from '@scora/trust-core';
import type { ExtractionContext } from './window.ts';
/**
 * Synthetic session construction for tests and calibration.
 *
 * Every event is put through the real `validateSubmission` before being sealed,
 * so a test cannot accidentally assert on a payload shape the engine would
 * reject in production. If a scenario compiles and runs here, the sandbox can
 * actually send it.
 */
export declare const TEST_TENANT: TenantId;
export declare const TEST_SESSION: SessionId;
export declare const TEST_DEVELOPER: DeveloperId;
export declare const TEST_ASSESSMENT: AssessmentId;
export declare const TEST_TASK: TaskId;
/** 2024-01-15T10:00:00Z — a fixed origin so timings in tests are readable. */
export declare const T0 = 1705312800000;
export declare const HASH: string;
/** Deterministic 64-char hex digest for a label, so test signatures are valid hashes. */
export declare function hexHash(label: string): string;
export interface EventSpec {
    readonly type: TrustEventType;
    /** Milliseconds after T0. */
    readonly at: number;
    readonly payload: Record<string, unknown>;
    readonly source?: EventSource;
}
export declare function buildSession(specs: readonly EventSpec[]): readonly TrustEvent[];
export declare const TEST_CONTEXT: ExtractionContext;
/** Common payload builders, so scenarios stay readable. */
export declare const payloads: {
    sessionStart: () => {
        assessmentMode: "unproctored";
        consentScopes: "assessment"[];
        viewportClass: "large";
        userAgentFamily: string;
        timezoneOffsetMinutes: number;
    };
    typingBurst: (chars: number, durationMs: number, meanInterval?: number) => {
        path: string;
        durationMs: number;
        charactersTyped: number;
        keystrokeCount: number;
        intervalVarianceMs: number;
        meanIntervalMs: number;
    };
    insert: (chars: number, lines: number, atLine?: number) => {
        path: string;
        charactersAdded: number;
        linesAdded: number;
        atLine: number;
    };
    diff: (added: number, removed: number, path?: string) => {
        path: string;
        fromDigest: string;
        toDigest: string;
        linesAdded: number;
        linesRemoved: number;
        hunkCount: number;
        largestHunkLines: number;
    };
    largeInsertion: (chars: number, lines: number, method: string, path?: string) => {
        path: string;
        charactersAdded: number;
        linesAdded: number;
        language: string;
        insertionMethod: string;
        baselineMultiple: null;
        contentHash: string;
    };
    paste: (chars: number, lines: number, origin: string, path?: string) => {
        path: string;
        charactersAdded: number;
        linesAdded: number;
        language: string;
        origin: string;
        contentHash: string;
    };
    suggestionShown: (id: string, lines: number, chars: number) => {
        suggestionId: string;
        path: string;
        kind: "member_completion";
        candidateCount: number;
        charactersOffered: number;
        linesOffered: number;
        triggerKind: "member_access";
    };
    suggestionAccepted: (id: string, lines: number, chars: number, deliberationMs: number) => {
        suggestionId: string;
        path: string;
        charactersAccepted: number;
        linesAccepted: number;
        candidateIndex: number;
        deliberationMs: number;
    };
    suggestionModified: (id: string, ratio: number) => {
        suggestionId: string;
        path: string;
        charactersChanged: number;
        linesChanged: number;
        modificationRatio: number;
        msAfterAcceptance: number;
    };
    suggestionTested: (id: string) => {
        suggestionId: string;
        verificationKind: "test_run";
        msAfterAcceptance: number;
        outcome: "success";
    };
    error: (signature: string, isRepeat?: boolean) => {
        errorId: string;
        errorClass: string;
        path: string;
        line: number;
        signatureHash: string;
        isRepeat: boolean;
    };
    errorResolved: (signature: string, attempts: number, timeMs: number) => {
        errorSignatureHash: string;
        attemptsRequired: number;
        timeToResolveMs: number;
        verifiedBy: "test_pass";
    };
    testFinished: (runId: string, passed: number, failed: number) => {
        runId: string;
        outcome: "success" | "failure";
        durationMs: number;
        passed: number;
        failed: number;
        skipped: number;
    };
    externalVisit: (visitId: string, category: string) => {
        category: string;
        domain: null;
        visitId: string;
    };
    externalImport: (visitId: string, category: string, chars: number, adaptation: number | null) => {
        visitId: string;
        category: string;
        path: string;
        charactersAdded: number;
        msSinceResourceLeft: number;
        adaptationRatio: number | null;
    };
};
//# sourceMappingURL=testing.d.ts.map