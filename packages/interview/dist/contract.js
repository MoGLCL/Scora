/**
 * Layer 09 — the AI interview.
 *
 * The strongest available evidence of ownership is a developer explaining their
 * own work. This layer generates questions **from the session** — from the code
 * that was written, the bug that was fixed, the completion that was accepted —
 * and grades the answers on whether they match what actually happened.
 *
 * Two rules shape everything below.
 *
 * **A question that could be asked of anyone proves nothing.** Generic trivia
 * measures interview practice and English fluency. Every `InterviewQuestion`
 * therefore carries `groundedIn` — the event ids it was built from — and the
 * planner cannot emit a question with an empty grounding. That is why the
 * question bank is derived rather than authored.
 *
 * **A wrong answer is not a dishonest answer.** People forget what they wrote
 * an hour ago, explain badly under pressure, and interview poorly in a second
 * language. The grade that matters for trust is `consistencyWithCode` — does the
 * explanation match the artefact? — and even that is reported with a confidence
 * and a `NOT_ANSWERED` outcome that carries no penalty, exactly as Layer 08
 * treats an unexercised skill.
 *
 * The examiner is a **port**, not an implementation. The model that writes
 * questions and grades answers is configured by the tenant administrator; this
 * package defines the interface it must satisfy and never reaches for a network.
 */
export const QuestionTopic = {
    IMPLEMENTATION_CHOICE: 'implementation_choice',
    LIBRARY_CHOICE: 'library_choice',
    BUG_CAUSE: 'bug_cause',
    REQUIREMENT_CHANGE: 'requirement_change',
    FUNCTION_EXPLANATION: 'function_explanation',
    ALTERNATIVE_APPROACHES: 'alternative_approaches',
    ARCHITECTURE: 'architecture',
    AI_ASSISTED_REGION: 'ai_assisted_region',
};
export const Difficulty = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
    EXPERT: 'expert',
};
export const DIFFICULTY_ORDER = [
    Difficulty.EASY,
    Difficulty.MEDIUM,
    Difficulty.HARD,
    Difficulty.EXPERT,
];
export function difficultyOrdinal(difficulty) {
    return DIFFICULTY_ORDER.indexOf(difficulty);
}
export const AnswerOutcome = {
    /** Explanation matched the artefact. */
    CONSISTENT: 'CONSISTENT',
    /** Broadly right, thin on specifics. Ordinary for work done an hour ago. */
    PARTIAL: 'PARTIAL',
    /** Fluent, plausible, and describes code other than the code they wrote. */
    INCONSISTENT: 'INCONSISTENT',
    /** No answer, or an answer too short to grade. Carries no penalty. */
    NOT_ANSWERED: 'NOT_ANSWERED',
    /** The grader itself was not confident enough to be used. */
    UNGRADED: 'UNGRADED',
};
export const InterviewVerdict = {
    /** Explained their work consistently. The strongest positive signal available. */
    DEMONSTRATES_OWNERSHIP: 'DEMONSTRATES_OWNERSHIP',
    /** Explained some of it. Common, and not adverse. */
    PARTIAL_OWNERSHIP: 'PARTIAL_OWNERSHIP',
    /** Explanations conflicted with the artefact across several questions. */
    EXPLANATION_INCONSISTENT: 'EXPLANATION_INCONSISTENT',
    /** Too few graded answers to say anything. */
    INCONCLUSIVE: 'INCONCLUSIVE',
    /** No interview took place. Distinct from a failed one. */
    NOT_CONDUCTED: 'NOT_CONDUCTED',
};
/**
 * An examiner that grades nothing.
 *
 * The default. A tenant that has configured no provider gets an interview layer
 * that returns `NOT_CONDUCTED` — not an interview that quietly grades on
 * heuristics.
 */
export const NO_EXAMINER = {
    async phrase(question) {
        return question.subject;
    },
    async grade(request) {
        return {
            questionId: request.question.questionId,
            correctness: 0,
            depth: 0,
            specificity: 0,
            consistencyWithCode: 0,
            graderConfidence: 0,
            graderModel: 'none',
            rationale: 'No examiner is configured for this tenant, so no answer was graded.',
        };
    },
};
//# sourceMappingURL=contract.js.map