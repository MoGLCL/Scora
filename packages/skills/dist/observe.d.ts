import { type TrustEvent } from '@scora/trust-core';
import { type SkillClaim, type SkillObservation } from './contract.ts';
/**
 * Turning a session's events into observations about specific claimed skills.
 *
 * The hard problem here is attribution: knowing that a developer resolved four
 * runtime errors tells you nothing about their claimed PostgreSQL skill unless
 * you can tie the work to the skill. This module only ever attributes through
 * links the *producer* stated — `targetSkills` on a task, `skillId` on a
 * challenge — and never by guessing from a language name or a file extension.
 *
 * That is a deliberate choice to under-attribute. Inferring "they edited
 * `queries.sql`, so this is their SQL skill" would generate confident-looking
 * observations from filename coincidence, and those observations would end up in
 * a verdict about a person's competence. When the link is absent, the honest
 * output is `NOT_EXERCISED` and a suggestion to design a task that tests it.
 */
/** Reads the claimed-skill inventory out of the session's own evidence. */
export declare function collectClaims(events: readonly TrustEvent[]): readonly SkillClaim[];
/**
 * Groups observations by the skill they bear on.
 *
 * Only the two direct links are followed:
 *
 *   - `VERIFICATION_CHALLENGE_RESULT.skillId` — a challenge designed for one skill.
 *   - `TASK_STARTED.targetSkills` — the skills a task was written to exercise,
 *     which lets work inside that task's window be attributed to them.
 *
 * Work outside any declared task window is not attributed to anything. It still
 * counts for other layers; it just cannot be read as evidence about a *named*
 * skill, because nothing says which skill it belongs to.
 */
export declare function observeSkills(events: readonly TrustEvent[], claims: readonly SkillClaim[]): ReadonlyMap<string, readonly SkillObservation[]>;
interface TaskWindow {
    readonly taskId: string;
    readonly targetSkills: readonly string[];
    readonly difficulty: string;
    readonly startedAt: number;
    readonly endedAt: number | null;
}
/**
 * The chain-position span of each declared task.
 *
 * Windows are bounded by `chainPosition` rather than by timestamps: the engine
 * assigns it, so it cannot be skewed by a client clock, and a task window is
 * exactly the thing an attacker would want to stretch to have their good work
 * counted twice.
 */
export declare function taskWindows(events: readonly TrustEvent[]): readonly TaskWindow[];
export {};
//# sourceMappingURL=observe.d.ts.map