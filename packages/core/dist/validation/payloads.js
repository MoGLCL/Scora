import { AiAssistanceEventType, CodeEvolutionEventType, EnvironmentEventType, ExternalEventType, HumanReviewEventType, InteractionEventType, InterviewEventType, RuntimeEventType, SkillEventType, SystemEventType, TrustEventType, TypingEventType, } from "../events/types.js";
import { v } from "./schema.js";
/**
 * Payload schema for every event type.
 *
 * Two rules are enforced structurally here rather than by convention:
 *
 *  1. Payloads carry measurements, never raw content. A typing burst records
 *     how many characters were entered, not which ones. Where content is
 *     genuinely needed (a diff, an interview answer), it is marked CONTENT or
 *     PERSONAL in the registry and handled under the matching retention rules.
 *
 *  2. Anything that could identify a person or a private URL is either absent
 *     or pre-hashed by the producer. `v.object` rejects unknown fields, so a
 *     sandbox cannot start smuggling extra data into a payload without the
 *     schema being updated deliberately.
 */
/** Workspace-relative path. Absolute paths would leak the host filesystem. */
const filePath = () => v.string({ minLength: 1, maxLength: 512, pattern: /^[^/\\][^\0]*$/ });
const language = () => v.string({ minLength: 1, maxLength: 40 });
const shortText = () => v.string({ maxLength: 200 });
const opaqueId = () => v.string({ minLength: 1, maxLength: 128 });
/** SHA-256 hex. Producers hash sensitive values before they ever reach us. */
const hashHex = () => v.string({ pattern: /^[0-9a-f]{64}$/ });
const ExecutionOutcome = ['success', 'failure', 'error', 'timeout', 'cancelled'];
const ResourceCategory = [
    'official_documentation',
    'search_engine',
    'stack_overflow',
    'github',
    'ai_tool',
    'blog_or_tutorial',
    'video',
    'package_registry',
    'other_technical',
    'unclassified',
];
const SYSTEM_SCHEMAS = {
    [SystemEventType.EVENT_REJECTED]: v.object({
        rejectedEventId: v.nullable(opaqueId()),
        rejectedType: v.nullable(shortText()),
        reasonCode: shortText(),
        issueCount: v.count(),
    }),
    [SystemEventType.EVENT_SEQUENCE_GAP]: v.object({
        expectedSequence: v.count(),
        receivedSequence: v.count(),
        missingCount: v.count(),
    }),
    [SystemEventType.EVENT_DUPLICATE_DROPPED]: v.object({
        duplicateEventId: opaqueId(),
        originalSequence: v.count(),
    }),
    [SystemEventType.INGESTION_ANOMALY]: v.object({
        anomalyCode: shortText(),
        detail: v.nullable(shortText()),
    }),
    [SystemEventType.CLOCK_SYNC_SAMPLE]: v.object({
        offsetMs: v.number(),
        roundTripMs: v.durationMs(),
        // Drift since the previous sample. A clock that jumps mid-session makes all
        // subsequent timing evidence less reliable.
        driftFromPreviousMs: v.nullable(v.number()),
    }),
    [SystemEventType.CHAIN_BREAK_DETECTED]: v.object({
        violationCode: shortText(),
        atSequence: v.count(),
        violationCount: v.count(),
    }),
};
const ENVIRONMENT_SCHEMAS = {
    [EnvironmentEventType.SESSION_STARTED]: v.object({
        assessmentMode: v.literalUnion(['proctored', 'unproctored', 'practice', 'calibration']),
        consentScopes: v.array(v.literalUnion(['assessment', 'external_monitoring', 'recording']), { maxItems: 8 }),
        // Coarse bucket only; a precise viewport contributes to fingerprinting
        // without contributing anything to trust.
        viewportClass: v.literalUnion(['small', 'medium', 'large', 'unknown']),
        userAgentFamily: shortText(),
        timezoneOffsetMinutes: v.number({ min: -840, max: 840 }),
    }, { optional: [] }),
    [EnvironmentEventType.SESSION_RESUMED]: v.object({
        downtimeMs: v.durationMs(),
        resumeReason: v.literalUnion(['reconnect', 'user_action', 'page_reload', 'unknown']),
    }),
    [EnvironmentEventType.SESSION_PAUSED]: v.object({
        pauseReason: v.literalUnion(['user_action', 'platform', 'inactivity', 'unknown']),
    }),
    [EnvironmentEventType.SESSION_ENDED]: v.object({
        endReason: v.literalUnion(['submitted', 'timeout', 'abandoned', 'terminated', 'error']),
        totalDurationMs: v.durationMs(),
    }),
    [EnvironmentEventType.SESSION_HEARTBEAT]: v.object({
        intervalMs: v.durationMs(),
        // Whether telemetry was buffered offline and flushed later. Buffered
        // evidence has weaker timing guarantees.
        bufferedEventCount: v.count(),
    }),
    [EnvironmentEventType.SANDBOX_CONNECTED]: v.object({
        transport: v.literalUnion(['websocket', 'sse', 'http_poll']),
        reconnectAttempt: v.count(),
    }),
    [EnvironmentEventType.SANDBOX_DISCONNECTED]: v.object({
        reason: v.literalUnion(['network', 'server', 'client', 'unknown']),
        lastAcknowledgedSequence: v.count(),
    }),
    [EnvironmentEventType.SANDBOX_RECONNECTED]: v.object({
        outageMs: v.durationMs(),
        eventsReplayed: v.count(),
    }),
    [EnvironmentEventType.WINDOW_FOCUS_GAINED]: v.object({
        awayMs: v.durationMs(),
    }),
    [EnvironmentEventType.WINDOW_FOCUS_LOST]: v.object({
        // The engine records that focus left, never where it went. Tracking the
        // destination window would be surveillance beyond the assessment's purpose.
        focusedDurationMs: v.durationMs(),
    }),
    [EnvironmentEventType.TAB_VISIBLE]: v.object({
        hiddenMs: v.durationMs(),
    }),
    [EnvironmentEventType.TAB_HIDDEN]: v.object({
        visibleMs: v.durationMs(),
    }),
    [EnvironmentEventType.ENVIRONMENT_INTERRUPTION]: v.object({
        kind: v.literalUnion(['crash', 'reload', 'navigation', 'power', 'resource_exhaustion', 'unknown']),
        recoveredMs: v.nullable(v.durationMs()),
        evidenceGapMs: v.durationMs(),
    }),
    [EnvironmentEventType.NETWORK_QUALITY_CHANGED]: v.object({
        quality: v.literalUnion(['good', 'degraded', 'poor', 'offline']),
        latencyMs: v.nullable(v.durationMs()),
    }),
    [EnvironmentEventType.DEVICE_CONTEXT_CHANGED]: v.object({
        changedFields: v.array(v.literalUnion(['user_agent', 'viewport_class', 'timezone', 'platform', 'screen_count']), { maxItems: 8 }),
        // Pre-hashed by the producer so the engine can detect change without ever
        // holding a device fingerprint.
        previousContextHash: hashHex(),
        currentContextHash: hashHex(),
    }),
    [EnvironmentEventType.RUNTIME_INTEGRITY_VIOLATION]: v.object({
        violationKind: v.literalUnion([
            'instrumentation_patched',
            'reporter_disabled',
            'devtools_hook_detected',
            'clock_manipulated',
            'unexpected_origin',
        ]),
        detectorConfidence: v.unitInterval(),
    }),
};
const INTERACTION_SCHEMAS = {
    [InteractionEventType.FILE_OPENED]: v.object({
        path: filePath(),
        language: language(),
        lineCount: v.count(),
    }),
    [InteractionEventType.FILE_CLOSED]: v.object({
        path: filePath(),
        openDurationMs: v.durationMs(),
    }),
    [InteractionEventType.FILE_CREATED]: v.object({
        path: filePath(),
        language: language(),
        createdFrom: v.literalUnion(['blank', 'template', 'copy', 'unknown']),
    }),
    [InteractionEventType.FILE_DELETED]: v.object({
        path: filePath(),
        lineCount: v.count(),
    }),
    [InteractionEventType.FILE_RENAMED]: v.object({
        fromPath: filePath(),
        toPath: filePath(),
    }),
    [InteractionEventType.CURSOR_ACTIVITY_SAMPLE]: v.object({
        path: filePath(),
        windowMs: v.durationMs(),
        movementCount: v.count(),
        distinctLinesVisited: v.count(),
    }),
    [InteractionEventType.TEXT_SELECTED]: v.object({
        path: filePath(),
        selectedCharacters: v.count(),
        selectedLines: v.count(),
        heldMs: v.durationMs(),
    }),
    [InteractionEventType.EDITOR_SCROLLED]: v.object({
        path: filePath(),
        linesTraversed: v.count(),
        direction: v.literalUnion(['up', 'down', 'both']),
    }),
    [InteractionEventType.SEARCH_PERFORMED]: v.object({
        scope: v.literalUnion(['file', 'workspace', 'symbol']),
        queryLength: v.count(),
        // The query itself is hashed: recurrence matters, wording does not.
        queryHash: hashHex(),
        resultCount: v.count(),
    }),
    [InteractionEventType.NAVIGATION_JUMP]: v.object({
        kind: v.literalUnion(['definition', 'reference', 'symbol', 'file', 'error_location']),
        fromPath: v.nullable(filePath()),
        toPath: filePath(),
    }),
    [InteractionEventType.PANEL_SWITCHED]: v.object({
        from: v.literalUnion(['editor', 'terminal', 'tests', 'preview', 'problems', 'assistant', 'other']),
        to: v.literalUnion(['editor', 'terminal', 'tests', 'preview', 'problems', 'assistant', 'other']),
    }),
    [InteractionEventType.TERMINAL_OPENED]: v.object({
        shell: shortText(),
    }),
    [InteractionEventType.TERMINAL_COMMAND_ENTERED]: v.object({
        // The leading verb is retained because it is behaviourally meaningful
        // (npm test vs. git log); arguments may contain secrets and are hashed.
        commandVerb: v.string({ minLength: 1, maxLength: 64 }),
        argumentsHash: hashHex(),
        argumentCount: v.count(),
    }),
    [InteractionEventType.IDLE_PERIOD_DETECTED]: v.object({
        idleMs: v.durationMs(),
        precededBy: v.literalUnion(['typing', 'error', 'test_run', 'navigation', 'session_start', 'unknown']),
    }),
};
const TYPING_SCHEMAS = {
    [TypingEventType.TYPING_BURST]: v.object({
        path: filePath(),
        durationMs: v.durationMs(),
        charactersTyped: v.count(),
        keystrokeCount: v.count(),
        // Inter-keystroke interval variance. Human typing is irregular; a perfectly
        // even cadence suggests synthetic input. Never decisive on its own.
        intervalVarianceMs: v.number({ min: 0 }),
        meanIntervalMs: v.number({ min: 0 }),
    }),
    [TypingEventType.TYPING_PAUSE]: v.object({
        path: v.nullable(filePath()),
        pauseMs: v.durationMs(),
    }),
    [TypingEventType.TEXT_INSERTED]: v.object({
        path: filePath(),
        charactersAdded: v.count(),
        linesAdded: v.count(),
        atLine: v.count(),
    }),
    [TypingEventType.TEXT_DELETED]: v.object({
        path: filePath(),
        charactersRemoved: v.count(),
        linesRemoved: v.count(),
        atLine: v.count(),
    }),
    [TypingEventType.BACKSPACE_BURST]: v.object({
        path: filePath(),
        backspaceCount: v.count(),
        durationMs: v.durationMs(),
    }),
    [TypingEventType.CODE_PASTE]: v.object({
        path: filePath(),
        charactersAdded: v.count(),
        linesAdded: v.count(),
        language: language(),
        // Where the clipboard content came from, when the sandbox can tell.
        // 'internal' means it was copied from within the workspace, which is
        // ordinary refactoring rather than importation.
        origin: v.literalUnion(['internal', 'external', 'ai_panel', 'unknown']),
        contentHash: hashHex(),
    }),
    [TypingEventType.LARGE_INSERTION]: v.object({
        path: filePath(),
        charactersAdded: v.count(),
        linesAdded: v.count(),
        language: language(),
        insertionMethod: v.literalUnion(['paste', 'completion_accept', 'file_import', 'unknown']),
        // Multiple of this developer's own median insertion size. Absolute
        // thresholds are meaningless across skill levels and languages.
        baselineMultiple: v.nullable(v.number({ min: 0 })),
        contentHash: hashHex(),
    }),
    [TypingEventType.UNDO_PERFORMED]: v.object({
        path: filePath(),
        charactersReverted: v.count(),
    }),
    [TypingEventType.REDO_PERFORMED]: v.object({
        path: filePath(),
        charactersRestored: v.count(),
    }),
    [TypingEventType.REWRITE_DETECTED]: v.object({
        path: filePath(),
        regionLines: v.count(),
        replacedCharacters: v.count(),
        insertedCharacters: v.count(),
        similarityToPrevious: v.unitInterval(),
    }),
};
const CODE_EVOLUTION_SCHEMAS = {
    [CodeEvolutionEventType.CODE_SNAPSHOT]: v.object({
        snapshotId: opaqueId(),
        fileCount: v.count(),
        totalLines: v.count(),
        totalCharacters: v.count(),
        // Content addressing: the snapshot body lives in blob storage under this
        // digest, keeping the event log small and the payload verifiable.
        contentDigest: hashHex(),
        reason: v.literalUnion(['interval', 'save', 'run', 'submit', 'milestone']),
    }),
    [CodeEvolutionEventType.CODE_DIFF_APPLIED]: v.object({
        path: filePath(),
        fromDigest: v.nullable(hashHex()),
        toDigest: hashHex(),
        linesAdded: v.count(),
        linesRemoved: v.count(),
        hunkCount: v.count(),
        // How concentrated the change was. One large hunk and twenty small ones
        // represent very different working styles.
        largestHunkLines: v.count(),
    }),
    [CodeEvolutionEventType.FILE_SAVED]: v.object({
        path: filePath(),
        sizeBytes: v.count(),
        dirtyDurationMs: v.durationMs(),
    }),
    [CodeEvolutionEventType.REFACTOR_DETECTED]: v.object({
        path: filePath(),
        kind: v.literalUnion([
            'extract_function',
            'inline',
            'rename_symbol',
            'move_code',
            'signature_change',
            'restructure',
        ]),
        affectedLines: v.count(),
        // Refactoring preserves behaviour while changing structure, which requires
        // understanding what the code does.
        behaviourPreserved: v.nullable(v.boolean()),
    }),
    [CodeEvolutionEventType.DEPENDENCY_ADDED]: v.object({
        ecosystem: v.literalUnion(['npm', 'pypi', 'maven', 'cargo', 'go', 'nuget', 'other']),
        packageName: v.string({ minLength: 1, maxLength: 214 }),
        versionSpec: v.nullable(shortText()),
    }),
    [CodeEvolutionEventType.DEPENDENCY_REMOVED]: v.object({
        ecosystem: v.literalUnion(['npm', 'pypi', 'maven', 'cargo', 'go', 'nuget', 'other']),
        packageName: v.string({ minLength: 1, maxLength: 214 }),
    }),
};
const RUNTIME_SCHEMAS = {
    [RuntimeEventType.CODE_EXECUTION_STARTED]: v.object({
        executionId: opaqueId(),
        trigger: v.literalUnion(['manual', 'watch', 'test', 'debug']),
        entryPoint: v.nullable(filePath()),
    }),
    [RuntimeEventType.CODE_EXECUTION_FINISHED]: v.object({
        executionId: opaqueId(),
        outcome: v.literalUnion(ExecutionOutcome),
        durationMs: v.durationMs(),
        exitCode: v.nullable(v.number({ integer: true })),
    }),
    [RuntimeEventType.BUILD_STARTED]: v.object({
        buildId: opaqueId(),
    }),
    [RuntimeEventType.BUILD_FINISHED]: v.object({
        buildId: opaqueId(),
        outcome: v.literalUnion(ExecutionOutcome),
        durationMs: v.durationMs(),
        errorCount: v.count(),
        warningCount: v.count(),
    }),
    [RuntimeEventType.TEST_RUN_STARTED]: v.object({
        runId: opaqueId(),
        scope: v.literalUnion(['all', 'file', 'single', 'watch']),
        // Whether the developer wrote these tests or they shipped with the task.
        // Authoring tests is much stronger evidence than running provided ones.
        suiteOrigin: v.literalUnion(['provided', 'authored', 'mixed', 'unknown']),
    }),
    [RuntimeEventType.TEST_RUN_FINISHED]: v.object({
        runId: opaqueId(),
        outcome: v.literalUnion(ExecutionOutcome),
        durationMs: v.durationMs(),
        passed: v.count(),
        failed: v.count(),
        skipped: v.count(),
    }),
    [RuntimeEventType.RUNTIME_ERROR_OBSERVED]: v.object({
        errorId: opaqueId(),
        // Class only, never the message: messages routinely contain user data,
        // file contents and occasionally credentials.
        errorClass: v.string({ minLength: 1, maxLength: 120 }),
        path: v.nullable(filePath()),
        line: v.nullable(v.count()),
        // Groups repeats of the same underlying failure across attempts.
        signatureHash: hashHex(),
        isRepeat: v.boolean(),
    }),
    [RuntimeEventType.DEBUG_SESSION_STARTED]: v.object({
        debugId: opaqueId(),
        targetPath: v.nullable(filePath()),
    }),
    [RuntimeEventType.DEBUG_SESSION_ENDED]: v.object({
        debugId: opaqueId(),
        durationMs: v.durationMs(),
        breakpointsHit: v.count(),
        steps: v.count(),
    }),
    [RuntimeEventType.BREAKPOINT_SET]: v.object({
        path: filePath(),
        line: v.count(),
        // Whether the breakpoint sits near the actual fault. Precise placement is
        // evidence of a correct mental model of the failure.
        proximityToErrorLines: v.nullable(v.count()),
    }),
    [RuntimeEventType.BREAKPOINT_HIT]: v.object({
        path: filePath(),
        line: v.count(),
        hitCount: v.count(),
    }),
    [RuntimeEventType.FIX_ATTEMPTED]: v.object({
        errorSignatureHash: hashHex(),
        attemptNumber: v.count(),
        path: filePath(),
        charactersChanged: v.count(),
        // Time between seeing the failure and acting on it. Near-zero latency on a
        // complex error suggests the answer came from elsewhere; that is a question
        // for the interview, not a verdict.
        timeSinceErrorMs: v.durationMs(),
    }),
    [RuntimeEventType.ERROR_RESOLVED]: v.object({
        errorSignatureHash: hashHex(),
        attemptsRequired: v.count(),
        timeToResolveMs: v.durationMs(),
        verifiedBy: v.literalUnion(['test_pass', 'clean_run', 'manual_check', 'unknown']),
    }),
    [RuntimeEventType.REGRESSION_DETECTED]: v.object({
        previouslyPassingHash: hashHex(),
        detectedBy: v.literalUnion(['test_failure', 'runtime_error', 'build_failure']),
    }),
};
const EXTERNAL_SCHEMAS = {
    [ExternalEventType.EXTERNAL_RESOURCE_ACCESSED]: v.object({
        category: v.literalUnion(ResourceCategory),
        // Registrable domain only, and only for categories the tenant has
        // configured as recordable. Full URLs are never stored: the path of a
        // documentation page reveals what someone did not know, which is not
        // information this system needs.
        domain: v.nullable(v.string({ maxLength: 253 })),
        visitId: opaqueId(),
    }),
    [ExternalEventType.EXTERNAL_RESOURCE_DWELL]: v.object({
        visitId: opaqueId(),
        category: v.literalUnion(ResourceCategory),
        dwellMs: v.durationMs(),
        // Returning repeatedly to one resource indicates study rather than copying.
        returnVisitNumber: v.count(),
    }),
    [ExternalEventType.EXTERNAL_RESOURCE_LEFT]: v.object({
        visitId: opaqueId(),
        totalDwellMs: v.durationMs(),
    }),
    [ExternalEventType.EXTERNAL_ORIGIN_IMPORT]: v.object({
        visitId: v.nullable(opaqueId()),
        category: v.literalUnion(ResourceCategory),
        path: filePath(),
        charactersAdded: v.count(),
        msSinceResourceLeft: v.durationMs(),
        // Did the developer adapt what they found, or transplant it unchanged?
        // This distinction, not the visit itself, is what carries meaning.
        adaptationRatio: v.nullable(v.unitInterval()),
    }),
};
/**
 * Layer 07 payloads describe *editor-level* assistance: completion lists and
 * inline ghost-text, as in VS Code with IntelliSense. There is no prompt field
 * anywhere in this layer because the sandbox exposes no conversational
 * assistant — a developer cannot ask it to solve the task.
 */
const AI_SCHEMAS = {
    [AiAssistanceEventType.AI_SUGGESTION_SHOWN]: v.object({
        suggestionId: opaqueId(),
        path: filePath(),
        kind: v.literalUnion(['member_completion', 'identifier', 'snippet', 'import', 'signature_help']),
        // How many candidates were offered. Choosing among several requires more
        // judgement than accepting a single obvious one.
        candidateCount: v.count(),
        charactersOffered: v.count(),
        linesOffered: v.count(),
        // The token the developer had already typed. A completion after `db.` is
        // ordinary editor behaviour; one appearing on an empty line is not.
        triggerKind: v.literalUnion(['member_access', 'identifier_prefix', 'explicit', 'automatic']),
    }),
    [AiAssistanceEventType.AI_SUGGESTION_ACCEPTED]: v.object({
        suggestionId: opaqueId(),
        path: filePath(),
        charactersAccepted: v.count(),
        linesAccepted: v.count(),
        // Rank of the chosen candidate in the list. Scrolling past the first option
        // to pick a later one indicates the developer evaluated them.
        candidateIndex: v.count(),
        // Time between the suggestion appearing and being accepted. Accepting many
        // lines within a few milliseconds means it was not read.
        deliberationMs: v.durationMs(),
    }),
    [AiAssistanceEventType.AI_SUGGESTION_REJECTED]: v.object({
        suggestionId: opaqueId(),
        deliberationMs: v.durationMs(),
        reason: v.literalUnion(['dismissed', 'typed_through', 'replaced_with_own', 'escaped']),
    }),
    [AiAssistanceEventType.AI_SUGGESTION_PARTIALLY_ACCEPTED]: v.object({
        suggestionId: opaqueId(),
        path: filePath(),
        charactersOffered: v.count(),
        charactersAccepted: v.count(),
        // Share of the offered completion actually taken.
        acceptedRatio: v.unitInterval(),
        deliberationMs: v.durationMs(),
    }),
    [AiAssistanceEventType.AI_SUGGESTION_MODIFIED]: v.object({
        suggestionId: opaqueId(),
        path: filePath(),
        charactersChanged: v.count(),
        linesChanged: v.count(),
        // Share of the accepted suggestion the developer subsequently altered.
        // The central quantity separating assisted from dependent use.
        modificationRatio: v.unitInterval(),
        msAfterAcceptance: v.durationMs(),
    }),
    [AiAssistanceEventType.AI_SUGGESTION_DELETED]: v.object({
        suggestionId: opaqueId(),
        path: filePath(),
        charactersRemoved: v.count(),
        msAfterAcceptance: v.durationMs(),
        // Whether the whole accepted region went, or only part of it.
        fullyRemoved: v.boolean(),
    }),
    [AiAssistanceEventType.AI_SUGGESTION_TESTED]: v.object({
        suggestionId: opaqueId(),
        verificationKind: v.literalUnion(['test_run', 'execution', 'debug', 'manual_review']),
        msAfterAcceptance: v.durationMs(),
        outcome: v.literalUnion(ExecutionOutcome),
    }),
    [AiAssistanceEventType.INLINE_COMPLETION_SHOWN]: v.object({
        completionId: opaqueId(),
        path: filePath(),
        charactersOffered: v.count(),
        linesOffered: v.count(),
        // Characters of surrounding code the completion was conditioned on.
        contextLines: v.count(),
    }),
    [AiAssistanceEventType.INLINE_COMPLETION_ACCEPTED]: v.object({
        completionId: opaqueId(),
        path: filePath(),
        charactersAccepted: v.count(),
        linesAccepted: v.count(),
        deliberationMs: v.durationMs(),
        // Tab-accepting one token at a time is more deliberate than taking the
        // whole block at once.
        acceptanceGranularity: v.literalUnion(['word', 'line', 'full']),
    }),
    [AiAssistanceEventType.INLINE_COMPLETION_REJECTED]: v.object({
        completionId: opaqueId(),
        displayedMs: v.durationMs(),
        reason: v.literalUnion(['typed_through', 'dismissed', 'cursor_moved', 'timeout']),
    }),
};
const SKILL_SCHEMAS = {
    [SkillEventType.SKILL_CLAIMED]: v.object({
        skillId: opaqueId(),
        skillName: v.string({ minLength: 1, maxLength: 80 }),
        claimedLevel: v.literalUnion(['beginner', 'intermediate', 'advanced', 'expert']),
        claimedYears: v.nullable(v.number({ min: 0, max: 60 })),
    }),
    [SkillEventType.ASSESSMENT_STARTED]: v.object({
        assessmentId: opaqueId(),
        taskCount: v.count(),
        timeLimitMs: v.nullable(v.durationMs()),
    }),
    [SkillEventType.TASK_STARTED]: v.object({
        taskId: opaqueId(),
        difficulty: v.literalUnion(['easy', 'medium', 'hard', 'expert']),
        targetSkills: v.array(opaqueId(), { maxItems: 20 }),
        language: language(),
    }),
    [SkillEventType.TASK_SUBMITTED]: v.object({
        taskId: opaqueId(),
        durationMs: v.durationMs(),
        finalDigest: hashHex(),
        testsPassing: v.nullable(v.count()),
        testsTotal: v.nullable(v.count()),
    }),
    [SkillEventType.ASSESSMENT_SUBMITTED]: v.object({
        assessmentId: opaqueId(),
        tasksCompleted: v.count(),
        tasksTotal: v.count(),
        totalDurationMs: v.durationMs(),
    }),
    [SkillEventType.VERIFICATION_CHALLENGE_ISSUED]: v.object({
        challengeId: opaqueId(),
        skillId: opaqueId(),
        // Challenges are generated from what the developer actually wrote, so they
        // cannot be prepared for in advance.
        derivedFrom: v.literalUnion(['submitted_code', 'ai_assisted_region', 'error_resolution', 'claimed_skill']),
        difficulty: v.literalUnion(['easy', 'medium', 'hard', 'expert']),
    }),
    [SkillEventType.VERIFICATION_CHALLENGE_RESULT]: v.object({
        challengeId: opaqueId(),
        skillId: opaqueId(),
        passed: v.boolean(),
        score: v.unitInterval(),
        durationMs: v.durationMs(),
        usedAssistance: v.boolean(),
    }),
};
const INTERVIEW_SCHEMAS = {
    [InterviewEventType.INTERVIEW_STARTED]: v.object({
        interviewId: opaqueId(),
        modality: v.literalUnion(['voice', 'text', 'video']),
        plannedQuestionCount: v.count(),
        consentConfirmed: v.boolean(),
    }),
    [InterviewEventType.INTERVIEW_QUESTION_ASKED]: v.object({
        interviewId: opaqueId(),
        questionId: opaqueId(),
        // Every question must be traceable to something in the session, which is
        // what stops the interview from becoming generic trivia.
        groundedInEventIds: v.array(opaqueId(), { maxItems: 20 }),
        topic: v.literalUnion([
            'implementation_choice',
            'library_choice',
            'bug_cause',
            'requirement_change',
            'function_explanation',
            'alternative_approaches',
            'architecture',
            'ai_assisted_region',
        ]),
        difficulty: v.literalUnion(['easy', 'medium', 'hard', 'expert']),
        questionHash: hashHex(),
    }),
    [InterviewEventType.INTERVIEW_ANSWER_RECEIVED]: v.object({
        interviewId: opaqueId(),
        questionId: opaqueId(),
        responseMs: v.durationMs(),
        wordCount: v.count(),
        transcriptRef: v.nullable(opaqueId()),
        recordingRef: v.nullable(opaqueId()),
    }),
    [InterviewEventType.INTERVIEW_ANSWER_SCORED]: v.object({
        interviewId: opaqueId(),
        questionId: opaqueId(),
        correctness: v.unitInterval(),
        depth: v.unitInterval(),
        specificity: v.unitInterval(),
        // Did the explanation match the code they actually wrote? A fluent but
        // generic answer scores well on depth and poorly here.
        consistencyWithCode: v.unitInterval(),
        graderModel: shortText(),
        graderConfidence: v.unitInterval(),
    }),
    [InterviewEventType.INTERVIEW_DIFFICULTY_ADJUSTED]: v.object({
        interviewId: opaqueId(),
        from: v.literalUnion(['easy', 'medium', 'hard', 'expert']),
        to: v.literalUnion(['easy', 'medium', 'hard', 'expert']),
        reason: v.literalUnion(['strong_understanding', 'uncertainty_detected', 'inconsistency', 'time']),
    }),
    [InterviewEventType.INTERVIEW_ENDED]: v.object({
        interviewId: opaqueId(),
        questionsAsked: v.count(),
        durationMs: v.durationMs(),
        endReason: v.literalUnion(['completed', 'time_limit', 'abandoned', 'error']),
    }),
    [InterviewEventType.INTERVIEW_RECORDING_STORED]: v.object({
        interviewId: opaqueId(),
        recordingId: opaqueId(),
        durationMs: v.durationMs(),
        sizeBytes: v.count(),
        encryptionKeyId: opaqueId(),
        retentionDays: v.count(),
    }),
};
const HUMAN_REVIEW_SCHEMAS = {
    [HumanReviewEventType.REVIEW_ASSIGNED]: v.object({
        reviewId: opaqueId(),
        reviewerId: opaqueId(),
        assignedBy: opaqueId(),
        priority: v.literalUnion(['low', 'normal', 'high', 'urgent']),
    }),
    [HumanReviewEventType.REVIEW_OPENED]: v.object({
        reviewId: opaqueId(),
        reviewerId: opaqueId(),
    }),
    [HumanReviewEventType.REVIEW_EVIDENCE_ACCESSED]: v.object({
        reviewId: opaqueId(),
        reviewerId: opaqueId(),
        evidenceKind: v.literalUnion([
            'final_code',
            'code_evolution',
            'behavioral_timeline',
            'runtime_history',
            'external_activity',
            'ai_assistance',
            'skill_confidence',
            'interview_transcript',
            'interview_recording',
            'ai_analysis',
        ]),
        // Access to a developer's recording is itself a privacy event and is
        // recorded so the developer can be shown who viewed what.
        viewDurationMs: v.nullable(v.durationMs()),
    }),
    [HumanReviewEventType.REVIEW_DECISION_RECORDED]: v.object({
        reviewId: opaqueId(),
        reviewerId: opaqueId(),
        decision: v.literalUnion(['APPROVE', 'REJECT', 'REQUEST_REVIEW']),
        rationaleLength: v.count(),
        rationaleHash: hashHex(),
        reviewDurationMs: v.durationMs(),
    }),
    [HumanReviewEventType.RECOMMENDATION_OVERRIDDEN]: v.object({
        reviewId: opaqueId(),
        reviewerId: opaqueId(),
        engineRecommendation: v.literalUnion(['APPROVE', 'REJECT', 'REQUEST_REVIEW']),
        humanDecision: v.literalUnion(['APPROVE', 'REJECT', 'REQUEST_REVIEW']),
        engineTrustScore: v.number({ min: 0, max: 100 }),
        rationaleHash: hashHex(),
    }),
    [HumanReviewEventType.RESULT_RELEASED]: v.object({
        reviewId: opaqueId(),
        releasedBy: opaqueId(),
        channel: v.literalUnion(['dashboard', 'email', 'api', 'webhook']),
        scheduledFor: v.nullable(v.number()),
    }),
};
export const PAYLOAD_SCHEMAS = {
    ...SYSTEM_SCHEMAS,
    ...ENVIRONMENT_SCHEMAS,
    ...INTERACTION_SCHEMAS,
    ...TYPING_SCHEMAS,
    ...CODE_EVOLUTION_SCHEMAS,
    ...RUNTIME_SCHEMAS,
    ...EXTERNAL_SCHEMAS,
    ...AI_SCHEMAS,
    ...SKILL_SCHEMAS,
    ...INTERVIEW_SCHEMAS,
    ...HUMAN_REVIEW_SCHEMAS,
};
export function payloadSchemaFor(type) {
    const schema = PAYLOAD_SCHEMAS[type];
    if (schema === undefined) {
        throw new Error(`No payload schema registered for event type: ${type}`);
    }
    return schema;
}
/** Event types with no registered schema. Should always be empty; asserted in tests. */
export function eventTypesMissingSchemas() {
    return Object.values(TrustEventType).filter((type) => PAYLOAD_SCHEMAS[type] === undefined);
}
//# sourceMappingURL=payloads.js.map